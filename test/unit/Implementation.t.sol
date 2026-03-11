// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {LottoImplementation} from "../../src/Lotto/Implementation.sol";
import {LottoFactoryMock} from "../mock/FactoryMock.sol";
import {Rejector} from "../mock/Rejector.sol";

contract LottoImplementationUnitTest is Test {
    LottoImplementation implementation; // logic implementation
    LottoImplementation lotto; // lotto proxy instance
    LottoFactoryMock factory; // mock factory to simulate VRF callback
    Rejector rejector; // contract to simulate refund failure

    address player1 = makeAddr("player1");
    address player2 = makeAddr("player2");
    address player3 = makeAddr("player3");
    address player4 = makeAddr("player4");

    uint256 constant ENTRY_FEE = 0.1 ether;
    uint256 constant MAX_PLAYERS = 3;

    uint256 constant OPEN = 0;
    uint256 constant FULL = 1;
    uint256 constant CALCULATING = 2;
    uint256 constant CLOSED = 3;

    function setUp() public {
        implementation = new LottoImplementation();
        factory = new LottoFactoryMock();
        address clone = Clones.clone(address(implementation));

        lotto = LottoImplementation(clone);
        lotto.initialize(ENTRY_FEE, MAX_PLAYERS, address(factory));

        vm.deal(player1, 1 ether);
        vm.deal(player2, 1 ether);
        vm.deal(player3, 1 ether);
        vm.deal(player4, 1 ether);
    }

    // --- joinLotto function tests ---

    function test_joinLotto_Success() external {
        _makeLottoFull();
        assertEq(lotto.players(0), player1);
        assertEq(lotto.players(1), player2);
        assertEq(lotto.players(2), player3);
        assertEq(uint256(lotto.lottoState()), FULL);
        assertEq(lotto.getLottoBalance(), 3 * ENTRY_FEE);
    }

    function test_joinLotto_ExcessRefund() external {
        vm.prank(player1);
        lotto.joinLotto{value: 0.2 ether}();
        assertEq(player1.balance, 1 ether - ENTRY_FEE); // Excess 0.1 ether should be refunded
    }

    function test_joinLotto_RevertWhenLottoIsFull() external {
        _makeLottoFull();
        vm.prank(player4);
        vm.expectRevert(LottoImplementation.Lotto__IsFull.selector);
        lotto.joinLotto{value: ENTRY_FEE}();
    }

    function test_joinLotto_RevertWhenLottoIsNotOpen() external {
        _makeLottoFull();

        // Directly manipulate the storage to set lottoState to CALCULATING
        bytes32 currentSlotData = vm.load(address(lotto), bytes32(uint256(4)));

        bytes32 newData = currentSlotData | bytes32(uint256(2) << 22 * 8); // Set lottoState to CALCULATING (2)

        vm.store(address(lotto), bytes32(uint256(4)), newData);

        vm.prank(player4);
        vm.expectRevert(LottoImplementation.Lotto__IsNotOpen.selector);
        lotto.joinLotto{value: ENTRY_FEE}();
    }

    function test_joinLotto_RevertWhenNotEnoughEther() external {
        vm.prank(player1);
        vm.expectRevert(LottoImplementation.Lotto__InsufficientEntryFee.selector);
        lotto.joinLotto{value: 0.01 ether}();
    }

    function test_joinLotto_RevertWhenRefundFails() external {
        rejector = new Rejector();

        vm.deal(address(rejector), 1 ether);

        vm.expectRevert(LottoImplementation.Lotto__RefundFailed.selector);
        rejector.joinLotto(address(lotto), 0.2 ether);
    }

    // --- requestWinner function tests ---

    function test_requestWinner_Success() external {
        _makeLottoFull();
        lotto.requestWinner();
        assertEq(uint256(lotto.lottoState()), CALCULATING);
    }

    function test_requestWinner_RevertWhenNotFull() external {
        vm.prank(player1);
        vm.expectRevert(LottoImplementation.Lotto__IsNotFull.selector);
        lotto.requestWinner();
    }

    function test_requestWinner_RevertWhenAlreadyRequested() external {
        _makeLottoFull();

        // Directly manipulate the storage to set isRandomnessRequested to true
        bytes32 currentSlotData = vm.load(address(lotto), bytes32(uint256(4)));

        bytes32 newData = currentSlotData | bytes32(uint256(1) << 20 * 8);

        vm.store(address(lotto), bytes32(uint256(4)), newData);

        vm.expectRevert(LottoImplementation.Lotto__AlreadyRequested.selector);
        lotto.requestWinner();
    }

    // --- finalize Winner function tests ---

    function test_finalizeWinner_Success() external {
        _makeLottoFull();
        lotto.requestWinner();

        // Simulate the callback from factory with randomness
        uint256 randomNumber = 123; // Mock random number
        vm.prank(address(factory));
        lotto.finalizeWinner(randomNumber);

        // The winner should be player1 since randomNumber % 3 == 0
        assertEq(lotto.winner(), player1);
        assertEq(uint256(lotto.lottoState()), CLOSED);
    }

    function test_finalizeWinner_RevertWhenNotCalculating() external {
        vm.prank(address(factory));
        vm.expectRevert(LottoImplementation.Lotto__IsNotCalculating.selector);
        lotto.finalizeWinner(123);
    }

    function test_finalizeWinner_RevertWhenNotFactory() external {
        _makeLottoFull();
        lotto.requestWinner();

        // Simulate a call from an unauthorized address
        vm.prank(player1);
        vm.expectRevert(LottoImplementation.Lotto__OnlyFactoryCanFulfill.selector);
        lotto.finalizeWinner(123);
    }

    // --- withdrawPrize function tests ---

    function test_withdrawPrize_Success() external {
        _makeLottoFull();
        lotto.requestWinner();

        uint256 randomNumber = 123; // Mock random number
        vm.prank(address(factory));
        lotto.finalizeWinner(randomNumber);

        // Simulate the winner withdrawing the prize
        uint256 winnerInitialBalance = player1.balance;
        vm.prank(player1);
        lotto.withdrawPrize();
        uint256 winnerFinalBalance = player1.balance;

        // The winner's balance should increase by the prize amount (3 * ENTRY_FEE)
        assertEq(winnerFinalBalance - winnerInitialBalance, 3 * ENTRY_FEE);
    }

    function test_withdrawPrize_RevertWhenNotClosed() external {
        vm.prank(player1);
        vm.expectRevert(LottoImplementation.Lotto__IsNotClosed.selector);
        lotto.withdrawPrize();
    }

    function test_withdrawPrize_RevertWhenNotWinner() external {
        _makeLottoFull();
        lotto.requestWinner();

        uint256 randomNumber = 123; // Mock random number
        vm.prank(address(factory));
        lotto.finalizeWinner(randomNumber);

        // Simulate a non-winner trying to withdraw the prize
        vm.prank(player2);
        vm.expectRevert(LottoImplementation.Lotto__YouAreNotWinner.selector);
        lotto.withdrawPrize();
    }

    function test_withdrawPrize_RevertWhenAlreadyWithdrawn() external {
        _makeLottoFull();
        lotto.requestWinner();

        uint256 randomNumber = 123; // Mock random number
        vm.prank(address(factory));
        lotto.finalizeWinner(randomNumber);

        // Simulate the winner withdrawing the prize
        vm.prank(player1);
        lotto.withdrawPrize();

        // Simulate the winner trying to withdraw again
        vm.prank(player1);
        vm.expectRevert(LottoImplementation.Lotto__AlreadyWithdrawn.selector);
        lotto.withdrawPrize();
    }

    function test_withdrawPrize_RevertWhenTransferFails() external {
        address newLottoAddress = Clones.clone(address(implementation));
        LottoImplementation newLotto = LottoImplementation(newLottoAddress);

        newLotto.initialize(ENTRY_FEE, 1, address(factory));

        rejector = new Rejector();
        vm.deal(address(rejector), 1 ether);

        rejector.joinLotto(address(newLotto), ENTRY_FEE);

        newLotto.requestWinner();

        uint256 randomNumber = 123;
        vm.prank(address(factory));
        newLotto.finalizeWinner(randomNumber);

        vm.expectRevert(LottoImplementation.Lotto__TransferFailed.selector);
        rejector.withdrawPrize(address(newLotto));
    }
    // --- helper functions ---

    function _makeLottoFull() internal {
        vm.prank(player1);
        lotto.joinLotto{value: ENTRY_FEE}();

        vm.prank(player2);
        lotto.joinLotto{value: ENTRY_FEE}();

        vm.prank(player3);
        lotto.joinLotto{value: ENTRY_FEE}();
    }
}
