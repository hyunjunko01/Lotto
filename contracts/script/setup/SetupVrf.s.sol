// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

contract SetupVrf is Script {
    uint96 constant MOCK_BASE_FEE = 0.1 ether;
    uint96 constant MOCK_GAS_PRICE_LINK = 1e9;
    int256 constant MOCK_WEI_PER_UNIT_LINK = 4e15;

    function deployForTest() external returns (address coordinator) {
        VRFCoordinatorV2_5Mock vrf =
            new VRFCoordinatorV2_5Mock(MOCK_BASE_FEE, MOCK_GAS_PRICE_LINK, MOCK_WEI_PER_UNIT_LINK);
        return address(vrf);
    }

    function run() external returns (address coordinator, uint256 subscriptionId) {
        vm.startBroadcast();
        VRFCoordinatorV2_5Mock vrf =
            new VRFCoordinatorV2_5Mock(MOCK_BASE_FEE, MOCK_GAS_PRICE_LINK, MOCK_WEI_PER_UNIT_LINK);
        subscriptionId = vrf.createSubscription();
        vm.stopBroadcast();

        return (address(vrf), subscriptionId);
    }
}
