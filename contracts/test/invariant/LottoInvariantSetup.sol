// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SetupVrf} from "../../script/setup/SetupVrf.s.sol";
import {LottoFactory} from "../../src/Lotto/LottoFactory.sol";
import {LottoImplementation} from "../../src/Lotto/LottoImplementation.sol";
import {LottoEntryToken} from "../../src/Lotto/LottoEntryToken.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";
import {LottoHandler} from "./LottoHandler.sol";

/**
 * @title LottoInvariantSetup
 * @notice Shared Foundry invariant harness (handler + fuzz selectors).
 * @dev Extended by per-property invariant contracts (I1, I2, …).
 */
abstract contract LottoInvariantSetup is Test {
    LottoFactory internal factory;
    LottoEntryToken internal entryToken;
    VRFCoordinatorV2_5Mock internal vrfCoordinator;
    LottoHandler internal handler;

    address internal player1 = makeAddr("player1");
    address internal player2 = makeAddr("player2");
    address internal player3 = makeAddr("player3");

    uint256 internal constant ENTRY_FEE = 0.01 ether;
    uint256 internal constant MAX_PLAYERS = 3;
    uint256 internal constant MAX_INSTANCES = 5;
    bytes32 internal constant KEY_HASH = 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c;
    uint32 internal constant CALLBACK_GAS_LIMIT = 500000;

    function setUp() public virtual {
        SetupVrf setupVrf = new SetupVrf();
        address coordinator = setupVrf.deployForTest();
        vrfCoordinator = VRFCoordinatorV2_5Mock(coordinator);
        uint256 subscriptionId = vrfCoordinator.createSubscription();

        LottoImplementation implementation = new LottoImplementation();
        entryToken = new LottoEntryToken();
        factory =
            new LottoFactory(address(implementation), coordinator, subscriptionId, KEY_HASH, CALLBACK_GAS_LIMIT, false);
        factory.setAllowedEntryToken(address(entryToken), true);

        vrfCoordinator.fundSubscription(subscriptionId, 1e24);
        vrfCoordinator.addConsumer(subscriptionId, address(factory));

        entryToken.mint(player1, 100 ether);
        entryToken.mint(player2, 100 ether);
        entryToken.mint(player3, 100 ether);

        address[] memory joinPool = new address[](3);
        joinPool[0] = player1;
        joinPool[1] = player2;
        joinPool[2] = player3;

        handler = new LottoHandler(factory, entryToken, vrfCoordinator, ENTRY_FEE, MAX_PLAYERS, MAX_INSTANCES, joinPool);
        handler.createLotto();

        targetContract(address(handler));
        bytes4[] memory selectors = new bytes4[](7);
        selectors[0] = LottoHandler.joinRandom.selector;
        selectors[1] = LottoHandler.requestWinner.selector;
        selectors[2] = LottoHandler.fulfillRandomness.selector;
        selectors[3] = LottoHandler.warpAndTriggerRefund.selector;
        selectors[4] = LottoHandler.claimRefundRandom.selector;
        selectors[5] = LottoHandler.withdrawPrizeAsWinner.selector;
        selectors[6] = LottoHandler.createLottoInstance.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }
}
