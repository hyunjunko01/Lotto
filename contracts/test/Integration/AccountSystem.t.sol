// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {HelperConfig} from "../../script/HelperConfig.s.sol";
import {DeployAccount} from "../../script/DeployAccount.s.sol";
import {EthAccount, IEntryPoint} from "../../src/Account/Ethereum/EthAccount.sol";
import {AccountFactory} from "../../src/Account/Ethereum/AccountFactory.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {SIG_VALIDATION_FAILED, SIG_VALIDATION_SUCCESS} from "@account-abstraction/contracts/core/Helpers.sol";

contract AccountSystemTest is Test {
    using MessageHashUtils for bytes32;

    HelperConfig config;
    DeployAccount deployAccount;
    AccountFactory factory;

    ERC20Mock usdc;

    address user;
    uint256 userPrivateKey;
    address entryPoint;
    address fakeEntryPoint = address(0x1234); // For testing non-entry point calls

    uint256 constant AMOUNT = 1e18;
    uint256 constant SALT = 1;

    function setUp() public {
        (user, userPrivateKey) = makeAddrAndKey("user");
        deployAccount = new DeployAccount();
        (factory, config) = deployAccount.deployAccount();
        usdc = new ERC20Mock();

        HelperConfig.NetworkConfig memory networkConfig = config.getConfig();
        entryPoint = networkConfig.entryPoint;
    }

    // --- Account Factory Tests ---

    function test_createAccount_createNewAccount() external {
        address account = factory.createAccount(user, SALT);
        assertEq(factory.getAddress(user, SALT), account);
    }

    function test_createAccount_returnExistingAccount() external {
        address account1 = factory.createAccount(user, SALT);
        address account2 = factory.createAccount(user, SALT);
        assertEq(account1, account2);
    }

    // EthAccount Tests
    // initialize function tests

    function test_initialize_setOwner() external {
        address accountAddr = factory.createAccount(user, SALT);
        EthAccount account = EthAccount(payable(accountAddr));

        assertEq(account.owner(), user);
    }

    function test_initialize_CannotInitializeTwice() external {
        address accountAddr = factory.createAccount(user, SALT);
        EthAccount account = EthAccount(payable(accountAddr));

        vm.expectRevert(); // Initializable: contract is already initialized
        account.initialize(address(0xdead));
    }

    // --- execute function tests ---

    // Situation 1: Transaction occur without going through entryPoint.
    function test_execute_OwnerCanExecuteCommands() public {
        address accountAddr = factory.createAccount(user, SALT);
        EthAccount account = EthAccount(payable(accountAddr));

        // request that the owner mints some USDC to the account
        // Arrange
        assertEq(usdc.balanceOf(address(account)), 0);
        address dest = address(usdc);
        uint256 value = 0;
        bytes memory functionData = abi.encodeWithSelector(ERC20Mock.mint.selector, address(account), AMOUNT);
        // Act
        vm.prank(user);
        account.execute(dest, value, functionData);
        // Assert
        assertEq(usdc.balanceOf(address(account)), AMOUNT);
    }

    // Situation 2: Transaction occur through entryPoint.
    function test_execute_EntryPointCanExecuteCommands() public {
        address accountAddr = factory.createAccount(user, SALT);
        EthAccount account = EthAccount(payable(accountAddr));

        // request that the entry point mints some USDC to the account
        // Arrange
        assertEq(usdc.balanceOf(address(account)), 0);

        // Fund the account with some ether to pay for gas fees
        // In situation 1, the owner pays for the gas fees
        // But in situation 2, the bundler pays for the gas fees, so we have to pay bundler back.
        vm.deal(address(account), 1 ether);
        address dest = address(usdc);
        uint256 value = 0;
        bytes memory functionData = abi.encodeWithSelector(ERC20Mock.mint.selector, address(account), AMOUNT);
        bytes memory executeCallData = abi.encodeWithSelector(EthAccount.execute.selector, dest, value, functionData);

        PackedUserOperation memory userOp = _buildUserOp(address(account), "", executeCallData);

        // 4. Create a valid UserOperation signed by the owner
        bytes32 userOpHash = IEntryPoint(entryPoint).getUserOpHash(userOp);
        userOp.signature = _signUserOp(userOpHash, userPrivateKey);

        // 5. Execute whole flow
        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = userOp;

        // set the address of the beneficiary and the bundler.
        address beneficiary = makeAddr("beneficiary");
        address bundler = makeAddr("bundler");

        vm.deal(bundler, 1 ether);
        // We have to set tx.origin to the bundler.
        // Because EntryPoint.handleOps checks that msg.sender == tx.origin to prevent other contracts from interfering
        vm.prank(bundler, bundler);
        IEntryPoint(entryPoint).handleOps(ops, payable(beneficiary));

        // 6. check results
        assertEq(usdc.balanceOf(address(account)), AMOUNT);
    }

    function test_execute_RandomUserCannotExecuteCommands() public {
        address accountAddr = factory.createAccount(user, SALT);
        EthAccount account = EthAccount(payable(accountAddr));

        // request that a random user mints some USDC to the account
        // Arrange
        assertEq(usdc.balanceOf(address(account)), 0);
        address dest = address(usdc);
        uint256 value = 0;
        bytes memory functionData = abi.encodeWithSelector(ERC20Mock.mint.selector, address(account), AMOUNT);
        // Act
        vm.prank(makeAddr("randomUser"));
        vm.expectRevert(EthAccount.EthAccount__NotFromEntryPointOrOwner.selector);
        account.execute(dest, value, functionData);
    }

    // --- validateUserOp function tests ---

    function test_validateUserOp_NonEntryPointCannotCall() public {
        address accountAddr = factory.createAccount(user, SALT);
        EthAccount account = EthAccount(payable(accountAddr));

        bytes memory callData = abi.encodeWithSelector(EthAccount.execute.selector, address(0), 0, "");
        PackedUserOperation memory userOp = _buildUserOp(address(account), "", callData);

        bytes32 userOpHash = IEntryPoint(entryPoint).getUserOpHash(userOp);
        userOp.signature = _signUserOp(userOpHash, userPrivateKey);

        vm.prank(makeAddr("randomUser"));
        vm.expectRevert(EthAccount.EthAccount__NotFromEntryPoint.selector);
        account.validateUserOp(userOp, userOpHash, 0);
    }

    function test_validateUserOp_UnvalidSignature() public {
        address accountAddr = factory.createAccount(user, SALT);
        EthAccount account = EthAccount(payable(accountAddr));

        bytes memory callData = abi.encodeWithSelector(EthAccount.execute.selector, address(0), 0, "");
        PackedUserOperation memory userOp = _buildUserOp(address(account), "", callData);

        bytes32 userOpHash = IEntryPoint(entryPoint).getUserOpHash(userOp);
        // Sign with a different private key to simulate an invalid signature
        userOp.signature = _signUserOp(userOpHash, uint256(9999));

        vm.prank(entryPoint);
        uint256 validationData = account.validateUserOp(userOp, userOpHash, 0);
        // The signature is invalid, so the highest bit should be set
        assertEq(validationData, SIG_VALIDATION_FAILED);
    }

    function test_validateUserOp_payRefund() public {
        address accountAddr = factory.createAccount(user, SALT);
        EthAccount account = EthAccount(payable(accountAddr));

        // Fund the account with some ether to pay for gas fees
        vm.deal(address(account), 1 ether);

        bytes memory callData = abi.encodeWithSelector(EthAccount.execute.selector, address(0), 0, "");
        PackedUserOperation memory userOp = _buildUserOp(address(account), "", callData);

        bytes32 userOpHash = IEntryPoint(entryPoint).getUserOpHash(userOp);
        userOp.signature = _signUserOp(userOpHash, userPrivateKey);

        uint256 missingFunds = 0.5 ether;
        vm.prank(entryPoint);
        uint256 validationData = account.validateUserOp(userOp, userOpHash, missingFunds);
        // The signature is valid and there are enough funds, so the highest bit should not be set
        assertEq(validationData, SIG_VALIDATION_SUCCESS);
        // The account should have paid the missing funds to the entry point
        assertEq(address(account).balance, 1 ether - missingFunds);
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
