// src/lib/wagmi.ts
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { anvil, mainnet, sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

export const config = getDefaultConfig({
    appName: "Tyler's Lotto DApp",
    // WalletConnect Project ID
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID!,

    // 
    chains: [anvil, sepolia, mainnet],

    //
    transports: {
        [anvil.id]: http('http://127.0.0.1:8545'),
        [sepolia.id]: http(),
        [mainnet.id]: http(),
    },

    ssr: true,
});