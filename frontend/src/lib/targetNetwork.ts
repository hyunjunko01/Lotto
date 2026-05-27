import { anvil, baseSepolia, sepolia } from 'viem/chains';

const DEFAULT_TARGET_CHAIN_ID = anvil.id;

const SUPPORTED_TARGET_CHAINS = [anvil, sepolia, baseSepolia] as const;

function parseTargetChainId() {
    const rawChainId = process.env.NEXT_PUBLIC_CHAIN_ID;
    if (!rawChainId) {
        return DEFAULT_TARGET_CHAIN_ID;
    }

    const parsedChainId = Number(rawChainId);
    if (SUPPORTED_TARGET_CHAINS.some((chain) => chain.id === parsedChainId)) {
        return parsedChainId;
    }

    return DEFAULT_TARGET_CHAIN_ID;
}

export const targetChainId = parseTargetChainId();
export const targetChain = SUPPORTED_TARGET_CHAINS.find((chain) => chain.id === targetChainId) ?? anvil;
export const targetNetworkName = process.env.NEXT_PUBLIC_CHAIN_NAME || targetChain.name;
export const targetNetworkLabel = `${targetNetworkName} (${targetChainId})`;
export const targetRpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
export const targetLogLookbackBlocks = (() => {
    const rawLookback = process.env.NEXT_PUBLIC_LOG_LOOKBACK_BLOCKS;
    if (rawLookback) {
        const parsedLookback = Number(rawLookback);
        if (Number.isSafeInteger(parsedLookback) && parsedLookback > 0) {
            return BigInt(parsedLookback);
        }
    }

    return targetChainId === sepolia.id || targetChainId === baseSepolia.id ? BigInt(10) : BigInt(100_000);
})();

export function isTargetNetwork(chainId?: number) {
    return chainId === targetChainId;
}

export function targetChainIdHex() {
    return `0x${targetChainId.toString(16)}`;
}

export function orderedWalletChains() {
    const fallbackChains = SUPPORTED_TARGET_CHAINS.filter((chain) => chain.id !== targetChain.id);
    return [targetChain, ...fallbackChains] as [
        typeof SUPPORTED_TARGET_CHAINS[number],
        ...(typeof SUPPORTED_TARGET_CHAINS[number])[],
    ];
}
