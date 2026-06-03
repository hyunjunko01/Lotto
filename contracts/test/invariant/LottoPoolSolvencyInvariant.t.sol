// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LottoImplementation} from "../../src/Lotto/LottoImplementation.sol";
import {LottoPoolSolvency} from "../helpers/LottoPoolSolvency.sol";
import {LottoPoolStateProperties} from "../helpers/LottoPoolStateProperties.sol";
import {LottoInvariantSetup} from "./LottoInvariantSetup.sol";

/**
 * @title LottoPoolSolvencyInvariant
 * @notice Invariant suite for pool solvency (SECURITY.md I2) and phase obligations.
 * @dev Current scope covers OPEN/FULL/CALCULATING/CLOSED/REFUNDING
 *      via join/request/fulfill/refund/withdraw actions.
 */
contract LottoPoolSolvencyInvariant is LottoInvariantSetup {
    function invariant_poolSolvent() public view {
        uint256 count = handler.lottoCount();
        for (uint256 i = 0; i < count; i++) {
            LottoImplementation lotto = handler.lottoAt(i);
            address[] memory accounts = handler.trackedAccountsFor(i);
            LottoPoolSolvency.assertPoolSolvent(lotto, accounts);
        }
    }

    function invariant_phaseSpecificObligations() public view {
        uint256 count = handler.lottoCount();
        for (uint256 i = 0; i < count; i++) {
            LottoImplementation lotto = handler.lottoAt(i);
            address[] memory accounts = handler.trackedAccountsFor(i);
            LottoPoolStateProperties.assertPhaseSpecificObligations(lotto, accounts);
        }
    }

    // Optional: uncomment after handler exposes more actions
    // function invariant_callSummary() public view {
    //     handler.assertLottoSolvent();
    // }
}
