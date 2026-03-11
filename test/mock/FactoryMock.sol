// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

contract LottoFactoryMock {
    uint256 public requestId = 1;

    function requestWinnerRandomness() external returns (uint256) {
        return requestId++;
    }
}
