// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LottoFactory} from "../../src/Lotto/LottoFactory.sol";
import {LottoImplementation} from "../../src/Lotto/LottoImplementation.sol";
import {LottoEntryToken} from "../../src/Lotto/LottoEntryToken.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";
import {LottoPoolSolvency} from "../helpers/LottoPoolSolvency.sol";

/**
 * @title LottoHandler
 * @notice Foundry invariant handler — skeleton for random call sequences.
 * @dev Extend with VRF fulfill, refund path, and `withdrawPrize` as v2 security tests grow.
 */
contract LottoHandler is Test {
    LottoFactory public factory;
    LottoEntryToken public entryToken;
    LottoImplementation public lotto;
    VRFCoordinatorV2_5Mock public vrfCoordinator;

    uint256 public entryFee;
    uint256 public maxPlayers;

    address[] public participants;
    address[] internal _trackedAccounts;
    address[] internal _joinPool;

    uint256 public joinCount;
    uint256 public requestWinnerCount;
    uint256 public fulfillCount;
    uint256 public triggerRefundCount;
    uint256 public claimRefundCount;
    uint256 public withdrawPrizeCount;
    uint256 internal _lastScannedRequestId;

    constructor(
        LottoFactory _factory,
        LottoEntryToken _entryToken,
        VRFCoordinatorV2_5Mock _vrfCoordinator,
        uint256 _entryFee,
        uint256 _maxPlayers,
        address[] memory joinPool
    ) {
        factory = _factory;
        entryToken = _entryToken;
        vrfCoordinator = _vrfCoordinator;
        entryFee = _entryFee;
        maxPlayers = _maxPlayers;
        _joinPool = joinPool;
    }

    /// @notice Deploy a new lotto clone (call once from invariant `setUp` or as first handler step).
    function createLotto() external {
        address clone = factory.createLotto(entryFee, maxPlayers, address(entryToken));
        lotto = LottoImplementation(clone);
    }

    /// @notice Join when OPEN; registers `player` for solvency accounting.
    function join(address player) public {
        _join(player);
    }

    /// @notice Fuzz entrypoint: pick a funded player from `_joinPool`.
    function joinRandom(uint256 seed) external {
        if (_joinPool.length == 0) return;
        _join(_joinPool[seed % _joinPool.length]);
    }

    /// @notice Request winner randomness once lotto reaches FULL.
    function requestWinner() external {
        if (address(lotto) == address(0)) return;
        if (lotto.lottoState() != LottoImplementation.LottoState.FULL) return;

        lotto.requestWinner();
        requestWinnerCount++;
    }

    /// @notice Fulfill the latest pending randomness request for this lotto.
    function fulfillRandomness() external {
        if (address(lotto) == address(0)) return;
        if (lotto.lottoState() != LottoImplementation.LottoState.CALCULATING) return;

        uint256 requestId = _findPendingRequestId();
        if (requestId == 0) return;

        vrfCoordinator.fulfillRandomWords(requestId, address(factory));
        fulfillCount++;
    }

    /// @notice Move time forward and trigger refund mode once timeout elapsed.
    function warpAndTriggerRefund() external {
        if (address(lotto) == address(0)) return;
        if (lotto.lottoState() != LottoImplementation.LottoState.CALCULATING) return;

        vm.warp(block.timestamp + lotto.CALCULATING_TIMEOUT() + 1);
        lotto.triggerRefundMode();
        triggerRefundCount++;
    }

    /// @notice Claim refund for a tracked participant when REFUNDING.
    function claimRefundRandom(uint256 seed) external {
        if (address(lotto) == address(0)) return;
        if (lotto.lottoState() != LottoImplementation.LottoState.REFUNDING) return;
        if (_trackedAccounts.length == 0) return;

        address player = _trackedAccounts[seed % _trackedAccounts.length];
        if (lotto.refundableAmount(player) == 0) return;

        vm.prank(player);
        lotto.claimRefund();
        claimRefundCount++;
    }

    /// @notice Withdraw prize as current winner when CLOSED.
    function withdrawPrizeAsWinner() external {
        if (address(lotto) == address(0)) return;
        if (lotto.lottoState() != LottoImplementation.LottoState.CLOSED) return;
        if (lotto.isPrizeWithdrawn()) return;

        address winner = lotto.winner();
        if (winner == address(0)) return;

        vm.prank(winner);
        lotto.withdrawPrize();
        withdrawPrizeCount++;
    }

    function _join(address player) internal {
        if (address(lotto) == address(0)) return;
        if (lotto.lottoState() != LottoImplementation.LottoState.OPEN) return;

        _registerParticipant(player);

        vm.startPrank(player);
        entryToken.approve(address(lotto), entryFee);
        lotto.joinLotto();
        vm.stopPrank();

        joinCount++;
    }

    function trackedAccounts() external view returns (address[] memory) {
        return _trackedAccounts;
    }

    function assertLottoSolvent() external view {
        LottoPoolSolvency.assertPoolSolvent(lotto, _trackedAccounts);
    }

    function _registerParticipant(address player) internal {
        participants.push(player);

        uint256 len = _trackedAccounts.length;
        for (uint256 i = 0; i < len; i++) {
            if (_trackedAccounts[i] == player) {
                return;
            }
        }
        _trackedAccounts.push(player);
    }

    function _findPendingRequestId() internal returns (uint256) {
        uint256 maxScan = _lastScannedRequestId + 64;
        for (uint256 requestId = _lastScannedRequestId + 1; requestId <= maxScan; requestId++) {
            if (factory.s_requestIdToLotto(requestId) == address(lotto)) {
                _lastScannedRequestId = requestId;
                return requestId;
            }
        }
        return 0;
    }
}
