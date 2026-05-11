//SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

interface ILotto {
    function initialize(uint256 _entryFee, uint256 _maxPlayers, address _entryToken, address _factory) external;
    function joinLotto() external;
    function finalizeWinner(uint256 _randomness) external;
    function withdrawPrize() external;
}
