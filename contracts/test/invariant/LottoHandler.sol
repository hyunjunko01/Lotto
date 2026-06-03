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
    VRFCoordinatorV2_5Mock public vrfCoordinator;

    uint256 public entryFee;
    uint256 public maxPlayers;
    uint256 public maxInstances;

    address[] public participants;
    address[] internal _joinPool;
    LottoImplementation[] internal _lottos;
    mapping(uint256 lottoIndex => address[]) internal _trackedAccountsByLotto;

    uint256 public joinCount;
    uint256 public createLottoCount;
    uint256 public requestWinnerCount;
    uint256 public fulfillCount;
    uint256 public triggerRefundCount;
    uint256 public claimRefundCount;
    uint256 public withdrawPrizeCount;
    mapping(uint256 lottoIndex => uint256 lastScannedRequestId) internal _lastScannedRequestIdByLotto;
    mapping(uint256 lottoIndex => mapping(address account => bool settledByRefund)) internal _settledByRefund;
    mapping(uint256 lottoIndex => mapping(address account => bool settledByPrize)) internal _settledByPrize;

    constructor(
        LottoFactory _factory,
        LottoEntryToken _entryToken,
        VRFCoordinatorV2_5Mock _vrfCoordinator,
        uint256 _entryFee,
        uint256 _maxPlayers,
        uint256 _maxInstances,
        address[] memory joinPool
    ) {
        factory = _factory;
        entryToken = _entryToken;
        vrfCoordinator = _vrfCoordinator;
        entryFee = _entryFee;
        maxPlayers = _maxPlayers;
        maxInstances = _maxInstances;
        _joinPool = joinPool;
    }

    /// @notice Deploy a new lotto clone up to `maxInstances`.
    function createLottoInstance() public {
        if (_lottos.length >= maxInstances) return;
        address clone = factory.createLotto(entryFee, maxPlayers, address(entryToken));
        _lottos.push(LottoImplementation(clone));
        createLottoCount++;
    }

    /// @notice Backward-compatible alias.
    function createLotto() external {
        createLottoInstance();
    }

    /// @notice Join a random lotto with a random funded participant from the join pool.
    function joinRandom(uint256 seed) external {
        if (_joinPool.length == 0) return;
        uint256 lottoLen = _lottos.length;
        if (lottoLen == 0) return;

        uint256 lottoIndex = seed % lottoLen;
        address player = _joinPool[(seed / lottoLen) % _joinPool.length];
        _join(lottoIndex, player);
    }

    /// @notice Request winner randomness for a random lotto once it reaches FULL.
    function requestWinner(uint256 seed) external {
        uint256 lottoLen = _lottos.length;
        if (lottoLen == 0) return;
        LottoImplementation selectedLotto = _lottos[seed % lottoLen];
        if (selectedLotto.lottoState() != LottoImplementation.LottoState.FULL) return;

        selectedLotto.requestWinner();
        requestWinnerCount++;
    }

    /// @notice Fulfill the latest pending randomness request for a random lotto.
    function fulfillRandomness(uint256 seed) external {
        uint256 lottoLen = _lottos.length;
        if (lottoLen == 0) return;
        uint256 lottoIndex = seed % lottoLen;
        LottoImplementation selectedLotto = _lottos[lottoIndex];
        if (selectedLotto.lottoState() != LottoImplementation.LottoState.CALCULATING) return;

        uint256 requestId = _findPendingRequestId(lottoIndex, selectedLotto);
        if (requestId == 0) return;

        vrfCoordinator.fulfillRandomWords(requestId, address(factory));
        fulfillCount++;
    }

    /// @notice Move time forward and trigger refund mode once timeout elapsed.
    function warpAndTriggerRefund(uint256 seed) external {
        uint256 lottoLen = _lottos.length;
        if (lottoLen == 0) return;
        LottoImplementation selectedLotto = _lottos[seed % lottoLen];
        if (selectedLotto.lottoState() != LottoImplementation.LottoState.CALCULATING) return;

        vm.warp(block.timestamp + selectedLotto.CALCULATING_TIMEOUT() + 1);
        selectedLotto.triggerRefundMode();
        triggerRefundCount++;
    }

    /// @notice Claim refund for a tracked participant when REFUNDING.
    function claimRefundRandom(uint256 seed) external {
        uint256 lottoLen = _lottos.length;
        if (lottoLen == 0) return;
        uint256 lottoIndex = seed % lottoLen;
        LottoImplementation selectedLotto = _lottos[lottoIndex];
        if (selectedLotto.lottoState() != LottoImplementation.LottoState.REFUNDING) return;
        address[] storage tracked = _trackedAccountsByLotto[lottoIndex];
        if (tracked.length == 0) return;

        address player = tracked[(seed / lottoLen) % tracked.length];
        if (selectedLotto.refundableAmount(player) == 0) return;

        vm.prank(player);
        selectedLotto.claimRefund();
        _settledByRefund[lottoIndex][player] = true;
        claimRefundCount++;
    }

    /// @notice Withdraw prize as current winner when CLOSED.
    function withdrawPrizeAsWinner(uint256 seed) external {
        uint256 lottoLen = _lottos.length;
        if (lottoLen == 0) return;
        uint256 lottoIndex = seed % lottoLen;
        LottoImplementation selectedLotto = _lottos[lottoIndex];
        if (selectedLotto.lottoState() != LottoImplementation.LottoState.CLOSED) return;
        if (selectedLotto.isPrizeWithdrawn()) return;

        address winner = selectedLotto.winner();
        if (winner == address(0)) return;

        vm.prank(winner);
        selectedLotto.withdrawPrize();
        _settledByPrize[lottoIndex][winner] = true;
        withdrawPrizeCount++;
    }

    function _join(uint256 lottoIndex, address player) internal {
        LottoImplementation selectedLotto = _lottos[lottoIndex];
        if (selectedLotto.lottoState() != LottoImplementation.LottoState.OPEN) return;

        _registerParticipant(lottoIndex, player);

        vm.startPrank(player);
        entryToken.approve(address(selectedLotto), entryFee);
        selectedLotto.joinLotto();
        vm.stopPrank();

        joinCount++;
    }

    function trackedAccounts() external view returns (address[] memory) {
        if (_lottos.length == 0) return new address[](0);
        return _trackedAccountsByLotto[0];
    }

    function trackedAccountsFor(uint256 lottoIndex) external view returns (address[] memory) {
        return _trackedAccountsByLotto[lottoIndex];
    }

    function settlementFlagsFor(uint256 lottoIndex, address account)
        external
        view
        returns (bool settledByRefund, bool settledByPrize)
    {
        return (_settledByRefund[lottoIndex][account], _settledByPrize[lottoIndex][account]);
    }

    function lottoCount() external view returns (uint256) {
        return _lottos.length;
    }

    function lottoAt(uint256 lottoIndex) external view returns (LottoImplementation) {
        return _lottos[lottoIndex];
    }

    /// @notice Backward-compatible view for current invariant file shape.
    function lotto() external view returns (LottoImplementation) {
        if (_lottos.length == 0) revert("No lottos");
        return _lottos[0];
    }

    function assertLottoSolvent() external view {
        uint256 count = _lottos.length;
        for (uint256 i = 0; i < count; i++) {
            LottoPoolSolvency.assertPoolSolvent(_lottos[i], _trackedAccountsByLotto[i]);
        }
    }

    function _registerParticipant(uint256 lottoIndex, address player) internal {
        participants.push(player);

        address[] storage tracked = _trackedAccountsByLotto[lottoIndex];
        uint256 len = tracked.length;
        for (uint256 i = 0; i < len; i++) {
            if (tracked[i] == player) {
                return;
            }
        }
        tracked.push(player);
    }

    function _findPendingRequestId(uint256 lottoIndex, LottoImplementation lottoImpl) internal returns (uint256) {
        uint256 last = _lastScannedRequestIdByLotto[lottoIndex];
        uint256 maxScan = last + 64;
        for (uint256 requestId = last + 1; requestId <= maxScan; requestId++) {
            if (factory.s_requestIdToLotto(requestId) == address(lottoImpl)) {
                _lastScannedRequestIdByLotto[lottoIndex] = requestId;
                return requestId;
            }
        }
        return 0;
    }
}
