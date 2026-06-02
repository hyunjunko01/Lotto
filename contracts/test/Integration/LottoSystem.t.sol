// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SetupVrf} from "../../script/setup/SetupVrf.s.sol";
import {LottoFactory} from "../../src/Lotto/LottoFactory.sol";
import {LottoImplementation} from "../../src/Lotto/LottoImplementation.sol";
import {LottoEntryToken} from "../../src/Lotto/LottoEntryToken.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";
import {LottoPoolSolvency} from "../helpers/LottoPoolSolvency.sol";

contract LottoSystemTest is Test {
    LottoFactory factory;
    VRFCoordinatorV2_5Mock vrfCoordinator;
    LottoEntryToken entryToken;

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
    uint256 constant REFUNDING = 4;

    function setUp() public {
        SetupVrf setupVrf = new SetupVrf();
        address coordinator = setupVrf.deployForTest();
        vrfCoordinator = VRFCoordinatorV2_5Mock(coordinator);
        uint256 subscriptionId = vrfCoordinator.createSubscription();

        LottoImplementation implementation = new LottoImplementation();
        entryToken = new LottoEntryToken();
        factory =
            new LottoFactory(address(implementation), coordinator, subscriptionId, KEY_HASH, CALLBACK_GAS_LIMIT, false);

        vrfCoordinator.fundSubscription(subscriptionId, 1e24);
        vrfCoordinator.addConsumer(subscriptionId, address(factory));

        vm.deal(player1, 1 ether);
        vm.deal(player2, 1 ether);
        vm.deal(player3, 1 ether);

        entryToken.mint(player1, 100 ether);
        entryToken.mint(player2, 100 ether);
        entryToken.mint(player3, 100 ether);
    }

    function test_FullLottoFlow() external {
        // Create Lotto
        address cloneAddr = factory.createLotto(ENTRY_FEE, 3, address(entryToken));
        LottoImplementation clone = LottoImplementation(cloneAddr);

        // Users join Lotto
        vm.prank(player1);
        entryToken.approve(address(clone), ENTRY_FEE);
        vm.prank(player1);
        clone.joinLotto();
        vm.prank(player2);
        entryToken.approve(address(clone), ENTRY_FEE);
        vm.prank(player2);
        clone.joinLotto();
        vm.prank(player3);
        entryToken.approve(address(clone), ENTRY_FEE);
        vm.prank(player3);
        clone.joinLotto();

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

        _assertPoolSolvent(clone, _defaultParticipants());
    }

    function test_MultipleLottoInstances() external {
        // create two Lotto instances
        address cloneAddrA = factory.createLotto(ENTRY_FEE, 2, address(entryToken));
        address cloneAddrB = factory.createLotto(ENTRY_FEE * 2, 2, address(entryToken));

        LottoImplementation lottoA = LottoImplementation(cloneAddrA);
        LottoImplementation lottoB = LottoImplementation(cloneAddrB);

        // join both Lotto instances
        vm.prank(player1);
        entryToken.approve(address(lottoA), ENTRY_FEE);
        vm.prank(player1);
        lottoA.joinLotto();
        vm.prank(player2);
        entryToken.approve(address(lottoA), ENTRY_FEE);
        vm.prank(player2);
        lottoA.joinLotto();

        vm.prank(player1);
        entryToken.approve(address(lottoB), ENTRY_FEE * 2);
        vm.prank(player1);
        lottoB.joinLotto();
        vm.prank(player3);
        entryToken.approve(address(lottoB), ENTRY_FEE * 2);
        vm.prank(player3);
        lottoB.joinLotto();

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
        assertEq(entryToken.balanceOf(address(lottoA)), ENTRY_FEE * 2);
        assertEq(entryToken.balanceOf(address(lottoB)), ENTRY_FEE * 4);

        _assertPoolSolvent(lottoA, _defaultParticipants());
        address[] memory lottoBPlayers = new address[](2);
        lottoBPlayers[0] = player1;
        lottoBPlayers[1] = player3;
        _assertPoolSolvent(lottoB, lottoBPlayers);
    }

    function test_RefundFlow_WhenVrfCallbackStuck() external {
        address cloneAddr = factory.createLotto(ENTRY_FEE, MAX_PLAYERS, address(entryToken));
        LottoImplementation clone = LottoImplementation(cloneAddr);

        vm.prank(player1);
        entryToken.approve(address(clone), ENTRY_FEE);
        vm.prank(player1);
        clone.joinLotto();
        vm.prank(player2);
        entryToken.approve(address(clone), ENTRY_FEE);
        vm.prank(player2);
        clone.joinLotto();
        vm.prank(player3);
        entryToken.approve(address(clone), ENTRY_FEE);
        vm.prank(player3);
        clone.joinLotto();

        clone.requestWinner();
        assertEq(uint256(clone.lottoState()), CALCULATING);

        vm.warp(block.timestamp + clone.CALCULATING_TIMEOUT() + 1);
        clone.triggerRefundMode();
        assertEq(uint256(clone.lottoState()), REFUNDING);

        uint256 before = entryToken.balanceOf(player1);
        vm.prank(player1);
        clone.claimRefund();
        uint256 afterBal = entryToken.balanceOf(player1);
        assertEq(afterBal - before, ENTRY_FEE);

        _assertPoolSolvent(clone, _defaultParticipants());
    }

    function _defaultParticipants() internal view returns (address[] memory accounts) {
        return _participants(player1, player2, player3);
    }

    function _participants(address a, address b, address c) internal pure returns (address[] memory accounts) {
        accounts = new address[](3);
        accounts[0] = a;
        accounts[1] = b;
        accounts[2] = c;
    }

    function _assertPoolSolvent(LottoImplementation lotto, address[] memory accounts) internal view {
        LottoPoolSolvency.assertPoolSolvent(lotto, accounts);
    }
}
