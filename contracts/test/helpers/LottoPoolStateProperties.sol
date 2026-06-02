// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LottoImplementation} from "../../src/Lotto/LottoImplementation.sol";
import {LottoPoolSolvency} from "./LottoPoolSolvency.sol";

/**
 * @title LottoPoolStateProperties
 * @notice Phase-specific safety properties for lotto pool accounting.
 */
library LottoPoolStateProperties {
    error LottoPoolStateProperties__RefundingObligationMismatch(uint256 obligation, uint256 expectedRefundable);
    error LottoPoolStateProperties__ClosedUnwithdrawnObligationMismatch(uint256 obligation, uint256 balance);
    error LottoPoolStateProperties__ClosedWithdrawnObligationNotZero(uint256 obligation);

    function assertPhaseSpecificObligations(LottoImplementation lotto, address[] memory accounts) internal view {
        LottoImplementation.LottoState state = lotto.lottoState();
        uint256 obligation = LottoPoolSolvency.totalObligation(lotto, accounts);

        if (state == LottoImplementation.LottoState.REFUNDING) {
            uint256 expectedRefundable = LottoPoolSolvency.sumRefundable(lotto, accounts);
            if (obligation != expectedRefundable) {
                revert LottoPoolStateProperties__RefundingObligationMismatch(obligation, expectedRefundable);
            }
            return;
        }

        if (state == LottoImplementation.LottoState.CLOSED) {
            if (lotto.isPrizeWithdrawn()) {
                if (obligation != 0) {
                    revert LottoPoolStateProperties__ClosedWithdrawnObligationNotZero(obligation);
                }
                return;
            }

            uint256 balance = IERC20(address(lotto.entryToken())).balanceOf(address(lotto));
            if (obligation != balance) {
                revert LottoPoolStateProperties__ClosedUnwithdrawnObligationMismatch(obligation, balance);
            }
        }
    }
}
