// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {HelperConfig} from "../config/HelperConfig.s.sol";
import {LottoPaymaster} from "../../src/Account/Ethereum/LottoPaymaster.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {LottoFactory} from "../../src/Lotto/LottoFactory.sol";
import {LottoImplementation} from "../../src/Lotto/LottoImplementation.sol";
import {LottoEntryToken} from "../../src/Lotto/LottoEntryToken.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployPaymaster is Script {
    function run() external returns (LottoPaymaster paymaster, HelperConfig helperConfig) {
        helperConfig = new HelperConfig();
        (,,,,, address broadcaster, address entryPoint) = helperConfig.activeNetworkConfig();
        address lottoFactory = _lottoFactoryByChain();
        address entryToken = _entryTokenByChain();

        vm.startBroadcast(broadcaster);
        paymaster = new LottoPaymaster(IEntryPoint(entryPoint), broadcaster, lottoFactory, entryToken);
        paymaster.setAllowedFactorySelector(LottoFactory.createLotto.selector, true);
        paymaster.setAllowedLottoSelector(LottoImplementation.joinLotto.selector, true);
        paymaster.setAllowedLottoSelector(LottoImplementation.requestWinner.selector, true);
        paymaster.setAllowedLottoSelector(LottoImplementation.withdrawPrize.selector, true);
        paymaster.setAllowedLottoSelector(LottoImplementation.triggerRefundMode.selector, true);
        paymaster.setAllowedLottoSelector(LottoImplementation.claimRefund.selector, true);
        paymaster.setAllowedEntryTokenSelector(LottoEntryToken.claimTestTokens.selector, true);
        paymaster.setAllowedEntryTokenSelector(IERC20.approve.selector, true);
        vm.stopBroadcast();

        return (paymaster, helperConfig);
    }

    function _lottoFactoryByChain() private view returns (address) {
        if (block.chainid == 31337) {
            return vm.envAddress("ANVIL_LOTTO_FACTORY");
        }
        if (block.chainid == 11155111) {
            return vm.envAddress("SEPOLIA_LOTTO_FACTORY");
        }
        if (block.chainid == 84532) {
            return vm.envAddress("BASE_SEPOLIA_LOTTO_FACTORY");
        }
        revert("Unsupported chain for lotto factory env");
    }

    function _entryTokenByChain() private view returns (address) {
        if (block.chainid == 31337) {
            return vm.envAddress("ANVIL_ENTRY_TOKEN");
        }
        if (block.chainid == 11155111) {
            return vm.envAddress("SEPOLIA_ENTRY_TOKEN");
        }
        if (block.chainid == 84532) {
            return vm.envAddress("BASE_SEPOLIA_ENTRY_TOKEN");
        }
        revert("Unsupported chain for entry token env");
    }
}
