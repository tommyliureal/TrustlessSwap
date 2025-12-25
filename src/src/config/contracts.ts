export const CONTRACT_ADDRESS = "0x40cD3bB0FFF76642Cba9C06432103e828b479438" as const;
export const CONTRACT_CHAIN_ID = 11155111;

export const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "ZamaProtocolUnsupported",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "ethIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "usdtOut",
        "type": "uint64"
      }
    ],
    "name": "EthSwapped",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "usdtIn",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "ethOut",
        "type": "uint256"
      }
    ],
    "name": "UsdtSwapped",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "confidentialProtocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getEncryptedBalance",
    "outputs": [
      {
        "internalType": "euint64",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "usdtAmount",
        "type": "uint64"
      }
    ],
    "name": "previewEthOut",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "weiAmount",
        "type": "uint256"
      }
    ],
    "name": "previewUsdtOut",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "swapEthForUsdt",
    "outputs": [
      {
        "internalType": "euint64",
        "name": "updatedBalance",
        "type": "bytes32"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "usdtAmount",
        "type": "uint64"
      }
    ],
    "name": "swapUsdtForEth",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "ethReturned",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
