// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {EntryPoint} from "@account-abstraction/contracts/core/EntryPoint.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

contract HelperConfig is Script {
    struct NetworkConfig {
        address vrfCoordinator;
        bytes32 keyHash;
        uint256 subscriptionId;
        uint32 callbackGasLimit;
        address account; // deployer account address
        address entryPoint; // account entry point address
    }

    NetworkConfig public activeNetworkConfig;

    // VRF Mock constants for V2.5
    uint96 constant MOCK_BASE_FEE = 0.1 ether;
    uint96 constant MOCK_GAS_PRICE_LINK = 1e9;
    int256 constant MOCK_WEI_PER_UNIT_LINK = 4e15;

    constructor() {
        if (block.chainid == 11155111) {
            activeNetworkConfig = getSepoliaConfig();
        } else {
            activeNetworkConfig = getOrCreateAnvilConfig();
        }
    }

    // 2. Sepolia (Ethereum Testnet) configuration
    function getSepoliaConfig() public pure returns (NetworkConfig memory) {
        return NetworkConfig({
            vrfCoordinator: 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B,
            keyHash: 0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae,
            subscriptionId: 0, // For actual deployment, input your own subId or create it via script
            callbackGasLimit: 500000,
            account: 0x47E930168F6359550302526Ea0800C3A0b3c8ee6, // example deployer address
            entryPoint: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789 // example entry point address
        });
    }

    // 3. Local Anvil environment configuration (deploy Mock if not present)
    function getOrCreateAnvilConfig() public returns (NetworkConfig memory) {
        // If already configured (Mock deployed), return as is
        if (activeNetworkConfig.vrfCoordinator != address(0)) {
            return activeNetworkConfig;
        }

        // 3-1. Deploy Mock for local environment
        vm.startBroadcast();
        VRFCoordinatorV2_5Mock vrfMock =
            new VRFCoordinatorV2_5Mock(MOCK_BASE_FEE, MOCK_GAS_PRICE_LINK, MOCK_WEI_PER_UNIT_LINK);

        // Subscription creation and funding automation
        uint256 subId = vrfMock.createSubscription();
        vrfMock.fundSubscription(subId, 100 ether);
        EntryPoint entryPoint = new EntryPoint(); // Deploy a new EntryPoint for local testing
        vm.stopBroadcast();

        return NetworkConfig({
            vrfCoordinator: address(vrfMock),
            keyHash: 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c, // arbitrary value
            subscriptionId: subId,
            callbackGasLimit: 500000,
            account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, // Anvil default address
            entryPoint: address(entryPoint) // example entry point address
        });
    }
}
