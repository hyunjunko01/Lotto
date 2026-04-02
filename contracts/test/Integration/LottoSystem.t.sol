// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SetupVrf} from "../../script/setup/SetupVrf.s.sol";
import {LottoFactory} from "../../src/Lotto/LottoFactory.sol";
import {LottoImplementation} from "../../src/Lotto/LottoImplementation.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

contract LottoSystemTest is Test {
    LottoFactory factory;
    VRFCoordinatorV2_5Mock vrfCoordinator;

    address player1 = makeAddr("player1");
    address player2 = makeAddr("player2");
    address player3 = makeAddr("player3");

    uint256 constant ENTRY_FEE = 0.01 ether;
    uint256 constant MAX_PLAYERS = 3;
    bytes32 constant KEY_HASH = 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c;
    uint32 constant CALLBACK_GAS_LIMIT = 500000;

    uint256 constant OPEN = 0;
    uint256 constant FULL = 1;
    uint256 constant CALCULATING = 2;
    uint256 constant CLOSED = 3;

    function setUp() public {
        SetupVrf setupVrf = new SetupVrf();
        address coordinator = setupVrf.deployForTest();
        vrfCoordinator = VRFCoordinatorV2_5Mock(coordinator);
        uint256 subscriptionId = vrfCoordinator.createSubscription();

        LottoImplementation implementation = new LottoImplementation();
        factory = new LottoFactory(address(implementation), coordinator, subscriptionId, KEY_HASH, CALLBACK_GAS_LIMIT);

        vrfCoordinator.fundSubscription(subscriptionId, 1e24);
        vrfCoordinator.addConsumer(subscriptionId, address(factory));

        vm.deal(player1, 1 ether);
        vm.deal(player2, 1 ether);
        vm.deal(player3, 1 ether);
    }

    function test_FullLottoFlow() external {
        // Create Lotto
        address cloneAddr = factory.createLotto(ENTRY_FEE, 3);
        LottoImplementation clone = LottoImplementation(cloneAddr);

        // Users join Lotto
        vm.prank(player1);
        clone.joinLotto{value: ENTRY_FEE}();
        vm.prank(player2);
        clone.joinLotto{value: ENTRY_FEE}();
        vm.prank(player3);
        clone.joinLotto{value: ENTRY_FEE}();

        // Check that the Lotto is full
        assertEq(uint256(clone.lottoState()), FULL); // FULL

        // Assume someone called the requestWinner function
        clone.requestWinner();
        uint256 requestId = 1;
        vrfCoordinator.fulfillRandomWords(requestId, address(factory));

        // Check that the winner is finalized
        assertEq(uint256(clone.lottoState()), CLOSED); // CLOSED
        address winner = clone.winner();
        assertTrue(winner == player1 || winner == player2 || winner == player3);
    }

    function test_MultipleLottoInstances() external {
        // create two Lotto instances
        address cloneAddrA = factory.createLotto(ENTRY_FEE, 2);
        address cloneAddrB = factory.createLotto(ENTRY_FEE * 2, 2);

        LottoImplementation lottoA = LottoImplementation(cloneAddrA);
        LottoImplementation lottoB = LottoImplementation(cloneAddrB);

        // join both Lotto instances
        vm.prank(player1);
        lottoA.joinLotto{value: ENTRY_FEE}();
        vm.prank(player2);
        lottoA.joinLotto{value: ENTRY_FEE}();

        vm.prank(player1);
        lottoB.joinLotto{value: ENTRY_FEE * 2}();
        vm.prank(player3);
        lottoB.joinLotto{value: ENTRY_FEE * 2}();

        lottoA.requestWinner(); // requestId: 1
        lottoB.requestWinner(); // requestId: 2

        // deliver randomness in shuffled order to test delivery accident
        // deliver for Lotto B first
        vrfCoordinator.fulfillRandomWords(2, address(factory));

        // deliver for Lotto A second
        vrfCoordinator.fulfillRandomWords(1, address(factory));

        // each lotto should work independently

        // verify Lotto A
        assertEq(uint256(lottoA.lottoState()), CLOSED); // CLOSED
        assertEq(lottoA.winner(), player2); // Once random is fixed, winner is predictable

        // verify Lotto B
        assertEq(uint256(lottoB.lottoState()), CLOSED); // CLOSED
        assertEq(lottoB.winner(), player3); // Once random is fixed, winner is predictable

        // verify balances
        assertEq(address(lottoA).balance, ENTRY_FEE * 2);
        assertEq(address(lottoB).balance, ENTRY_FEE * 4);
    }
}
