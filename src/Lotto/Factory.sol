// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {ILotto} from "./Interface/ILotto.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title LottoFactory
 * @dev contract that creates and manages Lotto instances with Chainlink VRF integration
 * @author Tyler Ko
 */
contract LottoFactory is VRFConsumerBaseV2Plus {
    // --- error ---
    error LottoFactory__OnlyLottoInstanceCanRequest();
    error LottoFactory__RequestNotFound();

    // --- state variables ---
    address public immutable i_implementation; // address of the logic contract
    address[] public allLottos; // all deployed Lotto proxy addresses

    mapping(address => bool) public isLottoInstance; // check if a Lotto instance is valid
    mapping(uint256 => address) public s_requestIdToLotto; // mapping of requestId to Lotto address

    // VRF configuration
    uint256 private s_subscriptionId;
    bytes32 private s_keyHash;
    uint32 private s_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // --- events ---
    event LottoCreated(address indexed lottoAddress, address indexed creator);
    event RandomnessRequested(uint256 indexed requestId, address indexed lottoAddress);
    event RandomnessFulfilled(uint256 indexed requestId, uint256 randomness);

    constructor(
        address _implementation,
        address _vrfCoordinator,
        uint256 _subId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        i_implementation = _implementation;
        s_subscriptionId = _subId;
        s_keyHash = _keyHash;
        s_callbackGasLimit = _callbackGasLimit;
    }

    /**
     * @notice Step 1: Create a new Lotto instance (EIP-1167 Clone)
     * @param _entryFee Entry fee for the Lotto instance
     * @param _maxPlayers Maximum number of players for the Lotto instance
     */
    function createLotto(uint256 _entryFee, uint256 _maxPlayers) external returns (address) {
        // 1. Deploy minimal proxy contract
        address clone = Clones.clone(i_implementation);

        // 2. Initialize (proxies cannot use constructors, so call directly)
        // ILotto is an interface or abstraction of the logic contract
        ILotto(clone).initialize(_entryFee, _maxPlayers, address(this));

        // 3. Register in management list
        allLottos.push(clone);
        isLottoInstance[clone] = true;

        emit LottoCreated(clone, msg.sender);
        return clone;
    }

    /**
     * @notice Step 2: Receive randomness request from Lotto instance
     * Only Lotto instances created by the factory can call this function.
     */
    function requestWinnerRandomness() external returns (uint256 requestId) {
        if (!isLottoInstance[msg.sender]) revert LottoFactory__OnlyLottoInstanceCanRequest();

        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: s_keyHash,
                subId: s_subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: s_callbackGasLimit,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
            })
        );

        s_requestIdToLotto[requestId] = msg.sender;
        emit RandomnessRequested(requestId, msg.sender);
    }

    /**
     * @notice Step 3: Receive randomness from Chainlink and forward to individual Lotto instance
     */
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        address lottoAddress = s_requestIdToLotto[requestId];
        if (lottoAddress == address(0)) revert LottoFactory__RequestNotFound();

        uint256 randomness = randomWords[0];

        // Call the winner finalization function of the corresponding Lotto instance
        ILotto(lottoAddress).finalizeWinner(randomness);

        emit RandomnessFulfilled(requestId, randomness);
        delete s_requestIdToLotto[requestId]; // Delete mapping to save gas
    }

    // --- Admin-only functions ---
    function setVrfConfig(uint256 _subId, bytes32 _keyHash, uint32 _callbackGasLimit) external onlyOwner {
        s_subscriptionId = _subId;
        s_keyHash = _keyHash;
        s_callbackGasLimit = _callbackGasLimit;
    }
}

