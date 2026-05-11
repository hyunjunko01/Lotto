// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract LottoEntryToken is ERC20, Ownable {
    error LottoEntryToken__ClaimTooSoon(uint256 nextClaimAt);

    uint256 public constant FAUCET_AMOUNT = 100 ether;
    uint256 public constant CLAIM_COOLDOWN = 1 minutes;

    mapping(address user => uint256 lastClaimAt) public s_lastClaimAt;

    constructor() ERC20("Lotto Entry Token", "LET") Ownable(msg.sender) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function claimTestTokens() external {
        uint256 nextClaimAt = s_lastClaimAt[msg.sender] + CLAIM_COOLDOWN;
        if (block.timestamp < nextClaimAt) {
            revert LottoEntryToken__ClaimTooSoon(nextClaimAt);
        }

        s_lastClaimAt[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
