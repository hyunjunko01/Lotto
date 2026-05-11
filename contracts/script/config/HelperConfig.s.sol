// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";

contract HelperConfig is Script {
    // --- error ---
    error HelperConfig__UnsupportedChain(uint256 chainId);
    error HelperConfig__MissingAnvilVrfEnv();
    error HelperConfig__MissingAnvilEntryPointEnv();
    error HelperConfig__MissingSepoliaVrfEnv();
    error HelperConfig__MissingSepoliaPrivateKeyEnv();

    struct NetworkConfig {
        address vrfCoordinator;
        bytes32 keyHash;
        uint256 subscriptionId;
        uint32 callbackGasLimit;
        bool useNativePayment;
        address account;
        address entryPoint;
    }

    NetworkConfig public activeNetworkConfig;

    uint96 constant MOCK_BASE_FEE = 0.1 ether;
    uint96 constant MOCK_GAS_PRICE_LINK = 1e9;
    int256 constant MOCK_WEI_PER_UNIT_LINK = 4e15;

    // address constant FOUNDRY_DEFAULT_WALLET = 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38;
    address constant ANVIL_DEFAULT_ACCOUNT = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address constant SEPOLIA_ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;

    constructor() {
        if (block.chainid == 31337) {
            activeNetworkConfig = getOrCreateAnvilConfig();
        } else if (block.chainid == 11155111) {
            activeNetworkConfig = getSepoliaConfig();
        } else {
            revert HelperConfig__UnsupportedChain(block.chainid);
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
            address entryPoint = vm.envOr("ANVIL_ENTRY_POINT", address(0));
            if (entryPoint == address(0)) {
                revert HelperConfig__MissingAnvilEntryPointEnv();
            }

            return NetworkConfig({
                vrfCoordinator: envCoordinator,
                keyHash: 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c,
                subscriptionId: envSubId,
                callbackGasLimit: 500000,
                useNativePayment: false,
                account: ANVIL_DEFAULT_ACCOUNT,
                entryPoint: entryPoint
            });
        } else {
            revert HelperConfig__MissingAnvilVrfEnv();
        }
    }

    function getSepoliaConfig() public view returns (NetworkConfig memory) {
        address coordinator = vm.envOr("SEPOLIA_VRF_COORDINATOR", address(0));
        bytes32 keyHash = vm.envOr("SEPOLIA_VRF_KEYHASH", bytes32(0));
        uint256 subscriptionId = vm.envOr("SEPOLIA_SUBSCRIPTION_ID", uint256(0));
        uint32 callbackGasLimit = uint32(vm.envOr("SEPOLIA_CALLBACK_GAS_LIMIT", uint256(500000)));
        uint256 deployerPrivateKey = vm.envOr("SEPOLIA_PRIVATE_KEY", uint256(0));

        if (coordinator == address(0) || keyHash == bytes32(0) || subscriptionId == 0) {
            revert HelperConfig__MissingSepoliaVrfEnv();
        }
        if (deployerPrivateKey == 0) {
            revert HelperConfig__MissingSepoliaPrivateKeyEnv();
        }

        return NetworkConfig({
            vrfCoordinator: coordinator,
            keyHash: keyHash,
            subscriptionId: subscriptionId,
            callbackGasLimit: callbackGasLimit,
            useNativePayment: false,
            account: vm.addr(deployerPrivateKey),
            entryPoint: SEPOLIA_ENTRY_POINT
        });
    }
}

