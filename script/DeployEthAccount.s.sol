// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {HelperConfig} from "./HelperConfig.s.sol";
import {EthAccount} from "../src/Account/Ethereum/EthAccount.sol";

/**
 * @title DeployEthAccount
 * @dev A script to deploy the EthAccount contract.
 */

contract DeployEthAccount is Script {
    function run() public {}

    function deployEthAccount() public returns (HelperConfig, EthAccount) {
        HelperConfig helperConfig = new HelperConfig();
        (,,,, address account, address entryPoint) = helperConfig.activeNetworkConfig();
        EthAccount ethAccount = new EthAccount(entryPoint);
        ethAccount.transferOwnership(account);
        return (helperConfig, ethAccount);
    }
}
