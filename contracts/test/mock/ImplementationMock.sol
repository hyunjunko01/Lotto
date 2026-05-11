// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

contract LottoImplementationMock {
    bool public initialized;
    bool public winnerFinalized;

    function initialize(uint256, uint256, address, address) external {
        initialized = true;
    }

    function finalizeWinner(uint256) external {
        winnerFinalized = true;
    }

    function joinLotto() external payable {}

    function requestWinner() external {}

    function withdrawPrize() external {}

    function triggerRefundMode() external {}

    function claimRefund() external {}
}
