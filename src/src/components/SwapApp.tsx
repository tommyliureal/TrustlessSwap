import { useMemo, useState } from "react";
import { ethers, ZeroHash } from "ethers";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { Header } from "./Header";
import { CONTRACT_ABI, CONTRACT_ADDRESS, CONTRACT_CHAIN_ID } from "../config/contracts";
import { useEthersSigner } from "../hooks/useEthersSigner";
import { useZamaInstance } from "../hooks/useZamaInstance";

const RATE = 3000n;
const USDT_DECIMALS = 1_000_000n;
const WEI_DECIMALS = 1_000_000_000_000_000_000n;

const formatUsdt = (amount: bigint) => {
  const whole = amount / USDT_DECIMALS;
  const fraction = amount % USDT_DECIMALS;
  const trimmed = fraction.toString().padStart(6, "0").replace(/0+$/, "");
  return trimmed ? `${whole.toString()}.${trimmed}` : whole.toString();
};

const parseEthInput = (value: string) => {
  try {
    return ethers.parseEther(value || "0");
  } catch {
    return 0n;
  }
};

const parseUsdtInput = (value: string) => {
  try {
    return ethers.parseUnits(value || "0", 6);
  } catch {
    return 0n;
  }
};

const quoteUsdt = (weiAmount: bigint) => (weiAmount * RATE * USDT_DECIMALS) / WEI_DECIMALS;
const quoteEth = (usdtAmount: bigint) => (usdtAmount * WEI_DECIMALS) / (RATE * USDT_DECIMALS);

export function SwapApp() {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [ethInput, setEthInput] = useState("0.1");
  const [usdtInput, setUsdtInput] = useState("100");
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedBalance, setDecryptedBalance] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const contractReady = Boolean(CONTRACT_ADDRESS);
  const usdtFromEth = useMemo(() => quoteUsdt(parseEthInput(ethInput)), [ethInput]);
  const ethFromUsdt = useMemo(() => quoteEth(parseUsdtInput(usdtInput)), [usdtInput]);

  const { data: ethBalance } = useBalance({
    address,
    chainId: CONTRACT_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  const {
    data: encryptedBalance,
    isLoading: balanceLoading,
    refetch: refetchEncryptedBalance,
  } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getEncryptedBalance",
    args: address && CONTRACT_ADDRESS ? [address] : undefined,
    query: { enabled: Boolean(address && CONTRACT_ADDRESS) },
  });

  const handleSwapEthForUsdt = async () => {
    setActionError(null);
    setTxMessage(null);
    setDecryptedBalance(null);

    if (!contractReady) {
      setActionError("Set the deployed contract address to start swapping.");
      return;
    }

    const signer = await signerPromise;
    if (!signer) {
      setActionError("Wallet not ready. Connect a signer.");
      return;
    }

    const weiValue = parseEthInput(ethInput);
    if (weiValue === 0n) {
      setActionError("Enter a valid ETH amount.");
      return;
    }

    try {
      setTxMessage("Sending ETH → USDT swap...");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.swapEthForUsdt({ value: weiValue });
      await tx.wait();
      setTxMessage("Swap confirmed.");
      await refetchEncryptedBalance();
    } catch (error) {
      console.error(error);
      setActionError(error instanceof Error ? error.message : "Swap failed");
    } finally {
      setTxMessage(null);
    }
  };

  const handleSwapUsdtForEth = async () => {
    setActionError(null);
    setTxMessage(null);
    setDecryptedBalance(null);

    if (!contractReady) {
      setActionError("Set the deployed contract address to start swapping.");
      return;
    }

    const signer = await signerPromise;
    if (!signer) {
      setActionError("Wallet not ready. Connect a signer.");
      return;
    }

    const usdtValue = parseUsdtInput(usdtInput);
    if (usdtValue === 0n) {
      setActionError("Enter a valid USDT amount.");
      return;
    }

    try {
      setTxMessage("Sending USDT → ETH swap...");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.swapUsdtForEth(usdtValue);
      await tx.wait();
      setTxMessage("Swap confirmed.");
      await refetchEncryptedBalance();
    } catch (error) {
      console.error(error);
      setActionError(error instanceof Error ? error.message : "Redeem failed");
    } finally {
      setTxMessage(null);
    }
  };

  const decryptBalance = async () => {
    setActionError(null);
    setDecrypting(true);
    setDecryptedBalance(null);

    if (!instance || !address || !encryptedBalance || encryptedBalance === ZeroHash) {
      setActionError("Nothing to decrypt yet.");
      setDecrypting(false);
      return;
    }

    try {
      const keypair = instance.generateKeypair();
      const contractAddresses = [CONTRACT_ADDRESS];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "5";
      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);

      const signer = await signerPromise;
      if (!signer) {
        throw new Error("Wallet not ready.");
      }

      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      const handleContractPairs = [
        {
          handle: encryptedBalance as string,
          contractAddress: CONTRACT_ADDRESS,
        },
      ];

      const decrypted = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const clearValue = decrypted[encryptedBalance as string];
      if (clearValue === undefined) {
        throw new Error("Unable to decrypt balance.");
      }

      const formatted = formatUsdt(BigInt(clearValue));
      setDecryptedBalance(formatted);
    } catch (error) {
      console.error(error);
      setActionError(error instanceof Error ? error.message : "Decryption failed");
    } finally {
      setDecrypting(false);
    }
  };

  const encryptedDisplay =
    encryptedBalance && encryptedBalance !== ZeroHash ? (encryptedBalance as string) : "Balance not initialized";

  return (
    <div className="app-shell">
      <Header />

      <main className="swap-shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Fixed rate 1 ETH = 3000 USDT</p>
            <h1 className="headline">Swap ETH into a private USDT ledger</h1>
            <p className="lede">
              Encrypted balances stay on-chain. Read with viem, write with ethers, decrypt with the Zama relayer.
            </p>
            {!contractReady && <div className="warning">Set the deployed Sepolia address in config to enable swaps.</div>}
          </div>
          <div className="pillars">
            <div className="stat">
              <p className="stat-label">ETH balance</p>
              <p className="stat-value">
                {ethBalance ? `${Number(ethBalance.formatted).toFixed(4)} ${ethBalance.symbol}` : "—"}
              </p>
            </div>
            <div className="stat">
              <p className="stat-label">Encrypted USDT</p>
              <p className="stat-value small">{balanceLoading ? "Loading..." : encryptedDisplay}</p>
            </div>
            <div className="stat">
              <p className="stat-label">Relayer</p>
              <p className="stat-value">{zamaLoading ? "Initializing..." : zamaError ? "Error" : "Ready"}</p>
            </div>
          </div>
        </section>

        <section className="card-grid">
          <div className="card">
            <div className="card-header">
              <p className="eyebrow">ETH → USDT</p>
              <h3>Mint encrypted USDT</h3>
            </div>
            <label className="field">
              <span>Amount in ETH</span>
              <input value={ethInput} onChange={(e) => setEthInput(e.target.value)} placeholder="0.10" />
            </label>
            <div className="quote">
              <span>Estimated USDT</span>
              <strong>{formatUsdt(usdtFromEth)} USDT</strong>
            </div>
            <button className="primary" onClick={handleSwapEthForUsdt} disabled={!isConnected || txMessage !== null}>
              {txMessage ?? "Swap to USDT"}
            </button>
          </div>

          <div className="card">
            <div className="card-header">
              <p className="eyebrow">USDT → ETH</p>
              <h3>Redeem to ETH</h3>
            </div>
            <label className="field">
              <span>Amount in USDT</span>
              <input value={usdtInput} onChange={(e) => setUsdtInput(e.target.value)} placeholder="1500" />
            </label>
            <div className="quote">
              <span>Estimated ETH</span>
              <strong>{ethers.formatEther(ethFromUsdt)} ETH</strong>
            </div>
            <button className="ghost" onClick={handleSwapUsdtForEth} disabled={!isConnected || txMessage !== null}>
              {txMessage ?? "Swap to ETH"}
            </button>
          </div>

          <div className="card wide">
            <div className="card-header">
              <p className="eyebrow">Encrypted balance</p>
              <h3>Decrypt with the relayer</h3>
            </div>
            <div className="cipher-row">
              <div>
                <p className="cipher-label">Ciphertext</p>
                <p className="cipher-value">{balanceLoading ? "Loading..." : encryptedDisplay}</p>
              </div>
              <button className="primary" onClick={decryptBalance} disabled={decrypting || !isConnected}>
                {decrypting ? "Decrypting..." : "Decrypt USDT"}
              </button>
            </div>
            <div className="quote">
              <span>Clear balance</span>
              <strong>{decryptedBalance ? `${decryptedBalance} USDT` : "Hidden until you decrypt"}</strong>
            </div>
          </div>
        </section>

        {actionError && <div className="error-bar">{actionError}</div>}
      </main>
    </div>
  );
}
