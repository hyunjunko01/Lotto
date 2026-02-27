// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {AccountFactory} from "../../src/Account/Ethereum/AccountFactory.sol";
import {EthAccount} from "../../src/Account/Ethereum/EthAccount.sol";
import {EntryPoint} from "@account-abstraction/contracts/core/EntryPoint.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract EthAccountIntegrationTest is Test {
    using MessageHashUtils for bytes32;

    EntryPoint entryPoint;
    AccountFactory factory;
    EthAccount implementation;

    address owner;
    uint256 ownerKey;
    uint256 constant SALT = 4337;

    function setUp() public {
        (owner, ownerKey) = makeAddrAndKey("owner");
        entryPoint = new EntryPoint();
        implementation = new EthAccount(address(entryPoint));
        factory = new AccountFactory(address(implementation));

        // Fund the owner with some ether to cover gas fees for account creation and transactions
        vm.deal(owner, 10 ether);
    }

    /**
     * @dev Integration test: Deploy account via factory and execute a transaction in one go using EntryPoint.handleOps
     */
    function test_DeployAndExecuteInOneGo() public {
        address expectedAddr = factory.getAddress(owner, SALT);
        address recipient = makeAddr("recipient");
        uint256 sendAmount = 1 ether;

        // 1. Check that the account does not exist yet (code length should be 0)
        assertEq(expectedAddr.code.length, 0, "Account should not exist yet");

        // 2. Fund the expected account address to cover deployment and execution costs.
        vm.deal(expectedAddr, 2 ether);

        // 3. Create UserOperation
        // initCode = Factory address + callData to createAccount (owner, SALT)
        bytes memory initCode =
            abi.encodePacked(address(factory), abi.encodeWithSelector(factory.createAccount.selector, owner, SALT));

        // callData = function callData that transfer ether to recipient
        bytes memory callData = abi.encodeWithSelector(EthAccount.execute.selector, recipient, sendAmount, "");

        PackedUserOperation memory userOp = _buildUserOp(expectedAddr, initCode, callData);

        // 4. Create a valid UserOperation signed by the owner
        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);
        userOp.signature = _signUserOp(userOpHash, ownerKey);

        // 5. Execute whole flow
        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = userOp;

        // set the address of the beneficiary and the bundler.
        address beneficiary = makeAddr("beneficiary");
        address bundler = makeAddr("bundler");

        vm.deal(bundler, 1 ether);
        vm.prank(bundler, bundler);
        entryPoint.handleOps(ops, payable(beneficiary));

        // 6. check results
        assertEq(expectedAddr.code.length > 0, true, "Account should be deployed");
        assertEq(recipient.balance, sendAmount, "Recipient should receive funds");
        assertEq(EthAccount(payable(expectedAddr)).owner(), owner, "Owner should be set correctly");
    }

    // --- Helper Functions ---

    function _buildUserOp(address sender, bytes memory initCode, bytes memory callData)
        internal
        pure
        returns (PackedUserOperation memory)
    {
        return PackedUserOperation({
            sender: sender,
            nonce: 0,
            initCode: initCode,
            callData: callData,
            accountGasLimits: bytes32(abi.encodePacked(uint128(2e6), uint128(2e6))),
            preVerificationGas: 1e6,
            gasFees: bytes32(abi.encodePacked(uint128(10 gwei), uint128(10 gwei))),
            paymasterAndData: "",
            signature: ""
        });
    }

    function _signUserOp(bytes32 userOpHash, uint256 privateKey) internal pure returns (bytes memory) {
        bytes32 ethHash = userOpHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, ethHash);
        return abi.encodePacked(r, s, v);
    }
}
