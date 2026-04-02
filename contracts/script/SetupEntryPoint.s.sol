// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {EntryPoint} from "@account-abstraction/contracts/core/EntryPoint.sol";

contract SetupEntryPoint is Script {
    function run() external returns (address entryPoint) {
        vm.startBroadcast();
        EntryPoint deployedEntryPoint = new EntryPoint();
        vm.stopBroadcast();

        return address(deployedEntryPoint);
    }
}
