// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {EthAccount} from "./EthAccount.sol";
import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";

/**
 * @title AccountFactory
 * @dev Factory contract for creating Ethereum abstract accounts
 * @author HyunJun Ko
 */

contract AccountFactory {
    address public immutable i_entrypoint;

    constructor(address entrypoint) {
        i_entrypoint = entrypoint;
    }

    /**
     * @dev Creates a new EthAccount for the specified owner using CREATE2 for deterministic address generation.
     * @param owner The address of the account owner.
     * @param salt A unique salt value to ensure unique account addresses.
     * @return EthAccount newly created EthAccount instance.
     */
    function createAccount(address owner, uint256 salt) external returns (EthAccount) {
        address addr = getAddress(owner, salt);
        uint256 codeSize = addr.code.length;

        // If the account already exists, return the existing instance
        if (codeSize > 0) {
            return EthAccount(payable(addr));
        }

        return new EthAccount{salt: bytes32(salt)}(i_entrypoint, owner);
    }

    /**
     * @dev Computes the address of an EthAccount for the specified owner and salt in off-chain (front-end).
     * @param owner The address of the account owner.
     * @param salt A unique salt value to ensure unique account addresses.
     * @return address The computed address of the EthAccount.
     */
    function getAddress(address owner, uint256 salt) public view returns (address) {
        return Create2.computeAddress(
            bytes32(salt), keccak256(abi.encodePacked(type(EthAccount).creationCode, abi.encode(i_entrypoint, owner)))
        );
    }
}
