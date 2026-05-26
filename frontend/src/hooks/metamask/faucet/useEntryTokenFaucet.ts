'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    useAccount,
    useBlockNumber,
    useReadContract,
    useSwitchChain,
    useWaitForTransactionReceipt,
    useWriteContract,
} from 'wagmi';
import { Address, isAddress } from 'viem';
import { entryTokenFaucetAbi } from '@/hooks/metamask/lib/abis';
import { getErrorMessage } from '@/hooks/shared/lib/errors';
import { isTargetNetwork, targetChainId, targetNetworkLabel } from '@/lib/targetNetwork';

const ENTRY_TOKEN_ENV = process.env.NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

export function useEntryTokenFaucet() {
    const { address, isConnected, chainId } = useAccount();
    const { switchChain } = useSwitchChain();
    const [actionError, setActionError] = useState('');

    const entryTokenAddress = useMemo(
        () =>
            typeof ENTRY_TOKEN_ENV === 'string' && isAddress(ENTRY_TOKEN_ENV) ? (ENTRY_TOKEN_ENV as Address) : undefined,
        []
    );

    const {
        writeContractAsync,
        data: claimHash,
        isPending: isClaimPending,
        reset,
    } = useWriteContract();

    const { isLoading: isClaimConfirming, isSuccess: isClaimConfirmed } = useWaitForTransactionReceipt({
        hash: claimHash,
        chainId: targetChainId,
    });

    const { data: blockNumber } = useBlockNumber({ chainId: targetChainId, watch: true });
    const { data: balanceData, refetch: refetchBalance } = useReadContract({
        address: entryTokenAddress ?? ZERO_ADDRESS,
        abi: entryTokenFaucetAbi,
        functionName: 'balanceOf',
        chainId: targetChainId,
        args: address ? [address] : undefined,
        query: {
            enabled: Boolean(entryTokenAddress && address),
            refetchInterval: 2000,
        },
    });

    useEffect(() => {
        if (!blockNumber) return;
        void refetchBalance();
    }, [blockNumber, refetchBalance]);

    const canClaim = isConnected && !isClaimPending && !isClaimConfirming && Boolean(entryTokenAddress);
    const isWrongNetwork = isConnected && !isTargetNetwork(chainId);

    const switchToTargetNetwork = useCallback(() => {
        switchChain({ chainId: targetChainId });
    }, [switchChain]);

    const claim = useCallback(async () => {
        try {
            setActionError('');
            if (!entryTokenAddress) {
                setActionError('`NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS` is missing or invalid.');
                return;
            }
            if (!isTargetNetwork(chainId)) {
                setActionError(`Please switch your wallet network to ${targetNetworkLabel}.`);
                return;
            }

            await writeContractAsync({
                address: entryTokenAddress,
                abi: entryTokenFaucetAbi,
                functionName: 'claimTestTokens',
                args: [],
            });
        } catch (error) {
            setActionError(getErrorMessage(error, 'Failed to claim faucet tokens.'));
        }
    }, [chainId, entryTokenAddress, writeContractAsync]);

    return {
        entryTokenAddress: ENTRY_TOKEN_ENV ?? null,
        walletAddress: address ?? null,
        isWrongNetwork,
        switchToTargetNetwork,
        targetNetworkLabel,
        claim,
        claimHash,
        isClaimPending,
        isClaimConfirming,
        isClaimConfirmed,
        canClaim,
        actionError,
        currentLetBalance: balanceData,
        resetTransaction: reset,
    };
}
