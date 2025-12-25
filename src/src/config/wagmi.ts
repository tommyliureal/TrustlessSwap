import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { http } from 'viem';

export const config = getDefaultConfig({
  appName: 'Trustless Swap',
  projectId: '1f925f28a1c443388ed40c6def7e0919',
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
  ssr: false,
});
