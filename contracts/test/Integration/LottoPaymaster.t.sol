// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SetupEntryPoint} from "../../script/setup/SetupEntryPoint.s.sol";
import {LottoPaymaster} from "../../src/Account/Ethereum/LottoPaymaster.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {LottoFactoryMock} from "../mock/FactoryMock.sol";
import {LottoImplementationMock} from "../mock/ImplementationMock.sol";
import {EthAccountExecuteShim} from "../mock/EthAccountExecuteShim.sol";

contract LottoEntryTokenMock {
    function claimTestTokens() external {}
    function approve(address, uint256) external pure returns (bool) {
        return true;
    }
}

contract LottoPaymasterTest is Test {
    LottoPaymaster internal paymaster;
    LottoFactoryMock internal lottoFactory;
    LottoImplementationMock internal lottoInstance;
    LottoEntryTokenMock internal entryToken;
    address internal nonLottoTarget = address(0xBEEF);
    address internal entryPoint;

    function setUp() public {
        SetupEntryPoint setupEntryPoint = new SetupEntryPoint();
        entryPoint = setupEntryPoint.deployForTest();

        lottoFactory = new LottoFactoryMock();
        lottoInstance = new LottoImplementationMock();
        entryToken = new LottoEntryTokenMock();
        lottoFactory.setLottoInstance(address(lottoInstance), true);

        paymaster = new LottoPaymaster(IEntryPoint(entryPoint), address(this), address(lottoFactory), address(entryToken));
        paymaster.setAllowedFactorySelector(LottoFactoryMock.createLotto.selector, true);
        paymaster.setAllowedLottoSelector(LottoImplementationMock.joinLotto.selector, true);
        paymaster.setAllowedLottoSelector(LottoImplementationMock.requestWinner.selector, true);
        paymaster.setAllowedLottoSelector(LottoImplementationMock.withdrawPrize.selector, true);
        paymaster.setAllowedLottoSelector(LottoImplementationMock.triggerRefundMode.selector, true);
        paymaster.setAllowedLottoSelector(LottoImplementationMock.claimRefund.selector, true);
        paymaster.setAllowedEntryTokenSelector(LottoEntryTokenMock.claimTestTokens.selector, true);
        paymaster.setAllowedEntryTokenSelector(LottoEntryTokenMock.approve.selector, true);
    }

    function test_validatePaymasterUserOp_acceptsFactoryCreateLotto() external {
        PackedUserOperation memory op = _buildOp(
            address(0x1234),
            abi.encodeWithSelector(
                EthAccountExecuteShim.execute.selector,
                address(lottoFactory),
                0,
                abi.encodeWithSelector(LottoFactoryMock.createLotto.selector, 0.01 ether, 5, address(0xCAFE))
            )
        );

        vm.prank(entryPoint);
        (bytes memory context, uint256 validationData) = paymaster.validatePaymasterUserOp(op, bytes32(0), 0);
        assertEq(context.length, 0);
        assertEq(validationData, 0);
    }

    function test_validatePaymasterUserOp_acceptsLottoInstanceJoinLotto() external {
        PackedUserOperation memory op = _buildOp(
            address(0x1234),
            abi.encodeWithSelector(
                EthAccountExecuteShim.execute.selector,
                address(lottoInstance),
                0.01 ether,
                abi.encodeWithSelector(LottoImplementationMock.joinLotto.selector)
            )
        );

        vm.prank(entryPoint);
        (bytes memory context, uint256 validationData) = paymaster.validatePaymasterUserOp(op, bytes32(0), 0);
        assertEq(context.length, 0);
        assertEq(validationData, 0);
    }

    function test_validatePaymasterUserOp_revertsForNonLottoTarget() external {
        PackedUserOperation memory op = _buildOp(
            address(0x1234),
            abi.encodeWithSelector(
                EthAccountExecuteShim.execute.selector,
                nonLottoTarget,
                0,
                abi.encodeWithSelector(LottoImplementationMock.joinLotto.selector)
            )
        );

        vm.prank(entryPoint);
        vm.expectRevert(
            abi.encodeWithSelector(LottoPaymaster.LottoPaymaster__TargetNotAllowed.selector, nonLottoTarget)
        );
        paymaster.validatePaymasterUserOp(op, bytes32(0), 0);
    }

    function test_validatePaymasterUserOp_revertsForDisallowedLottoSelector() external {
        PackedUserOperation memory op = _buildOp(
            address(0x1234),
            abi.encodeWithSelector(
                EthAccountExecuteShim.execute.selector,
                address(lottoInstance),
                0,
                abi.encodeWithSelector(bytes4(keccak256("notAllowed()")))
            )
        );

        vm.prank(entryPoint);
        vm.expectRevert(
            abi.encodeWithSelector(
                LottoPaymaster.LottoPaymaster__SelectorNotAllowed.selector, bytes4(keccak256("notAllowed()"))
            )
        );
        paymaster.validatePaymasterUserOp(op, bytes32(0), 0);
    }

    function test_validatePaymasterUserOp_acceptsEntryTokenFaucetClaim() external {
        PackedUserOperation memory op = _buildOp(
            address(0x1234),
            abi.encodeWithSelector(
                EthAccountExecuteShim.execute.selector,
                address(entryToken),
                0,
                abi.encodeWithSelector(LottoEntryTokenMock.claimTestTokens.selector)
            )
        );

        vm.prank(entryPoint);
        (bytes memory context, uint256 validationData) = paymaster.validatePaymasterUserOp(op, bytes32(0), 0);
        assertEq(context.length, 0);
        assertEq(validationData, 0);
    }

    function test_validatePaymasterUserOp_acceptsEntryTokenApprove() external {
        PackedUserOperation memory op = _buildOp(
            address(0x1234),
            abi.encodeWithSelector(
                EthAccountExecuteShim.execute.selector,
                address(entryToken),
                0,
                abi.encodeWithSelector(LottoEntryTokenMock.approve.selector, address(lottoInstance), 0.01 ether)
            )
        );

        vm.prank(entryPoint);
        (bytes memory context, uint256 validationData) = paymaster.validatePaymasterUserOp(op, bytes32(0), 0);
        assertEq(context.length, 0);
        assertEq(validationData, 0);
    }

    function test_validatePaymasterUserOp_acceptsLottoTriggerRefundMode() external {
        PackedUserOperation memory op = _buildOp(
            address(0x1234),
            abi.encodeWithSelector(
                EthAccountExecuteShim.execute.selector,
                address(lottoInstance),
                0,
                abi.encodeWithSelector(LottoImplementationMock.triggerRefundMode.selector)
            )
        );

        vm.prank(entryPoint);
        (bytes memory context, uint256 validationData) = paymaster.validatePaymasterUserOp(op, bytes32(0), 0);
        assertEq(context.length, 0);
        assertEq(validationData, 0);
    }

    function test_validatePaymasterUserOp_acceptsLottoClaimRefund() external {
        PackedUserOperation memory op = _buildOp(
            address(0x1234),
            abi.encodeWithSelector(
                EthAccountExecuteShim.execute.selector,
                address(lottoInstance),
                0,
                abi.encodeWithSelector(LottoImplementationMock.claimRefund.selector)
            )
        );

        vm.prank(entryPoint);
        (bytes memory context, uint256 validationData) = paymaster.validatePaymasterUserOp(op, bytes32(0), 0);
        assertEq(context.length, 0);
        assertEq(validationData, 0);
    }

    function test_validatePaymasterUserOp_revertsWhenNotUsingExecute() external {
        PackedUserOperation memory op =
            _buildOp(address(0x1234), abi.encodeWithSelector(LottoImplementationMock.joinLotto.selector));

        vm.prank(entryPoint);
        vm.expectRevert(LottoPaymaster.LottoPaymaster__UnsupportedAccountCall.selector);
        paymaster.validatePaymasterUserOp(op, bytes32(0), 0);
    }

    function _buildOp(address sender, bytes memory callData) private pure returns (PackedUserOperation memory) {
        return PackedUserOperation({
            sender: sender,
            nonce: 0,
            initCode: "",
            callData: callData,
            accountGasLimits: bytes32(abi.encodePacked(uint128(100000), uint128(100000))),
            preVerificationGas: 50000,
            gasFees: bytes32(abi.encodePacked(uint128(1 gwei), uint128(1 gwei))),
            paymasterAndData: "",
            signature: ""
        });
    }
}
