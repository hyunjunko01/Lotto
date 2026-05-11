// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract EthAccountExecuteShim {
    function execute(address dest, uint256 value, bytes calldata functionData) external pure {
        (dest, value, functionData);
    }
}
