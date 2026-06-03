// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LottoImplementation} from "../../src/Lotto/LottoImplementation.sol";
import {LottoNoDoublePayout} from "../helpers/LottoNoDoublePayout.sol";
import {LottoInvariantSetup} from "./LottoInvariantSetup.sol";

/**
 * @title LottoNoDoublePayoutInvariant
 * @notice Invariant suite for payout exclusivity (SECURITY.md I1).
 * @dev Prize (`withdrawPrize`) vs refund (`claimRefund`) paths must not both settle the pool.
 */
contract LottoNoDoublePayoutInvariant is LottoInvariantSetup {
    function invariant_noDoublePayout() public view {
        uint256 count = handler.lottoCount();
        for (uint256 i = 0; i < count; i++) {
            LottoImplementation lotto = handler.lottoAt(i);
            address[] memory accounts = handler.trackedAccountsFor(i);
            LottoNoDoublePayout.assertSettlementPathsExclusive(lotto, accounts);
            _assertAccountsNotSettledTwice(i, accounts);
        }
    }

    function _assertAccountsNotSettledTwice(uint256 lottoIndex, address[] memory accounts) internal view {
        uint256 len = accounts.length;
        bool[] memory settledByRefund = new bool[](len);
        bool[] memory settledByPrize = new bool[](len);
        for (uint256 j = 0; j < len; j++) {
            (settledByRefund[j], settledByPrize[j]) = handler.settlementFlagsFor(lottoIndex, accounts[j]);
        }
        LottoNoDoublePayout.assertAccountsNotSettledTwice(accounts, settledByRefund, settledByPrize);
    }
}
