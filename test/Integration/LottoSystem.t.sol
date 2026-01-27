// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LottoFactory} from "../../src/Lotto/Factory.sol";
import {LottoImplementation} from "../../src/Lotto/Implementation.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

contract LottoSystemTest is Test {
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
            500000
        );
        vrfCoordinator.addConsumer(subId, address(factory));
    }

    function testFullLottoFlow() external {
        // Create Lotto
        address cloneAddr = factory.createLotto(0.01 ether, 3);
        LottoImplementation clone = LottoImplementation(cloneAddr);

        // Users join Lotto
        vm.deal(user1, 1 ether);
        vm.deal(user2, 1 ether);
        vm.deal(user3, 1 ether);

        vm.prank(user1);
        clone.joinLotto{value: 0.01 ether}();
        vm.prank(user2);
        clone.joinLotto{value: 0.01 ether}();
        vm.prank(user3);
        clone.joinLotto{value: 0.01 ether}();

        // Check that the Lotto is now calculating winner
        assertEq(uint256(clone.lottoState()), 1); // CALCULATING

        // Assume someone called the requestWinner function
        clone.requestWinner();
        uint256 requestId = 1;
        vrfCoordinator.fulfillRandomWords(requestId, address(factory));

        // Check that the winner is finalized
        assertEq(uint256(clone.lottoState()), 2); // CLOSED
        address winner = clone.winner();
        assertTrue(winner == user1 || winner == user2 || winner == user3);
    }

    function testMultipleLottoInstances() external {
        // create two Lotto instances
        address cloneAddrA = factory.createLotto(0.01 ether, 2);
        address cloneAddrB = factory.createLotto(0.02 ether, 2);

        LottoImplementation lottoA = LottoImplementation(cloneAddrA);
        LottoImplementation lottoB = LottoImplementation(cloneAddrB);

        // join both Lotto instances
        vm.deal(user1, 1 ether);
        vm.deal(user2, 1 ether);
        vm.prank(user1);
        lottoA.joinLotto{value: 0.01 ether}();
        vm.prank(user2);
        lottoA.joinLotto{value: 0.01 ether}();

        vm.deal(user3, 1 ether);
        vm.prank(user1);
        lottoB.joinLotto{value: 0.02 ether}();
        vm.prank(user3);
        lottoB.joinLotto{value: 0.02 ether}();

        lottoA.requestWinner(); // requestId: 1
        lottoB.requestWinner(); // requestId: 2

        // deliver randomness in shuffled order to test delivery accident
        // deliver for Lotto B first
        vrfCoordinator.fulfillRandomWords(2, address(factory));

        // deliver for Lotto A second
        vrfCoordinator.fulfillRandomWords(1, address(factory));

        // each lotto should work independently

        // verify Lotto A
        assertEq(uint256(lottoA.lottoState()), 2); // CLOSED
        assertEq(lottoA.winner(), user2); // Once random is fixed, winner is predictable

        // verify Lotto B
        assertEq(uint256(lottoB.lottoState()), 2); // CLOSED
        assertEq(lottoB.winner(), user3); // Once random is fixed, winner is predictable

        // verify balances
        assertEq(address(lottoA).balance, 0.02 ether);
        assertEq(address(lottoB).balance, 0.04 ether);
    }
}
