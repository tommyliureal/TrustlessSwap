# Trustless Swap

A fixed‑rate ETH ↔ encrypted USDT swap built on Zama's FHEVM. USDT balances stay encrypted on‑chain, while users can
decrypt them in the UI through the Zama relayer flow.

## Overview

Trustless Swap provides a simple, deterministic exchange between ETH and a Zama‑encrypted USDT balance at a fixed
conversion rate of 1 ETH = 3000 USDT. The primary goal is privacy‑preserving balances on public chains without sacrificing
basic swap usability. The smart contract holds the encrypted ledger, and the frontend allows users to display the encrypted
balance as well as request a decrypt to reveal the plaintext amount when needed.

## What Problems It Solves

- **On‑chain privacy**: Token balances are encrypted on‑chain, preventing public balance scraping and behavioral tracking.
- **Usable privacy**: Users can still reveal their balance via the relayer when they choose, without moving funds.
- **Deterministic pricing**: A fixed rate simplifies reasoning and demoing the privacy model without price oracles.
- **Minimal trust surface**: The relayer is used only for decrypting balances, not for custody or swaps.
- **Developer clarity**: A compact example of Zama FHEVM concepts applied to a real swap flow.

## Key Advantages

- **Encrypted USDT ledger** stored directly in the contract; no off‑chain shadow accounting.
- **Predictable swaps** with a fixed ETH↔USDT rate, removing oracle dependencies.
- **Dual‑stack frontend** using `ethers` for writes and `viem` for reads, showcasing realistic app patterns.
- **Relayer‑based decrypt** that is explicit and user‑driven in the UI.
- **Sepolia‑ready** deployment flow with private‑key signing (no mnemonics).

## Tech Stack

- **Solidity + Hardhat** for contracts, deployment, and tests.
- **Zama FHEVM** for encrypted balances and operations.
- **React + Vite** for the frontend.
- **RainbowKit + wagmi connectors** for wallet UX.
- **ethers** for contract writes (transactions).
- **viem** for contract reads (state queries).
- **TypeScript** across scripts and frontend.

## How It Works (End‑to‑End)

1. **Deposit ETH**: A user swaps ETH for encrypted USDT at a fixed rate.
2. **Encrypted accounting**: The contract stores the USDT balance encrypted.
3. **Reverse swap**: A user can swap encrypted USDT back for ETH at the same rate.
4. **Display balance**: The frontend shows the encrypted USDT value.
5. **Decrypt on demand**: The user triggers a decrypt request via the relayer to reveal plaintext.

## Contract Architecture (High Level)

- **Core ledger**: The encrypted USDT balance mapping is kept in the contract.
- **Swap functions**: Fixed‑rate conversions that update encrypted balances.
- **No sender‑dependent views**: View functions accept addresses explicitly (no `msg.sender` in view methods).
- **Deterministic math**: No oracle, no external pricing, no slippage.

## Frontend Architecture (High Level)

- **Read path**: `viem` reads for chain state (balances, contract metadata).
- **Write path**: `ethers` writes for swaps and approvals.
- **Decrypt flow**: Zama relayer SDK is used to request and display decrypted balance.
- **Network targeting**: Sepolia only (no localhost network usage).
- **No frontend env vars**: Contract config is embedded in the frontend code.

## Quick Start

### Prerequisites

- **Node.js** 20+
- **npm**

### Backend (Hardhat)

1. Install dependencies

   ```bash
   npm install
   ```

2. Configure `.env`

   ```
   INFURA_API_KEY=<infura-key>
   PRIVATE_KEY=<sepolia-deployer-private-key>
   ETHERSCAN_API_KEY=<optional-for-verify>
   ```

3. Compile and test

   ```bash
   npm run compile
   npm test
   ```

4. Deploy

   ```bash
   npx hardhat deploy --network sepolia
   # then copy deployments/sepolia/TrustlessSwap.json into the frontend config
   ```

### Frontend (Vite + React)

```
cd src
npm install
npm run build # or npm run dev
```

The frontend reads with viem, writes with ethers, decrypts balances through the Zama relayer SDK, and targets Sepolia.

## Project Layout

```
contracts/TrustlessSwap.sol   # Encrypted USDT ledger + swap logic
deploy/deploy.ts              # Hardhat-deploy script
tasks/TrustlessSwap.ts        # Helper tasks (balance decrypt, swaps)
test/TrustlessSwap.ts         # FHEVM mock tests
src/                          # Frontend (React + Vite + RainbowKit)
deployments/sepolia/          # ABI for the Sepolia deployment
```

## Scripts

| Script            | Description                  |
| ----------------- | ---------------------------- |
| `npm run compile` | Compile contracts            |
| `npm run test`    | Run Hardhat tests            |
| `npm run lint`    | Solidity + TypeScript lint   |
| `npm run clean`   | Remove build artifacts       |
| `npm run build`   | Frontend build (`src/` dir)  |

## Configuration Notes

- Uses `PRIVATE_KEY` (no mnemonic) with Infura for Sepolia deployments.
- Frontend avoids environment variables; contract address/ABI are set in `src/src/config/contracts.ts` from the generated
  `deployments/sepolia/TrustlessSwap.json`.

## Operational Details

- **Fixed rate**: 1 ETH = 3000 USDT in both swap directions.
- **USDT representation**: USDT is an encrypted balance (not a standard ERC‑20).
- **Relayer dependency**: Only required for decrypting balances, not for swaps.
- **Network support**: Sepolia only; no localhost support.

## Limitations

- **No dynamic pricing**: Fixed rate, no oracle integration.
- **No liquidity curves**: This is a direct fixed‑price swap, not an AMM.
- **Relayer availability**: Decrypt requires a functioning relayer.
- **Encrypted token scope**: This is a demo‑style encrypted ledger, not a full ERC‑20 implementation.

## Security Considerations

- **Private key use**: Deployment uses a raw private key in `.env` (no mnemonic).
- **Encrypted state**: On‑chain USDT values remain encrypted; plaintext is only revealed client‑side.
- **Explicit address views**: View methods take addresses as parameters to avoid implicit sender context.

## Future Plans

- **Variable pricing** with optional oracle support.
- **Multiple encrypted assets** (e.g., EUR, stablecoin variants).
- **Swap limits and rate guards** for safer conversions.
- **Better analytics** for encrypted balances without revealing plaintext.
- **Extended relayer UX**: progress indicators, retries, and error recovery.
- **Mainnet readiness**: audit, monitoring, and operational hardening.
