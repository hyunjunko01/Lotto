// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {IEthAccount} from "./Interface/IEthAccount.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

/**
 * @title AccountFactory
 * @dev Factory contract for creating Ethereum abstract accounts
 * @author HyunJun Ko
 */

contract AccountFactory {
    address public immutable i_accountImplementation;

    constructor(address accountImplementation) {
        i_accountImplementation = accountImplementation;
    }

    /**
     * @dev Creates a new EthAccount for the specified owner using the minimal proxy pattern (EIP-1167).
     * @param owner The address of the account owner.
     * @param salt A unique salt value to ensure unique account addresses.
     * @return address The address of the newly created EthAccount proxy instance.
     */
    function createAccount(address owner, uint256 salt) external returns (address) {
        bytes32 finalSalt = keccak256(abi.encode(owner, salt));
        address addr = Clones.predictDeterministicAddress(i_accountImplementation, finalSalt, address(this));
        uint256 codeSize = addr.code.length;

        // If the account already exists, return the existing instance
        if (codeSize > 0) return addr;

        address clone = Clones.cloneDeterministic(i_accountImplementation, finalSalt);
        IEthAccount(clone).initialize(owner);
        return clone;
    }

    /**
     * @dev Computes the address of an EthAccount for the specified owner and salt in off-chain (front-end).
     * @dev This function can be used to predict the address of an EthAccount before it is created, allowing users to interact with the account even before deployment.
     * @param owner The address of the account owner.
     * @param salt A unique salt value to ensure unique account addresses.
     * @return address The computed address of the EthAccount.
     */
    function getAddress(address owner, uint256 salt) public view returns (address) {
        bytes32 finalSalt = keccak256(abi.encode(owner, salt));
        return Clones.predictDeterministicAddress(i_accountImplementation, finalSalt, address(this));
    }
}
