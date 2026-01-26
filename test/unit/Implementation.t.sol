// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LottoFactory} from "../../src/Lotto/Factory.sol";
import {LottoImplementation} from "../../src/Lotto/Implementation.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

contract ImplementationTest {
    LottoImplementation impl;
    LottoFactory factory;
    VRFCoordinatorV2_5Mock vrfCoordinator;

    function setup() external {
        vrfCoordinator = new VRFCoordinatorV2_5Mock(0.1 ether, 1e9, 1e18);
        uint256 subId = vrfCoordinator.createSubscription();
        vrfCoordinator.fundSubscription(subId, 10 ether);

        impl = new LottoImplementation();
        factory = new LottoFactory(
            address(impl),
            address(vrfCoordinator),
            subId,
            0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c, // arbitrary keyhash
            500000
        );
        vrfCoordinator.addConsumer(subId, address(factory));
    }
}
