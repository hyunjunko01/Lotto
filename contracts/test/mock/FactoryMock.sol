// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

contract LottoFactoryMock {
    uint256 public requestId = 1;
    mapping(address => bool) internal s_isLottoInstance;

    function requestWinnerRandomness() external returns (uint256) {
        return requestId++;
    }

    function createLotto(uint256, uint256, address) external pure returns (address) {
        return address(0);
    }

    function setLottoInstance(address instance, bool allowed) external {
        s_isLottoInstance[instance] = allowed;
    }

    function isLottoInstance(address instance) external view returns (bool) {
        return s_isLottoInstance[instance];
    }
}
