// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BasePaymaster} from "@account-abstraction/contracts/core/BasePaymaster.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {SIG_VALIDATION_SUCCESS} from "@account-abstraction/contracts/core/Helpers.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LottoEntryToken} from "../../Lotto/LottoEntryToken.sol";
import {LottoFactory} from "../../Lotto/LottoFactory.sol";
import {LottoImplementation} from "../../Lotto/LottoImplementation.sol";

interface ILottoFactoryLike {
    function isLottoInstance(address lotto) external view returns (bool);
}

contract LottoPaymaster is BasePaymaster {
    error LottoPaymaster__UnsupportedAccountCall();
    error LottoPaymaster__TargetNotAllowed(address target);
    error LottoPaymaster__SelectorNotAllowed(bytes4 selector);

    bytes4 public constant ACCOUNT_EXECUTE_SELECTOR = bytes4(keccak256("execute(address,uint256,bytes)"));

    address public immutable i_lottoFactory;
    address public immutable i_entryToken;
    mapping(bytes4 selector => bool allowed) public isAllowedFactorySelector;
    mapping(bytes4 selector => bool allowed) public isAllowedLottoSelector;
    mapping(bytes4 selector => bool allowed) public isAllowedEntryTokenSelector;

    event AllowedFactorySelectorUpdated(bytes4 indexed selector, bool allowed);
    event AllowedLottoSelectorUpdated(bytes4 indexed selector, bool allowed);
    event AllowedEntryTokenSelectorUpdated(bytes4 indexed selector, bool allowed);

    constructor(IEntryPoint entryPoint, address owner, address lottoFactory, address entryToken)
        BasePaymaster(entryPoint, owner)
    {
        i_lottoFactory = lottoFactory;
        i_entryToken = entryToken;

        // Default allowlists (one tx on deploy). Owner may still update via set* functions.
        isAllowedFactorySelector[LottoFactory.createLotto.selector] = true;
        isAllowedLottoSelector[LottoImplementation.joinLotto.selector] = true;
        isAllowedLottoSelector[LottoImplementation.requestWinner.selector] = true;
        isAllowedLottoSelector[LottoImplementation.withdrawPrize.selector] = true;
        isAllowedLottoSelector[LottoImplementation.triggerRefundMode.selector] = true;
        isAllowedLottoSelector[LottoImplementation.claimRefund.selector] = true;
        isAllowedEntryTokenSelector[LottoEntryToken.claimTestTokens.selector] = true;
        isAllowedEntryTokenSelector[IERC20.approve.selector] = true;
    }

    function setAllowedFactorySelector(bytes4 selector, bool allowed) external onlyOwner {
        isAllowedFactorySelector[selector] = allowed;
        emit AllowedFactorySelectorUpdated(selector, allowed);
    }

    function setAllowedLottoSelector(bytes4 selector, bool allowed) external onlyOwner {
        isAllowedLottoSelector[selector] = allowed;
        emit AllowedLottoSelectorUpdated(selector, allowed);
    }

    function setAllowedEntryTokenSelector(bytes4 selector, bool allowed) external onlyOwner {
        isAllowedEntryTokenSelector[selector] = allowed;
        emit AllowedEntryTokenSelectorUpdated(selector, allowed);
    }

    function _validatePaymasterUserOp(PackedUserOperation calldata userOp, bytes32, uint256)
        internal
        view
        override
        returns (bytes memory context, uint256 validationData)
    {
        bytes4 accountSelector = _readSelector(userOp.callData);
        if (accountSelector != ACCOUNT_EXECUTE_SELECTOR) {
            revert LottoPaymaster__UnsupportedAccountCall();
        }

        (address dest,, bytes memory functionData) = abi.decode(userOp.callData[4:], (address, uint256, bytes));

        bytes4 innerSelector = _readSelector(functionData);
        if (_isFactoryCall(dest)) {
            if (!isAllowedFactorySelector[innerSelector]) {
                revert LottoPaymaster__SelectorNotAllowed(innerSelector);
            }
        } else if (_isLottoInstanceCall(dest)) {
            if (!isAllowedLottoSelector[innerSelector]) {
                revert LottoPaymaster__SelectorNotAllowed(innerSelector);
            }
        } else if (_isEntryTokenCall(dest)) {
            if (!isAllowedEntryTokenSelector[innerSelector]) {
                revert LottoPaymaster__SelectorNotAllowed(innerSelector);
            }
        } else {
            revert LottoPaymaster__TargetNotAllowed(dest);
        }

        return ("", SIG_VALIDATION_SUCCESS);
    }

    function _isFactoryCall(address dest) private view returns (bool) {
        return dest == i_lottoFactory;
    }

    function _isLottoInstanceCall(address dest) private view returns (bool) {
        if (dest == address(0)) {
            return false;
        }

        return ILottoFactoryLike(i_lottoFactory).isLottoInstance(dest);
    }

    function _isEntryTokenCall(address dest) private view returns (bool) {
        return dest == i_entryToken;
    }

    function _readSelector(bytes memory data) private pure returns (bytes4 selector) {
        if (data.length < 4) {
            return bytes4(0);
        }

        assembly ("memory-safe") {
            selector := mload(add(data, 0x20))
        }
    }
}
