// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {AccountFactory} from "../../../src/Account/Ethereum/AccountFactory.sol";
import {EthAccount} from "../../../src/Account/Ethereum/EthAccount.sol";
import {EntryPoint} from "@account-abstraction/contracts/core/EntryPoint.sol";

contract AccountFactoryTest is Test {
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

    function test_PredictAddressMatchesDeployedAddress() public {
        address predicted = factory.getAddress(owner, SALT);

        vm.prank(owner);
        address deployed = factory.createAccount(owner, SALT);

        assertEq(predicted, deployed, "Predicted address should match deployed address");
    }

    function test_CreateAccountInitializesOwnerCorrectly() public {
        address accountAddr = factory.createAccount(owner, SALT);
        EthAccount account = EthAccount(payable(accountAddr));

        assertEq(account.owner(), owner, "Owner should be correctly initialized");
    }

    function test_CreateAccountReturnsExistingIfAlreadyDeployed() public {
        address first = factory.createAccount(owner, SALT);
        address second = factory.createAccount(owner, SALT);

        assertEq(first, second, "Should return the same address for same owner/salt");
    }
}
