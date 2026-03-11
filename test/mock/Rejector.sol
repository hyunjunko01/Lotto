// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {ILotto} from "../../src/Lotto/Interface/ILotto.sol";

contract Rejector {
    function joinLotto(address _lotto, uint256 _amount) external payable {
        ILotto(_lotto).joinLotto{value: _amount}();
    }

    function withdrawPrize(address _lotto) external {
        ILotto(_lotto).withdrawPrize();
    }
}
