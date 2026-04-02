// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {HelperConfig} from "../config/HelperConfig.s.sol";
import {LottoFactory} from "../../src/Lotto/LottoFactory.sol";
import {LottoImplementation} from "../../src/Lotto/LottoImplementation.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";

contract DeployLotto is Script {
    function run() external returns (LottoFactory, HelperConfig) {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory networkConfig = helperConfig.getConfig();

        vm.startBroadcast();
        LottoImplementation lottoImplementation = new LottoImplementation();
        LottoFactory lottoFactory = new LottoFactory(
            address(lottoImplementation),
            networkConfig.vrfCoordinator,
            networkConfig.subscriptionId,
            networkConfig.keyHash,
            networkConfig.callbackGasLimit
        );
        vm.stopBroadcast();

        vm.startBroadcast();
        IVRFCoordinatorV2Plus(networkConfig.vrfCoordinator).fundSubscriptionWithNative{value: 1 ether}(
            networkConfig.subscriptionId
        );
        vm.stopBroadcast();

        vm.startBroadcast();
        IVRFCoordinatorV2Plus(networkConfig.vrfCoordinator)
            .addConsumer(networkConfig.subscriptionId, address(lottoFactory));
        vm.stopBroadcast();

        return (lottoFactory, helperConfig);
    }
}

