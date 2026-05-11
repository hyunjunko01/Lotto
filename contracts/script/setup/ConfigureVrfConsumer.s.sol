// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {HelperConfig} from "../config/HelperConfig.s.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";

contract ConfigureVrfConsumer is Script {
    error ConfigureVrfConsumer__MissingLottoFactoryEnv(uint256 chainId);

    function run() external returns (address lottoFactory, HelperConfig helperConfig) {
        helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory networkConfig = helperConfig.getConfig();
        lottoFactory = _lottoFactoryByChain();

        vm.startBroadcast(networkConfig.account);
        IVRFCoordinatorV2Plus(networkConfig.vrfCoordinator).addConsumer(networkConfig.subscriptionId, lottoFactory);
        vm.stopBroadcast();

        return (lottoFactory, helperConfig);
    }

    function _lottoFactoryByChain() private view returns (address) {
        if (block.chainid == 31337) {
            return vm.envAddress("ANVIL_LOTTO_FACTORY");
        }
        if (block.chainid == 11155111) {
            return vm.envAddress("SEPOLIA_LOTTO_FACTORY");
        }
        revert ConfigureVrfConsumer__MissingLottoFactoryEnv(block.chainid);
    }
}
