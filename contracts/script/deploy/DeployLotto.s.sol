// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {HelperConfig} from "../config/HelperConfig.s.sol";
import {LottoFactory} from "../../src/Lotto/LottoFactory.sol";
import {LottoImplementation} from "../../src/Lotto/LottoImplementation.sol";

contract DeployLotto is Script {
    function run() external returns (LottoFactory, HelperConfig) {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory networkConfig = helperConfig.getConfig();

        vm.startBroadcast(networkConfig.account);
        LottoImplementation lottoImplementation = new LottoImplementation();
        LottoFactory lottoFactory = new LottoFactory(
            address(lottoImplementation),
            networkConfig.vrfCoordinator,
            networkConfig.subscriptionId,
            networkConfig.keyHash,
            networkConfig.callbackGasLimit,
            networkConfig.useNativePayment
        );
        vm.stopBroadcast();

        return (lottoFactory, helperConfig);
    }
}

