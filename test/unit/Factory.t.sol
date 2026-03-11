// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LottoFactory} from "../../src/Lotto/Factory.sol";
import {LottoImplementationMock} from "../mock/ImplementationMock.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

contract LottoFactoryUnitTest is Test {
    LottoFactory factory;
    VRFCoordinatorV2_5Mock vrfCoordinator;
    LottoImplementationMock impl;

    address player1 = makeAddr("player1");

    function setUp() public {
        impl = new LottoImplementationMock();
        vrfCoordinator = new VRFCoordinatorV2_5Mock(0.1 ether, 1e9, 1e18);
        uint256 subId = vrfCoordinator.createSubscription();
        vrfCoordinator.fundSubscription(subId, 10 ether);

        factory = new LottoFactory(
            address(impl),
            address(vrfCoordinator),
            subId,
            0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c, // arbitrary keyhash
            500000 // callback gas limit
        );
        vrfCoordinator.addConsumer(subId, address(factory));
    }

    // --- createLotto function tests ---

    function test_createLotto_Success() external {
        address lottoAddress = factory.createLotto(0.1 ether, 3);
        assertTrue(lottoAddress != address(0));
        assertTrue(factory.isLottoInstance(lottoAddress));
        assertTrue(LottoImplementationMock(lottoAddress).initialized());
    }

    function test_createLotto_UpdatesAllLottosArray() external {
        address lottoAddress1 = factory.createLotto(0.1 ether, 3);
        address lottoAddress2 = factory.createLotto(0.2 ether, 5);

        assertEq(factory.allLottos(0), lottoAddress1);
        assertEq(factory.allLottos(1), lottoAddress2);
    }

    function test_createLotto_EmitsEvent() external {
        vm.expectEmit(false, true, false, false);
        emit LottoFactory.LottoCreated(address(0), player1); // We will check lottoAddress and creator in the event

        vm.prank(player1);
        factory.createLotto(0.1 ether, 3);
    }

    // --- requestWinnerRandomness function tests ---

    function test_requestWinnerRandomness_ByLottoInstance() external {
        address lottoAddress = factory.createLotto(0.1 ether, 3);

        vm.prank(lottoAddress);
        uint256 requestId = factory.requestWinnerRandomness();

        assertEq(factory.s_requestIdToLotto(requestId), lottoAddress);
    }

    function test_requestWinnerRandomness_ByNonLottoInstance() external {
        vm.prank(player1);
        vm.expectRevert(LottoFactory.LottoFactory__OnlyLottoInstanceCanRequest.selector);
        factory.requestWinnerRandomness();
    }

    // --- fulfillRandomWords function tests ---

    function test_fulfillRandomWords_Sucess() external {
        address lottoAddress = factory.createLotto(0.1 ether, 3);

        vm.prank(lottoAddress);
        uint256 requestId = factory.requestWinnerRandomness();

        // Simulate VRF callback
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 123; // arbitrary randomness
        vrfCoordinator.fulfillRandomWords(requestId, address(factory));

        assertTrue(LottoImplementationMock(lottoAddress).winnerFinalized());
    }

    function test_fulfillRandomWords_CorrectMapping() external {
        address lottoAddress1 = factory.createLotto(0.1 ether, 3);
        address lottoAddress2 = factory.createLotto(0.2 ether, 5);

        vm.prank(lottoAddress1);
        uint256 requestId1 = factory.requestWinnerRandomness();

        vm.prank(lottoAddress2);
        uint256 requestId2 = factory.requestWinnerRandomness();

        // Simulate VRF callback for lottoAddress1
        vrfCoordinator.fulfillRandomWords(requestId1, address(factory));
        assertTrue(LottoImplementationMock(lottoAddress1).winnerFinalized());
        assertFalse(LottoImplementationMock(lottoAddress2).winnerFinalized());

        // Simulate VRF callback for lottoAddress2
        vrfCoordinator.fulfillRandomWords(requestId2, address(factory));
        assertTrue(LottoImplementationMock(lottoAddress2).winnerFinalized());
    }

    function test_fulfillRandomWords_RequestNotFound() external {
        uint256 fakeRequestId = 999;
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 123;

        vm.prank(address(vrfCoordinator));
        vm.expectRevert(LottoFactory.LottoFactory__RequestNotFound.selector);
        factory.rawFulfillRandomWords(fakeRequestId, randomWords);
    }

    // --- getter functions tests ---

    function test_getAllLottos() external {
        address lottoAddress1 = factory.createLotto(0.1 ether, 3);
        address lottoAddress2 = factory.createLotto(0.2 ether, 5);

        address[] memory allLottos = factory.getAllLottos();
        assertEq(allLottos.length, 2);
        assertEq(allLottos[0], lottoAddress1);
        assertEq(allLottos[1], lottoAddress2);
    }

    function test_getLengthOfAllLottos() external {
        factory.createLotto(0.1 ether, 3);
        factory.createLotto(0.2 ether, 5);

        uint256 length = factory.getLengthOfAllLottos();
        assertEq(length, 2);
    }
}
