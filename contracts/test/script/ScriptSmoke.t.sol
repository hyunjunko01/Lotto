// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {HelperConfig} from "../../script/config/HelperConfig.s.sol";
import {SetupEntryPoint} from "../../script/setup/SetupEntryPoint.s.sol";
import {SetupVrf} from "../../script/setup/SetupVrf.s.sol";

contract ScriptSmokeTest is Test {
    function test_setupEntryPoint_deployForTestCreatesContract() external {
        SetupEntryPoint setupEntryPoint = new SetupEntryPoint();

        address entryPoint = setupEntryPoint.deployForTest();

        assertTrue(entryPoint != address(0));
        assertGt(entryPoint.code.length, 0);
    }

    function test_setupVrf_deployForTestCreatesContract() external {
        SetupVrf setupVrf = new SetupVrf();

        address coordinator = setupVrf.deployForTest();

        assertTrue(coordinator != address(0));
        assertGt(coordinator.code.length, 0);
    }

    function test_helperConfig_loadsEnvValues() external {
        vm.setEnv("ANVIL_VRF_COORDINATOR", "0x1234567890123456789012345678901234567890");
        vm.setEnv("ANVIL_SUBSCRIPTION_ID", "7");
        vm.setEnv("ANVIL_ENTRY_POINT", "0x1111111111111111111111111111111111111111");

        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        assertEq(config.vrfCoordinator, address(0x1234567890123456789012345678901234567890));
        assertEq(config.subscriptionId, 7);
        assertEq(config.entryPoint, address(0x1111111111111111111111111111111111111111));
        assertEq(config.callbackGasLimit, 500000);
    }

    function test_helperConfig_revertsOnNonAnvilChain() external {
        vm.chainId(1);

        vm.expectRevert(HelperConfig.HelperConfig__OnlyAnvilSupported.selector);
        new HelperConfig();
    }
}
