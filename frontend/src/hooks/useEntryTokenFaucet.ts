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
import { Address, BaseError, isAddress } from 'viem';

const ENTRY_TOKEN_ENV = process.env.NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS;
const ANVIL_CHAIN_ID = 31337;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

const entryTokenAbi = [
    {
        type: 'function',
        name: 'claimTestTokens',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof BaseError) return error.shortMessage || fallback;
    if (error instanceof Error) return error.message || fallback;
    return fallback;
}

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

    const { isLoading: isClaimConfirming, isSuccess: isClaimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash });

    const { data: blockNumber } = useBlockNumber({ watch: true });
    const { data: balanceData, refetch: refetchBalance } = useReadContract({
        address: entryTokenAddress ?? ZERO_ADDRESS,
        abi: entryTokenAbi,
        functionName: 'balanceOf',
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
    const isWrongNetwork = isConnected && chainId !== ANVIL_CHAIN_ID;

    const switchToAnvil = useCallback(() => {
        switchChain({ chainId: ANVIL_CHAIN_ID });
    }, [switchChain]);

    const claim = useCallback(async () => {
        try {
            setActionError('');
            if (!entryTokenAddress) {
                setActionError('`NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS` is missing or invalid.');
                return;
            }
            if (chainId !== ANVIL_CHAIN_ID) {
                setActionError('Please switch your wallet network to Anvil (chainId 31337).');
                return;
            }

            await writeContractAsync({
                address: entryTokenAddress,
                abi: entryTokenAbi,
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
        switchToAnvil,
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
