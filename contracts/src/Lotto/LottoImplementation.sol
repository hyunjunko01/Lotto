// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ILottoFactory} from "./Interface/ILottoFactory.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Lotto Implementation (logic contract)
 * @author HyunJun Ko
 * @notice This contract contains the core logic for the Lotto game.
 * @dev This contract is designed to be used with the EIP-1167 minimal proxy pattern.
 * @dev Each Lotto instance by factory is a proxy that delegates calls to this implementation contract.
 */
contract LottoImplementation is Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- error ---
    error Lotto__IsNotOpen();
    error Lotto__IsFull();
    error Lotto__IsNotFull();
    error Lotto__IsNotCalculating();
    error Lotto__IsNotClosed();
    error Lotto__InsufficientEntryFee();
    error Lotto__InvalidEntryToken();
    error Lotto__NotAllPlayersJoined();
    error Lotto__OnlyFactoryCanFulfill();
    error Lotto__TransferFailed();
    error Lotto__YouAreNotWinner();
    error Lotto__AlreadyRequested();
    error Lotto__AlreadyWithdrawn();
    error Lotto__IsNotRefunding();
    error Lotto__NoRefundableBalance();
    error Lotto__CalculatingTimeoutNotElapsed();

    // --- enum ---
    enum LottoState {
        OPEN,
        FULL,
        CALCULATING,
        CLOSED,
        REFUNDING
    }

    // --- state variables (stored in proxy's storage) ---
    uint256 public constant CALCULATING_TIMEOUT = 1 days;
    uint256 public entryFee;
    uint256 public maxPlayers;
    IERC20 public entryToken;
    address[] public players;
    address public winner;
    address public factory; // address of the factory that will provide randomness
    bool public isRandomnessRequested;
    bool public isPrizeWithdrawn;
    uint256 public randomnessRequestedAt;
    LottoState public lottoState;
    mapping(address player => uint256 amount) public refundableAmount;

    // --- events ---
    event PlayerJoined(address indexed player, uint256 playerCount);
    event WinnerRequested();
    event WinnerPicked(address indexed winner, uint256 prize);
    event PrizeWithdrawn(address indexed winner, uint256 amount);
    event RefundModeEnabled(uint256 timestamp);
    event RefundClaimed(address indexed player, uint256 amount);

    // --- constructor ---
    constructor() {
        _disableInitializers(); // Prevent the implementation contract from being initialized directly
    }

    // --- external functions ---
    /**
     * @notice Initialization function replacing the constructor
     * @dev It only affects the storage of the calling subject.
     * @dev So each lotto instance gets its own storage.
     * @dev Called by the factory immediately after Clones.clone()
     */
    function initialize(uint256 _entryFee, uint256 _maxPlayers, address _entryToken, address _factory) external initializer {
        if (_entryToken == address(0)) revert Lotto__InvalidEntryToken();
        entryFee = _entryFee;
        maxPlayers = _maxPlayers;
        entryToken = IERC20(_entryToken);
        factory = _factory;
        lottoState = LottoState.OPEN;
    }

    /**
     * @notice Function for joining the lotto
     * @dev Players join by paying ERC20 entry tokens. The lotto automatically transitions to FULL when max players are reached.
     */
    function joinLotto() external {
        // Checks
        if (lottoState == LottoState.FULL) revert Lotto__IsFull();
        if (lottoState != LottoState.OPEN) revert Lotto__IsNotOpen();
        if (entryToken.balanceOf(msg.sender) < entryFee) revert Lotto__InsufficientEntryFee();

        // Effects
        players.push(msg.sender);
        refundableAmount[msg.sender] += entryFee;
        // Automatically change state to FULL when max players reached
        if (players.length == maxPlayers) {
            lottoState = LottoState.FULL;
        }

        // Interactions
        entryToken.safeTransferFrom(msg.sender, address(this), entryFee);

        emit PlayerJoined(msg.sender, players.length);
    }

    /**
     * @notice Trigger randomness request for selecting the winner
     * @dev The actual randomness request is made to the factory contract, which then interacts with Chainlink VRF.
     * @dev If we don't interact with factory, we should adminster chainlick VRF directly in this contract, which would make the logic contract more complex.
     */
    function requestWinner() external {
        // Checks
        if (lottoState != LottoState.FULL) revert Lotto__IsNotFull();
        if (isRandomnessRequested) revert Lotto__AlreadyRequested(); // Prevent multiple requests

        // Effects
        lottoState = LottoState.CALCULATING;
        isRandomnessRequested = true;
        randomnessRequestedAt = block.timestamp;

        // Interactions
        // Request VRF randomness from the factory
        ILottoFactory(factory).requestWinnerRandomness();

        emit WinnerRequested();
    }

    /**
     * @notice Callback function called by the factory after receiving randomness
     * @dev This function is called by the factory contract after it receives the random number from Chainlink VRF.
     * @param _randomness Random number generated by Chainlink VRF
     */
    function finalizeWinner(uint256 _randomness) external {
        // Security: Only the factory contract can call this function
        if (msg.sender != factory) revert Lotto__OnlyFactoryCanFulfill();
        if (lottoState != LottoState.CALCULATING) revert Lotto__IsNotCalculating();

        lottoState = LottoState.CLOSED;

        // Winner selection logic (Modulo operation)
        // $WinnerIndex = randomness \pmod{maxPlayers}$
        uint256 winnerIndex = _randomness % maxPlayers;
        winner = players[winnerIndex];

        uint256 prize = entryToken.balanceOf(address(this));
        emit WinnerPicked(winner, prize);
    }

    /**
     * @notice Enable refund mode when VRF callback is stuck for too long
     * @dev Anyone can trigger this for liveness once timeout is exceeded.
     */
    function triggerRefundMode() external {
        if (lottoState != LottoState.CALCULATING) revert Lotto__IsNotCalculating();
        if (block.timestamp < randomnessRequestedAt + CALCULATING_TIMEOUT) {
            revert Lotto__CalculatingTimeoutNotElapsed();
        }

        lottoState = LottoState.REFUNDING;
        emit RefundModeEnabled(block.timestamp);
    }

    /**
     * @notice Claim your accumulated refund in REFUNDING state
     */
    function claimRefund() external nonReentrant {
        if (lottoState != LottoState.REFUNDING) revert Lotto__IsNotRefunding();

        uint256 amount = refundableAmount[msg.sender];
        if (amount == 0) revert Lotto__NoRefundableBalance();

        refundableAmount[msg.sender] = 0;
        entryToken.safeTransfer(msg.sender, amount);

        emit RefundClaimed(msg.sender, amount);
    }

    /**
     * @notice Function for the winner to withdraw their Prize
     */
    function withdrawPrize() external nonReentrant {
        // Checks
        if (lottoState != LottoState.CLOSED) revert Lotto__IsNotClosed();
        if (msg.sender != winner) revert Lotto__YouAreNotWinner(); // Additional logic can be added to ensure only the winner can call this
        if (isPrizeWithdrawn) revert Lotto__AlreadyWithdrawn(); // Prevent double withdrawal

        // Effects
        isPrizeWithdrawn = true;

        // Interactions
        uint256 amount = entryToken.balanceOf(address(this));
        entryToken.safeTransfer(winner, amount);

        emit PrizeWithdrawn(winner, amount);
    }

    // --- Getter functions ---
    function getPlayerCount() external view returns (uint256) {
        return players.length;
    }

    function getRemainingSpots() external view returns (uint256) {
        return maxPlayers - players.length;
    }

    function getLottoBalance() external view returns (uint256) {
        return entryToken.balanceOf(address(this));
    }
}

