import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Header() {
  return (
    <header className="swap-header">
      <div className="brand">
        <div className="brand-mark">TS</div>
        <div>
          <p className="brand-name">Trustless Swap</p>
          <p className="brand-subtitle">Encrypted USDT ledger on FHEVM</p>
        </div>
      </div>
      <div className="header-actions">
        <span className="network-chip">Sepolia · FHE</span>
        <ConnectButton chainStatus="name" />
      </div>
    </header>
  );
}
