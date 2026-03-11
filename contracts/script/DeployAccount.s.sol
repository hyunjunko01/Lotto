// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {HelperConfig} from "./HelperConfig.s.sol";
import {EthAccount} from "../src/Account/Ethereum/EthAccount.sol";
import {AccountFactory} from "../src/Account/Ethereum/AccountFactory.sol";

contract DeployAccount is Script {
    function run() external {}

    function deployAccount() external returns (AccountFactory, HelperConfig) {
        HelperConfig helperConfig = new HelperConfig();
        (,,,, address account, address entryPoint) = helperConfig.activeNetworkConfig();

        vm.startBroadcast(account);
        EthAccount ethAccount = new EthAccount(entryPoint);
        AccountFactory accountFactory = new AccountFactory(address(ethAccount));
        vm.stopBroadcast();

        return (accountFactory, helperConfig);
    }
}
