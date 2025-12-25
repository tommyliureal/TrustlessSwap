// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title TrustlessSwap
/// @notice Swaps ETH against an encrypted USDT ledger at a fixed 1 ETH = 3000 USDT rate.
contract TrustlessSwap is ZamaEthereumConfig {
    uint256 private constant RATE = 3000;
    uint256 private constant USDT_DECIMALS = 1e6;
    uint256 private constant WEI_PER_ETH = 1 ether;

    mapping(address => euint64) private _encryptedBalances;
    mapping(address => uint64) private _clearBalances;

    event EthSwapped(address indexed user, uint256 ethIn, uint64 usdtOut);
    event UsdtSwapped(address indexed user, uint64 usdtIn, uint256 ethOut);

    /// @notice Swap ETH for encrypted USDT using the fixed rate.
    /// @return updatedBalance The caller's updated encrypted balance.
    function swapEthForUsdt() external payable returns (euint64 updatedBalance) {
        require(msg.value > 0, "ETH required");

        uint64 usdtAmount = _convertWeiToUsdt(msg.value);
        uint64 newClearBalance = _clearBalances[msg.sender] + usdtAmount;
        require(newClearBalance >= _clearBalances[msg.sender], "USDT overflow");
        _clearBalances[msg.sender] = newClearBalance;

        euint64 minted = FHE.asEuint64(usdtAmount);
        updatedBalance = FHE.add(_encryptedBalances[msg.sender], minted);
        _encryptedBalances[msg.sender] = updatedBalance;

        FHE.allowThis(updatedBalance);
        FHE.allow(updatedBalance, msg.sender);

        emit EthSwapped(msg.sender, msg.value, usdtAmount);
    }

    /// @notice Swap encrypted USDT back to ETH.
    /// @param usdtAmount Amount of USDT (6 decimals) to convert to ETH.
    /// @return ethReturned The amount of ETH sent back to the caller.
    function swapUsdtForEth(uint64 usdtAmount) external returns (uint256 ethReturned) {
        require(usdtAmount > 0, "Amount required");
        require(_clearBalances[msg.sender] >= usdtAmount, "Insufficient USDT");

        _clearBalances[msg.sender] -= usdtAmount;

        euint64 spend = FHE.asEuint64(usdtAmount);
        euint64 updatedBalance = FHE.sub(_encryptedBalances[msg.sender], spend);
        _encryptedBalances[msg.sender] = updatedBalance;

        FHE.allowThis(updatedBalance);
        FHE.allow(updatedBalance, msg.sender);

        ethReturned = _convertUsdtToWei(usdtAmount);
        require(address(this).balance >= ethReturned, "Insufficient ETH liquidity");

        (bool success, ) = msg.sender.call{value: ethReturned}("");
        require(success, "ETH transfer failed");

        emit UsdtSwapped(msg.sender, usdtAmount, ethReturned);
    }

    /// @notice Returns the encrypted USDT balance for a user.
    /// @param user Address to check.
    /// @return The encrypted balance handle.
    function getEncryptedBalance(address user) external view returns (euint64) {
        return _encryptedBalances[user];
    }

    /// @notice Preview USDT output for a given ETH amount (wei).
    function previewUsdtOut(uint256 weiAmount) external pure returns (uint256) {
        return _convertWeiToUsdt(weiAmount);
    }

    /// @notice Preview ETH output for a given USDT amount (6 decimals).
    function previewEthOut(uint64 usdtAmount) external pure returns (uint256) {
        return _convertUsdtToWei(usdtAmount);
    }

    function _convertWeiToUsdt(uint256 weiAmount) private pure returns (uint64) {
        uint256 usdt = (weiAmount * RATE * USDT_DECIMALS) / WEI_PER_ETH;
        require(usdt > 0, "Amount too small");
        require(usdt <= type(uint64).max, "USDT overflow");
        return uint64(usdt);
    }

    function _convertUsdtToWei(uint64 usdtAmount) private pure returns (uint256) {
        return (uint256(usdtAmount) * WEI_PER_ETH) / (RATE * USDT_DECIMALS);
    }
}
