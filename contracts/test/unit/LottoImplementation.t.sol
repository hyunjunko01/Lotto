// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {LottoImplementation} from "../../src/Lotto/LottoImplementation.sol";
import {LottoEntryToken} from "../../src/Lotto/LottoEntryToken.sol";
import {LottoFactoryMock} from "../mock/FactoryMock.sol";

contract LottoImplementationUnitTest is Test {
    LottoImplementation implementation; // logic implementation
    LottoImplementation lotto; // lotto proxy instance
    LottoFactoryMock factory; // mock factory to simulate VRF callback
    LottoEntryToken entryToken;

    address player1 = makeAddr("player1");
    address player2 = makeAddr("player2");
    address player3 = makeAddr("player3");
    address nonWinner = makeAddr("nonWinner");

    uint256 constant ENTRY_FEE = 0.1 ether;
    uint256 constant MAX_PLAYERS = 3;

    uint256 constant OPEN = 0;
    uint256 constant FULL = 1;
    uint256 constant CALCULATING = 2;
    uint256 constant CLOSED = 3;
    uint256 constant REFUNDING = 4;

    function setUp() public {
        implementation = new LottoImplementation();
        factory = new LottoFactoryMock();
        entryToken = new LottoEntryToken();
        address clone = Clones.clone(address(implementation));

        lotto = LottoImplementation(clone);
        lotto.initialize(ENTRY_FEE, MAX_PLAYERS, address(entryToken), address(factory));

        entryToken.mint(player1, 10 ether);
        entryToken.mint(player2, 10 ether);
        entryToken.mint(player3, 10 ether);
        entryToken.mint(nonWinner, 10 ether);
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

    function test_joinLotto_RevertWhenLottoIsFull() external {
        _makeLottoFull();
        vm.startPrank(nonWinner);
        entryToken.approve(address(lotto), ENTRY_FEE);
        vm.expectRevert(LottoImplementation.Lotto__IsFull.selector);
        lotto.joinLotto();
        vm.stopPrank();
    }

    function test_joinLotto_RevertWhenLottoIsNotOpen() external {
        _makeLottoFull();
        lotto.requestWinner();
        vm.startPrank(nonWinner);
        entryToken.approve(address(lotto), ENTRY_FEE);
        vm.expectRevert(LottoImplementation.Lotto__IsNotOpen.selector);
        lotto.joinLotto();
        vm.stopPrank();
    }

    function test_joinLotto_RevertWhenNotEnoughToken() external {
        address poorPlayer = makeAddr("poorPlayer");
        entryToken.mint(poorPlayer, ENTRY_FEE - 1);
        vm.startPrank(poorPlayer);
        entryToken.approve(address(lotto), ENTRY_FEE);
        vm.expectRevert(LottoImplementation.Lotto__InsufficientEntryFee.selector);
        lotto.joinLotto();
        vm.stopPrank();
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
        lotto.requestWinner();
        vm.expectRevert(LottoImplementation.Lotto__IsNotFull.selector);
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

    function test_triggerRefundMode_RevertWhenTimeoutNotElapsed() external {
        _makeLottoFull();
        lotto.requestWinner();

        vm.expectRevert(LottoImplementation.Lotto__CalculatingTimeoutNotElapsed.selector);
        lotto.triggerRefundMode();
    }

    function test_triggerRefundMode_EnablesRefundingAfterTimeout() external {
        _makeLottoFull();
        lotto.requestWinner();

        vm.warp(block.timestamp + lotto.CALCULATING_TIMEOUT() + 1);
        lotto.triggerRefundMode();

        assertEq(uint256(lotto.lottoState()), REFUNDING);
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

        uint256 winnerInitialBalance = entryToken.balanceOf(player1);
        vm.prank(player1);
        lotto.withdrawPrize();
        uint256 winnerFinalBalance = entryToken.balanceOf(player1);

        // The winner's balance should increase by the prize amount (3 * ENTRY_FEE)
        assertEq(winnerFinalBalance - winnerInitialBalance, 3 * ENTRY_FEE);
    }

    function test_withdrawPrize_RevertWhenNotClosed() external {
        vm.prank(player1);
        vm.expectRevert(LottoImplementation.Lotto__IsNotClosed.selector);
        lotto.withdrawPrize();
    }

    function test_claimRefund_SuccessAfterTimeout() external {
        _makeLottoFull();
        lotto.requestWinner();
        vm.warp(block.timestamp + lotto.CALCULATING_TIMEOUT() + 1);
        lotto.triggerRefundMode();

        uint256 before = entryToken.balanceOf(player1);
        vm.prank(player1);
        lotto.claimRefund();
        uint256 afterBal = entryToken.balanceOf(player1);

        assertEq(afterBal - before, ENTRY_FEE);
        assertEq(lotto.refundableAmount(player1), 0);
    }

    function test_claimRefund_SuccessWithMultipleEntries() external {
        address clone = Clones.clone(address(implementation));
        LottoImplementation lottoMulti = LottoImplementation(clone);
        lottoMulti.initialize(ENTRY_FEE, 4, address(entryToken), address(factory));

        vm.startPrank(player1);
        entryToken.approve(address(lottoMulti), ENTRY_FEE * 2);
        lottoMulti.joinLotto();
        lottoMulti.joinLotto();
        vm.stopPrank();

        vm.startPrank(player2);
        entryToken.approve(address(lottoMulti), ENTRY_FEE);
        lottoMulti.joinLotto();
        vm.stopPrank();

        vm.startPrank(player3);
        entryToken.approve(address(lottoMulti), ENTRY_FEE);
        lottoMulti.joinLotto();
        vm.stopPrank();

        lottoMulti.requestWinner();
        vm.warp(block.timestamp + lottoMulti.CALCULATING_TIMEOUT() + 1);
        lottoMulti.triggerRefundMode();

        uint256 before = entryToken.balanceOf(player1);
        vm.prank(player1);
        lottoMulti.claimRefund();
        uint256 afterBal = entryToken.balanceOf(player1);

        assertEq(afterBal - before, ENTRY_FEE * 2);
        assertEq(lottoMulti.refundableAmount(player1), 0);
    }

    function test_claimRefund_RevertWhenNotRefunding() external {
        vm.prank(player1);
        vm.expectRevert(LottoImplementation.Lotto__IsNotRefunding.selector);
        lotto.claimRefund();
    }

    function test_claimRefund_RevertWhenNoBalance() external {
        _makeLottoFull();
        lotto.requestWinner();
        vm.warp(block.timestamp + lotto.CALCULATING_TIMEOUT() + 1);
        lotto.triggerRefundMode();

        vm.prank(nonWinner);
        vm.expectRevert(LottoImplementation.Lotto__NoRefundableBalance.selector);
        lotto.claimRefund();
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

    // --- I1: prize vs refund path exclusivity (SECURITY.md) ---

    function test_claimRefund_RevertAfterPrizeWithdrawn() external {
        _makeLottoFull();
        lotto.requestWinner();
        vm.prank(address(factory));
        lotto.finalizeWinner(0);

        vm.prank(lotto.winner());
        lotto.withdrawPrize();

        vm.prank(lotto.winner());
        vm.expectRevert(LottoImplementation.Lotto__IsNotRefunding.selector);
        lotto.claimRefund();
    }

    function test_withdrawPrize_RevertAfterRefundClaimed() external {
        _makeLottoFull();
        lotto.requestWinner();
        vm.warp(block.timestamp + lotto.CALCULATING_TIMEOUT() + 1);
        lotto.triggerRefundMode();

        vm.prank(player1);
        lotto.claimRefund();

        vm.prank(player1);
        vm.expectRevert(LottoImplementation.Lotto__IsNotClosed.selector);
        lotto.withdrawPrize();
    }

    // --- helper functions ---

    function _makeLottoFull() internal {
        vm.startPrank(player1);
        entryToken.approve(address(lotto), ENTRY_FEE);
        lotto.joinLotto();
        vm.stopPrank();

        vm.startPrank(player2);
        entryToken.approve(address(lotto), ENTRY_FEE);
        lotto.joinLotto();
        vm.stopPrank();

        vm.startPrank(player3);
        entryToken.approve(address(lotto), ENTRY_FEE);
        lotto.joinLotto();
        vm.stopPrank();
    }
}
