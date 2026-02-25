// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LottoFactory} from "../../src/Lotto/Factory.sol";
import {LottoImplementation} from "../../src/Lotto/Implementation.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

contract FactoryTest is Test {
    LottoImplementation impl;
    LottoFactory factory;
    VRFCoordinatorV2_5Mock vrfCoordinator;

    address user1 = makeAddr("user1");
    address user2 = makeAddr("user2");
    address user3 = makeAddr("user3");

    function setUp() public {
        vrfCoordinator = new VRFCoordinatorV2_5Mock(0.1 ether, 1e9, 1e18);
        uint256 subId = vrfCoordinator.createSubscription();
        vrfCoordinator.fundSubscription(subId, 10 ether);

        impl = new LottoImplementation();
        factory = new LottoFactory(
            address(impl),
            address(vrfCoordinator),
            subId,
            0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c, // arbitrary keyhash
            500000 // callback gas limit
        );
        vrfCoordinator.addConsumer(subId, address(factory));
    }

    function testFactoryRegistry() external {
        address cloneAddr = factory.createLotto(0.01 ether, 5);
        bool isLotto = factory.isLottoInstance(cloneAddr);
        assertTrue(isLotto);
    }

    function testCannotRequestByNoneLottoInstance() external {
        vm.prank(user1);
        vm.expectRevert(LottoFactory.LottoFactory__OnlyLottoInstanceCanRequest.selector);
        factory.requestWinnerRandomness();
    }

    function testRequestWinnerRecordsCorrectMapping() public {
        address cloneAddr = factory.createLotto(0.01 ether, 5);

        vm.prank(cloneAddr);
        uint256 requestId = factory.requestWinnerRandomness();

        assertEq(factory.s_requestIdToLotto(requestId), cloneAddr);
    }

    function testCreateLottoUpdatesAllLottosArray() public {
        address clone1 = factory.createLotto(0.01 ether, 5);
        address clone2 = factory.createLotto(0.02 ether, 10);

        assertEq(factory.allLottos(0), clone1);
        assertEq(factory.allLottos(1), clone2);
        assertEq(factory.getLengthOfAllLottos(), 2);
    }

    function testFulfillRandomWordsRoutesToCorrectLotto() public {
        address cloneAddr = factory.createLotto(0.01 ether, 2);
        LottoImplementation clone = LottoImplementation(cloneAddr);

        vm.deal(user1, 1 ether);
        vm.prank(user1);
        clone.joinLotto{value: 0.01 ether}();

        vm.deal(user2, 1 ether);
        vm.prank(user2);
        clone.joinLotto{value: 0.01 ether}();

        vm.prank(cloneAddr);
        uint256 requestId = factory.requestWinnerRandomness();

        vrfCoordinator.fulfillRandomWords(requestId, address(factory));

        assertEq(uint256(LottoImplementation(cloneAddr).lottoState()), 2); // CLOSED
    }
}
