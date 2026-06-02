// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LottoImplementation} from "../../src/Lotto/LottoImplementation.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title LottoPoolSolvency
 * @notice Test helper for SECURITY.md invariant I2 (pool solvency).
 * @dev `accounts` must list every address that may have a non-zero `refundableAmount`.
 *      The helper does not scan on-chain state beyond that list (mappings are not iterable).
 *
 * Obligation formula (token balance must cover `totalObligation`):
 *
 *   balance = IERC20(entryToken).balanceOf(lotto)
 *
 *   REFUNDING:
 *     obligation = Σ refundableAmount[account]  (over tracked `accounts`)
 *
 *   CLOSED and not prize withdrawn:
 *     obligation = balance  (winner may withdraw full pool via `withdrawPrize`)
 *
 *   CLOSED and prize withdrawn:
 *     obligation = 0
 *
 *   OPEN | FULL | CALCULATING:
 *     obligation = Σ refundableAmount[account]
 *     (conservative: equals refund exposure if the round later enters REFUNDING)
 *
 * Invariant: balance >= obligation
 * Surplus (balance > obligation) is allowed — e.g. direct token donations to the lotto.
 */
library LottoPoolSolvency {
    error LottoPoolSolvency__PoolInsolvent(
        address lotto, uint256 balance, uint256 obligation, LottoImplementation.LottoState state
    );

    /// @dev Sum `refundableAmount` for each entry in `accounts` (duplicate addresses double-count).
    function sumRefundable(LottoImplementation lotto, address[] memory accounts) internal view returns (uint256 total) {
        uint256 len = accounts.length;
        for (uint256 i = 0; i < len; i++) {
            total += lotto.refundableAmount(accounts[i]);
        }
    }

    function totalObligation(LottoImplementation lotto, address[] memory accounts)
        internal
        view
        returns (uint256 obligation)
    {
        LottoImplementation.LottoState state = lotto.lottoState();
        IERC20 token = IERC20(address(lotto.entryToken()));
        uint256 balance = token.balanceOf(address(lotto));

        if (state == LottoImplementation.LottoState.REFUNDING) {
            return sumRefundable(lotto, accounts);
        }

        if (state == LottoImplementation.LottoState.CLOSED) {
            if (lotto.isPrizeWithdrawn()) {
                return 0;
            }
            return balance;
        }

        // OPEN, FULL, CALCULATING
        return sumRefundable(lotto, accounts);
    }

    function assertPoolSolvent(LottoImplementation lotto, address[] memory accounts) internal view {
        IERC20 token = IERC20(address(lotto.entryToken()));
        uint256 balance = token.balanceOf(address(lotto));
        uint256 obligation = totalObligation(lotto, accounts);

        if (balance < obligation) {
            revert LottoPoolSolvency__PoolInsolvent(address(lotto), balance, obligation, lotto.lottoState());
        }
    }
}
