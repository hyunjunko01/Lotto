// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {HelperConfig} from "./HelperConfig.s.sol";
import {LottoFactory} from "../src/Lotto/Factory.sol";
import {LottoImplementation} from "../src/Lotto/Implementation.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";

contract DeployLotto is Script {
    function run() external returns (LottoFactory, HelperConfig) {
        HelperConfig helperConfig = new HelperConfig();

        (address vrfCoordinator, bytes32 keyHash, uint256 subscriptionId, uint32 callbackGasLimit, address account) =
            helperConfig.activeNetworkConfig();

        vm.startBroadcast(account);

        LottoImplementation lottoImplementation = new LottoImplementation();

        LottoFactory lottoFactory =
            new LottoFactory(address(lottoImplementation), vrfCoordinator, subscriptionId, keyHash, callbackGasLimit);

        IVRFCoordinatorV2Plus(vrfCoordinator).addConsumer(subscriptionId, address(lottoFactory));
        vm.stopBroadcast();

        return (lottoFactory, helperConfig);
    }
}
