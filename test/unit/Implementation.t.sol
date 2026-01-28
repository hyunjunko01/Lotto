// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LottoFactory} from "../../src/Lotto/Factory.sol";
import {LottoImplementation} from "../../src/Lotto/Implementation.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

contract ImplementationTest is Test {
    LottoImplementation impl;
    LottoFactory factory;
    VRFCoordinatorV2_5Mock vrfCoordinator;

    address user1 = makeAddr("user1");
    address user2 = makeAddr("user2");
    address user3 = makeAddr("user3");

    function setUp() public {
        vrfCoordinator = new VRFCoordinatorV2_5Mock(0.1 ether, 1e9, 1e18);
        uint256 subId = vrfCoordinator.createSubscription();
        vrfCoordinator.fundSubscription(subId, 10 ether);

        impl = new LottoImplementation();
        factory = new LottoFactory(
            address(impl),
            address(vrfCoordinator),
            subId,
            0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c, // arbitrary keyhash
            500000 // callback gas limit
        );
        vrfCoordinator.addConsumer(subId, address(factory));
    }

    function testInitialize() external {
        address cloneAddr = factory.createLotto(0.01 ether, 5);
        LottoImplementation clone = LottoImplementation(cloneAddr);

        assertEq(clone.entryFee(), 0.01 ether);
        assertEq(clone.maxPlayers(), 5);
        assertEq(clone.factory(), address(factory));
        assertEq(uint256(clone.lottoState()), 0); // OPEN
    }

    function testCannotInitializeTwice() external {
        address cloneAddr = factory.createLotto(0.01 ether, 5); // createLotto function calls initialize
        LottoImplementation clone = LottoImplementation(cloneAddr);

        vm.expectRevert("InvalidInitialization()");
        clone.initialize(0.02 ether, 10, address(factory));
    }

    function testCannotInitializeImplementationDirectly() external {
        vm.expectRevert("InvalidInitialization()");
        impl.initialize(0.01 ether, 5, address(factory)); // prevented by initializer modifier
    }

    function testJoinLotto() external {
        address cloneAddr = factory.createLotto(0.01 ether, 2);
        LottoImplementation clone = LottoImplementation(cloneAddr);

        vm.deal(user1, 1 ether);
        vm.prank(user1);
        clone.joinLotto{value: 0.01 ether}();

        assertEq(clone.players(0), user1);
    }

    function testCannotJoinLottoInsufficientFee() external {
        address cloneAddr = factory.createLotto(0.01 ether, 2);
        LottoImplementation clone = LottoImplementation(cloneAddr);

        vm.deal(user1, 1 ether);
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(LottoImplementation.Lotto__InsufficientEntryFee.selector));
        clone.joinLotto{value: 0.005 ether}();
    }

    function testCannotJoinLottoWhenLottoIsFull() external {
        address cloneAddr = factory.createLotto(0.01 ether, 1);
        LottoImplementation clone = LottoImplementation(cloneAddr);

        vm.deal(user1, 1 ether);
        vm.prank(user1);
        clone.joinLotto{value: 0.01 ether}();

        // Now the lotto should be in CALCULATING state
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(LottoImplementation.Lotto__IsNotOpen.selector));
        clone.joinLotto{value: 0.01 ether}();
    }

    function testFinalizeWinner() external {
        address cloneAddr = factory.createLotto(0.01 ether, 3);
        LottoImplementation clone = LottoImplementation(cloneAddr);

        vm.deal(user1, 1 ether);
        vm.prank(user1);
        clone.joinLotto{value: 0.01 ether}();

        vm.deal(user2, 1 ether);
        vm.prank(user2);
        clone.joinLotto{value: 0.01 ether}();

        vm.deal(user3, 1 ether);
        vm.prank(user3);
        clone.joinLotto{value: 0.01 ether}();

        // Simulate Chainlink VRF callback
        uint256 fakeRandomness = 100;
        vm.prank(address(factory));
        clone.finalizeWinner(fakeRandomness); // arbitrary randomness

        assertEq(clone.winner(), user2); // 100 % 3 == 1 -> user2
    }

    function testCannotFinalizeWinnerByNonFactory() external {
        address cloneAddr = factory.createLotto(0.01 ether, 3);
        LottoImplementation clone = LottoImplementation(cloneAddr);

        vm.deal(user1, 1 ether);
        vm.prank(user1);
        clone.joinLotto{value: 0.01 ether}();

        vm.deal(user2, 1 ether);
        vm.prank(user2);
        clone.joinLotto{value: 0.01 ether}();

        vm.deal(user3, 1 ether);
        vm.prank(user3);
        clone.joinLotto{value: 0.01 ether}();

        // Simulate Chainlink VRF callback
        uint256 fakeRandomness = 100;
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(LottoImplementation.Lotto__OnlyFactoryCanFulfill.selector));
        clone.finalizeWinner(fakeRandomness);
    }

    function testCannotFinalizeWinnerWhenNotAllPlayersJoined() external {
        address cloneAddr = factory.createLotto(0.01 ether, 3);
        LottoImplementation clone = LottoImplementation(cloneAddr);

        vm.deal(user1, 1 ether);
        vm.prank(user1);
        clone.joinLotto{value: 0.01 ether}();

        // Simulate Chainlink VRF callback
        uint256 fakeRandomness = 100;
        vm.prank(address(factory));
        vm.expectRevert(abi.encodeWithSelector(LottoImplementation.Lotto__IsNotCalculating.selector));
        clone.finalizeWinner(fakeRandomness);
    }

    function testWithdrawPrize() external {
        address cloneAddr = factory.createLotto(0.01 ether, 3);
        LottoImplementation clone = LottoImplementation(cloneAddr);

        vm.deal(user1, 1 ether);
        vm.prank(user1);
        clone.joinLotto{value: 0.01 ether}();

        vm.deal(user2, 1 ether);
        vm.prank(user2);
        clone.joinLotto{value: 0.01 ether}();

        vm.deal(user3, 1 ether);
        vm.prank(user3);
        clone.joinLotto{value: 0.01 ether}();

        // Simulate Chainlink VRF callback
        uint256 fakeRandomness = 100;
        vm.prank(address(factory));
        clone.finalizeWinner(fakeRandomness); // arbitrary randomness

        assertEq(clone.winner(), user2); // 100 % 3 == 1 -> user2

        uint256 winnerInitialBalance = user2.balance;
        vm.prank(user2);
        clone.withdrawPrize();
        uint256 winnerFinalBalance = user2.balance;

        assertEq(winnerFinalBalance - winnerInitialBalance, 0.03 ether);
    }

    function testCannotWithdrawPrizeByOthers() external {
        address cloneAddr = factory.createLotto(0.01 ether, 3);
        LottoImplementation clone = LottoImplementation(cloneAddr);

        vm.deal(user1, 1 ether);
        vm.prank(user1);
        clone.joinLotto{value: 0.01 ether}();

        vm.deal(user2, 1 ether);
        vm.prank(user2);
        clone.joinLotto{value: 0.01 ether}();

        vm.deal(user3, 1 ether);
        vm.prank(user3);
        clone.joinLotto{value: 0.01 ether}();

        // Simulate Chainlink VRF callback
        uint256 fakeRandomness = 100;
        vm.prank(address(factory));
        clone.finalizeWinner(fakeRandomness); // arbitrary randomness

        assertEq(clone.winner(), user2); // 100 % 3 == 1 -> user2

        vm.expectRevert(abi.encodeWithSelector(LottoImplementation.Lotto__YouAreNotWinner.selector));
        vm.prank(user3);
        clone.withdrawPrize();
    }

    function testCannotWithdrawPrizeBeforeLottoClosed() external {
        address cloneAddr = factory.createLotto(0.01 ether, 3);
        LottoImplementation clone = LottoImplementation(cloneAddr);

        vm.deal(user1, 1 ether);
        vm.prank(user1);
        clone.joinLotto{value: 0.01 ether}();

        vm.deal(user2, 1 ether);
        vm.prank(user2);
        clone.joinLotto{value: 0.01 ether}();

        vm.deal(user3, 1 ether);
        vm.prank(user3);
        clone.joinLotto{value: 0.01 ether}();

        vm.expectRevert(abi.encodeWithSelector(LottoImplementation.Lotto__IsNotClosed.selector));
        vm.prank(user2);
        clone.withdrawPrize();
    }
}
