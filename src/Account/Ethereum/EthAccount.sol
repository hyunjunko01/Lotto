// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IAccount} from "@account-abstraction/contracts/interfaces/IAccount.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {SIG_VALIDATION_FAILED, SIG_VALIDATION_SUCCESS} from "@account-abstraction/contracts/core/Helpers.sol";

/**
 * @title EthAccount
 * @dev A simple implementation of an Ethereum abstract account that is ownable
 * @author HyunJun Ko
 */

contract EthAccount is IAccount, Initializable, Ownable {
    error EthAccount__NotFromEntryPointOrOwner();
    error EthAccount__CallFailed(bytes);

    IEntryPoint private immutable i_entryPoint;

    modifier requireFromEntryPointOrOwner() {
        if (msg.sender != address(i_entryPoint) && msg.sender != owner()) {
            revert EthAccount__NotFromEntryPointOrOwner();
        }
        _;
    }

    // --- constructor ---

    /**
     * @dev Initializes the EthAccount with the specified entry point and sets the initial owner.
     * @dev The owner will be changed to the caller of the initialize function.
     * @param entryPoint The address of the entry point contract that will interact with this account
     */
    constructor(address entryPoint) Ownable(msg.sender) {
        i_entryPoint = IEntryPoint(entryPoint); // set in bytecode
        _disableInitializers(); // Prevent the implementation contract from being initialized directly
    }

    // --- external functions ---

    // Allow the contract to receive ether
    receive() external payable {}

    /**
     * @dev Initializes the EthAccount with the specified owner.
     * @param owner The address of the owner of this account
     */
    function initialize(address owner) external initializer {
        _transferOwnership(owner);
    }

    function execute(address dest, uint256 value, bytes calldata functionData) external requireFromEntryPointOrOwner {
        (bool success, bytes memory result) = dest.call{value: value}(functionData);
        if (!success) {
            revert EthAccount__CallFailed(result);
        }
    }

    /**
     * @dev Validates a user operation by checking its signature and paying any missing account funds.
     * @param userOp The packed user operation to validate.
     * @param userOpHash The hash of the user operation.
     * @param missingAccountFunds The amount of funds missing from the account to cover the operation
     * @return validationData A uint256 indicating the result of the validation.
     */
    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
        external
        override
        requireFromEntryPointOrOwner
        returns (uint256 validationData)
    {
        validationData = _validateSignature(userOp, userOpHash);
        _payPrefund(missingAccountFunds);
    }

    /**
     * @dev Validates the signature of a user operation by recovering the signer address and comparing it to the owner.
     */
    function _validateSignature(PackedUserOperation calldata userOp, bytes32 userOpHash)
        internal
        view
        returns (uint256 validationData)
    {
        // change the format to fit the ECDSA recover function
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        // recover the signer address
        address signer = ECDSA.recover(ethSignedMessageHash, userOp.signature);
        // if the signer is not the owner, return failure
        if (signer != owner()) {
            return SIG_VALIDATION_FAILED;
        } else {
            return SIG_VALIDATION_SUCCESS;
        }
    }

    /**
     * @dev Pays the missing account funds to the entry point. (it is like a gas fee reimbursement)
     * @param missingAccountFunds The amount of funds missing from the account to cover the operation
     */
    function _payPrefund(uint256 missingAccountFunds) internal {
        if (missingAccountFunds != 0) {
            (bool success,) = payable(msg.sender).call{value: missingAccountFunds, gas: type(uint256).max}("");
            (success);
        }
    }
}
