// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {LottoEntryToken} from "../../src/Lotto/LottoEntryToken.sol";

contract DeployEntryToken is Script {
    function run() external returns (LottoEntryToken entryToken) {
        vm.startBroadcast();
        entryToken = new LottoEntryToken();
        vm.stopBroadcast();
    }
}
