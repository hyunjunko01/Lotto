// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LottoImplementation} from "../../src/Lotto/LottoImplementation.sol";
import {LottoPoolSolvency} from "./LottoPoolSolvency.sol";

/**
 * @title LottoNoDoublePayout
 * @notice Test helper for SECURITY.md invariant I1 (no double payout).
 * @dev A round settles on exactly one path:
 *      - CLOSED + `withdrawPrize` (winner takes the pool), or
 *      - REFUNDING + `claimRefund` (players take `refundableAmount`).
 *      I5 covers stake-level exclusivity between finalize and refund; I1 covers payout exclusivity.
 */
library LottoNoDoublePayout {
    error LottoNoDoublePayout__PrizePathWithWrongState(LottoImplementation.LottoState state);
    error LottoNoDoublePayout__PrizeAndRefundPathsActive(bool isPrizeWithdrawn, LottoImplementation.LottoState state);
    error LottoNoDoublePayout__PrizePathResidualBalance(address lotto, uint256 balance);
    error LottoNoDoublePayout__RefundPathFullySettledWithResidualBalance(address lotto, uint256 balance);
    error LottoNoDoublePayout__AccountSettledTwice(address account);

    /// @notice Instance-level exclusivity between prize and refund settlement paths.
    function assertSettlementPathsExclusive(LottoImplementation lotto, address[] memory accounts) internal view {
        LottoImplementation.LottoState state = lotto.lottoState();
        bool prizeWithdrawn = lotto.isPrizeWithdrawn();

        if (prizeWithdrawn && state != LottoImplementation.LottoState.CLOSED) {
            revert LottoNoDoublePayout__PrizePathWithWrongState(state);
        }

        if (prizeWithdrawn && state == LottoImplementation.LottoState.REFUNDING) {
            revert LottoNoDoublePayout__PrizeAndRefundPathsActive(prizeWithdrawn, state);
        }

        if (state == LottoImplementation.LottoState.REFUNDING && prizeWithdrawn) {
            revert LottoNoDoublePayout__PrizeAndRefundPathsActive(prizeWithdrawn, state);
        }

        IERC20 token = IERC20(address(lotto.entryToken()));
        uint256 balance = token.balanceOf(address(lotto));

        if (prizeWithdrawn && balance != 0) {
            revert LottoNoDoublePayout__PrizePathResidualBalance(address(lotto), balance);
        }

        if (state == LottoImplementation.LottoState.REFUNDING) {
            uint256 remainingRefundable = LottoPoolSolvency.sumRefundable(lotto, accounts);
            if (remainingRefundable == 0 && balance != 0) {
                revert LottoNoDoublePayout__RefundPathFullySettledWithResidualBalance(address(lotto), balance);
            }
        }
    }

    /// @notice Per-account: no player may complete both `claimRefund` and `withdrawPrize` for the same lotto.
    function assertAccountsNotSettledTwice(
        address[] memory accounts,
        bool[] memory settledByRefund,
        bool[] memory settledByPrize
    ) internal pure {
        uint256 len = accounts.length;
        if (settledByRefund.length != len || settledByPrize.length != len) {
            revert("LottoNoDoublePayout: flag length mismatch");
        }

        for (uint256 i = 0; i < len; i++) {
            if (settledByRefund[i] && settledByPrize[i]) {
                revert LottoNoDoublePayout__AccountSettledTwice(accounts[i]);
            }
        }
    }
}
