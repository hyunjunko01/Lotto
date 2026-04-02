// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {EntryPoint} from "@account-abstraction/contracts/core/EntryPoint.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

contract HelperConfig is Script {
    // --- error ---
    error HelperConfig__OnlyAnvilSupported();
    error HelperConfig__MissingAnvilVrfEnv();

    struct NetworkConfig {
        address vrfCoordinator;
        bytes32 keyHash;
        uint256 subscriptionId;
        uint32 callbackGasLimit;
        address account;
        address entryPoint;
    }

    NetworkConfig public activeNetworkConfig;

    uint96 constant MOCK_BASE_FEE = 0.1 ether;
    uint96 constant MOCK_GAS_PRICE_LINK = 1e9;
    int256 constant MOCK_WEI_PER_UNIT_LINK = 4e15;

    // address constant FOUNDRY_DEFAULT_WALLET = 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38;
    address constant ANVIL_DEFAULT_ACCOUNT = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    constructor() {
        if (block.chainid == 31337) {
            activeNetworkConfig = getOrCreateAnvilConfig();
        } else {
            revert HelperConfig__OnlyAnvilSupported();
        }
    }

    // In solidity, getters for public structs return tuples, so we create a helper function to return the entire struct
    function getConfig() public view returns (NetworkConfig memory) {
        return activeNetworkConfig;
    }

    function getOrCreateAnvilConfig() public view returns (NetworkConfig memory) {
        // If already configured, return the existing one
        if (activeNetworkConfig.vrfCoordinator != address(0)) {
            return activeNetworkConfig;
        }

        // Prefer a pre-created subscription from env when broadcasting.
        // This avoids subId mismatch caused by createSubscription() depending on blockhash.
        address envCoordinator = vm.envOr("ANVIL_VRF_COORDINATOR", address(0));
        uint256 envSubId = vm.envOr("ANVIL_SUBSCRIPTION_ID", uint256(0));
        if (envCoordinator != address(0) && envSubId != 0) {
            return NetworkConfig({
                vrfCoordinator: envCoordinator,
                keyHash: 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c,
                subscriptionId: envSubId,
                callbackGasLimit: 500000,
                account: ANVIL_DEFAULT_ACCOUNT,
                entryPoint: address(0)
            });
        } else {
            revert HelperConfig__MissingAnvilVrfEnv();
        }
    }
}

