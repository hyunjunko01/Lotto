// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {AccountFactory} from "../../../src/Account/Ethereum/AccountFactory.sol";
import {EthAccount} from "../../../src/Account/Ethereum/EthAccount.sol";
import {EntryPoint} from "@account-abstraction/contracts/core/EntryPoint.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {SIG_VALIDATION_FAILED, SIG_VALIDATION_SUCCESS} from "@account-abstraction/contracts/core/Helpers.sol";

contract EthAccountTest is Test {
    using MessageHashUtils for bytes32;

    AccountFactory factory;
    EthAccount implementation;
    EntryPoint entryPoint;

    address owner;
    uint256 ownerKey;
    uint256 constant SALT = 123;

    function setUp() public {
        (owner, ownerKey) = makeAddrAndKey("owner");
        entryPoint = new EntryPoint();

        implementation = new EthAccount(address(entryPoint));
        factory = new AccountFactory(address(implementation));
    }

    function test_CannotInitializeTwice() public {
        address accountAddr = factory.createAccount(owner, SALT);
        EthAccount account = EthAccount(payable(accountAddr));

        vm.expectRevert(); // Initializable: contract is already initialized
        account.initialize(address(0xdead));
    }

    function test_ExecuteOnlyByEntryPointOrOwner() public {
        address accountAddr = factory.createAccount(owner, SALT);
        EthAccount account = EthAccount(payable(accountAddr));
        address target = makeAddr("target");

        // When random user tries to call execute, it should revert
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(EthAccount.EthAccount__NotFromEntryPointOrOwner.selector);
        account.execute(target, 1 ether, "");

        // When owner calls execute, it should succeed
        vm.deal(accountAddr, 2 ether); // fund the account with sufficient ether
        vm.prank(owner);
        account.execute(target, 1 ether, "");
        assertEq(target.balance, 1 ether);
    }

    // --- ERC-4337 Validation Tests ---

    function test_ValidateUserOp_CorrectSignature() public {
        address accountAddr = factory.createAccount(owner, SALT);
        EthAccount account = EthAccount(payable(accountAddr));

        // create a valid UserOperation signed by the owner
        PackedUserOperation memory userOp = _createSignedUserOp(accountAddr, ownerKey);
        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);

        // scenario: EntryPoint calls validateUserOp to check signature validity
        vm.prank(address(entryPoint));
        uint256 validationData = account.validateUserOp(userOp, userOpHash, 0);

        assertEq(validationData, SIG_VALIDATION_SUCCESS, "Should return success for valid signature");
    }

    function test_ValidateUserOp_WrongSignature() public {
        address accountAddr = factory.createAccount(owner, SALT);
        EthAccount account = EthAccount(payable(accountAddr));

        // create a UserOperation signed by a wrong key
        (, uint256 wrongKey) = makeAddrAndKey("wrong");
        PackedUserOperation memory userOp = _createSignedUserOp(accountAddr, wrongKey);
        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);

        vm.prank(address(entryPoint));
        uint256 validationData = account.validateUserOp(userOp, userOpHash, 0);

        assertEq(validationData, SIG_VALIDATION_FAILED, "Should return failure for invalid signature");
    }

    function test_PayPrefundToEntryPoint() public {
        address accountAddr = factory.createAccount(owner, SALT);
        EthAccount account = EthAccount(payable(accountAddr));
        uint256 missingFunds = 1 ether;
        vm.deal(accountAddr, missingFunds);

        // create a valid UserOperation signed by the owner
        PackedUserOperation memory userOp = _createSignedUserOp(accountAddr, ownerKey);
        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);

        vm.prank(address(entryPoint));
        account.validateUserOp(userOp, userOpHash, missingFunds);

        assertEq(address(entryPoint).balance, missingFunds, "EntryPoint should receive prefund");
    }

    // --- Helpers ---

    function _createEmptyUserOp(address sender) internal pure returns (PackedUserOperation memory) {
        return PackedUserOperation({
            sender: sender,
            nonce: 0,
            initCode: "",
            callData: "",
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: ""
        });
    }

    function _createSignedUserOp(address sender, uint256 key) internal view returns (PackedUserOperation memory) {
        PackedUserOperation memory userOp = _createEmptyUserOp(sender);
        bytes32 hash = entryPoint.getUserOpHash(userOp);
        bytes32 ethHash = hash.toEthSignedMessageHash();

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, ethHash);
        userOp.signature = abi.encodePacked(r, s, v);

        return userOp;
    }
}
