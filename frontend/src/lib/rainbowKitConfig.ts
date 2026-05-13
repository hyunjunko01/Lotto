// src/lib/wagmi.ts
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { anvil, baseSepolia, mainnet, sepolia } from 'wagmi/chains';
import { http } from 'wagmi';
import { orderedWalletChains, targetChainId, targetRpcUrl } from '@/lib/targetNetwork';

let cachedConfig: ReturnType<typeof getDefaultConfig> | null = null;

export function getRainbowKitConfig() {
    if (cachedConfig) return cachedConfig;

    cachedConfig = getDefaultConfig({
        appName: "Tyler's Lotto DApp",
        // WalletConnect Project ID
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID!,

        // 
        chains: [...orderedWalletChains(), mainnet],

        //
        transports: {
            [anvil.id]: http(targetChainId === anvil.id ? targetRpcUrl : 'http://127.0.0.1:8545'),
            [sepolia.id]: targetChainId === sepolia.id && targetRpcUrl ? http(targetRpcUrl) : http(),
            [baseSepolia.id]: targetChainId === baseSepolia.id && targetRpcUrl ? http(targetRpcUrl) : http(),
            [mainnet.id]: http(),
        },

        ssr: false,
    });

    return cachedConfig;
}