// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

contract LottoImplementationMock {
    bool public initialized;
    bool public winnerFinalized;

    function initialize(uint256, uint256, address) external {
        initialized = true;
    }

    function finalizeWinner(uint256) external {
        winnerFinalized = true;
    }
}
