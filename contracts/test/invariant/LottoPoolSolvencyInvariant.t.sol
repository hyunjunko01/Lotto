// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SetupVrf} from "../../script/setup/SetupVrf.s.sol";
import {LottoFactory} from "../../src/Lotto/LottoFactory.sol";
import {LottoImplementation} from "../../src/Lotto/LottoImplementation.sol";
import {LottoEntryToken} from "../../src/Lotto/LottoEntryToken.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";
import {LottoPoolSolvency} from "../helpers/LottoPoolSolvency.sol";
import {LottoPoolStateProperties} from "../helpers/LottoPoolStateProperties.sol";
import {LottoHandler} from "./LottoHandler.sol";

/**
 * @title LottoPoolSolvencyInvariant
 * @notice Invariant suite for pool solvency (SECURITY.md I2).
 * @dev Current scope covers OPEN/FULL/CALCULATING/CLOSED/REFUNDING
 *      via join/request/fulfill/refund/withdraw actions.
 */
contract LottoPoolSolvencyInvariant is Test {
    LottoFactory internal factory;
    LottoEntryToken internal entryToken;
    VRFCoordinatorV2_5Mock internal vrfCoordinator;
    LottoHandler internal handler;

    address internal player1 = makeAddr("player1");
    address internal player2 = makeAddr("player2");
    address internal player3 = makeAddr("player3");

    uint256 internal constant ENTRY_FEE = 0.01 ether;
    uint256 internal constant MAX_PLAYERS = 3;
    bytes32 internal constant KEY_HASH = 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c;
    uint32 internal constant CALLBACK_GAS_LIMIT = 500000;

    function setUp() public {
        SetupVrf setupVrf = new SetupVrf();
        address coordinator = setupVrf.deployForTest();
        vrfCoordinator = VRFCoordinatorV2_5Mock(coordinator);
        uint256 subscriptionId = vrfCoordinator.createSubscription();

        LottoImplementation implementation = new LottoImplementation();
        entryToken = new LottoEntryToken();
        factory =
            new LottoFactory(address(implementation), coordinator, subscriptionId, KEY_HASH, CALLBACK_GAS_LIMIT, false);

        vrfCoordinator.fundSubscription(subscriptionId, 1e24);
        vrfCoordinator.addConsumer(subscriptionId, address(factory));

        entryToken.mint(player1, 100 ether);
        entryToken.mint(player2, 100 ether);
        entryToken.mint(player3, 100 ether);

        address[] memory joinPool = new address[](3);
        joinPool[0] = player1;
        joinPool[1] = player2;
        joinPool[2] = player3;

        handler = new LottoHandler(factory, entryToken, vrfCoordinator, ENTRY_FEE, MAX_PLAYERS, joinPool);
        handler.createLotto();

        targetContract(address(handler));
        bytes4[] memory selectors = new bytes4[](6);
        selectors[0] = LottoHandler.joinRandom.selector;
        selectors[1] = LottoHandler.requestWinner.selector;
        selectors[2] = LottoHandler.fulfillRandomness.selector;
        selectors[3] = LottoHandler.warpAndTriggerRefund.selector;
        selectors[4] = LottoHandler.claimRefundRandom.selector;
        selectors[5] = LottoHandler.withdrawPrizeAsWinner.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    function invariant_poolSolvent() public view {
        address[] memory accounts = handler.trackedAccounts();
        LottoPoolSolvency.assertPoolSolvent(handler.lotto(), accounts);
    }

    function invariant_phaseSpecificObligations() public view {
        address[] memory accounts = handler.trackedAccounts();
        LottoPoolStateProperties.assertPhaseSpecificObligations(handler.lotto(), accounts);
    }

    // Optional: uncomment after handler exposes more actions
    // function invariant_callSummary() public view {
    //     handler.assertLottoSolvent();
    // }
}
