// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LottoFactory} from "../../src/Lotto/LottoFactory.sol";
import {LottoImplementation} from "../../src/Lotto/LottoImplementation.sol";
import {LottoEntryToken} from "../../src/Lotto/LottoEntryToken.sol";
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

    uint256 public entryFee;
    uint256 public maxPlayers;

    address[] public participants;
    address[] internal _trackedAccounts;
    address[] internal _joinPool;

    uint256 public joinCount;

    constructor(
        LottoFactory _factory,
        LottoEntryToken _entryToken,
        uint256 _entryFee,
        uint256 _maxPlayers,
        address[] memory joinPool
    ) {
        factory = _factory;
        entryToken = _entryToken;
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

    // --- Skeleton: wire these in follow-up PRs ---
    // function requestWinner() external { ... }
    // function fulfillWinner(uint256 requestId) external { ... }
    // function warpAndTriggerRefund() external { ... }
    // function claimRefund(address player) external { ... }
    // function withdrawPrizeAsWinner() external { ... }

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
}
