'use client';

import { useCallback, useState } from 'react';
import {
    useAccount,
    useReadContract,
    useSwitchChain,
    useWaitForTransactionReceipt,
    useWriteContract,
} from 'wagmi';
import { Address, BaseError, isAddress, parseEther } from 'viem';
import { isTargetNetwork, targetChainId, targetNetworkLabel, targetNetworkName } from '@/lib/targetNetwork';

const ANVIL_LOTTO_FACTORY_ADDRESS: Address = '0x7a2088a1bFc9d81c55368AE168C2C02570cB814F';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
const LOTTO_FACTORY_ADDRESS =
    (process.env.NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS as Address | undefined) ?? ANVIL_LOTTO_FACTORY_ADDRESS;
const ENTRY_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS;

const lottoFactoryCreateAbi = [
    {
        type: 'function',
        name: 'createLotto',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_entryFee', type: 'uint256' },
            { name: '_maxPlayers', type: 'uint256' },
            { name: '_entryToken', type: 'address' },
        ],
        outputs: [{ name: '', type: 'address' }],
    },
] as const;

const erc20ViewAbi = [
    {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof BaseError) {
        return error.shortMessage || fallback;
    }
    if (error instanceof Error) {
        return error.message || fallback;
    }
    return fallback;
}

export function useCreateLotto() {
    const { isConnected, chainId, address: connectedAddress } = useAccount();
    const { switchChain } = useSwitchChain();

    const hasValidEntryToken = typeof ENTRY_TOKEN_ADDRESS === 'string' && isAddress(ENTRY_TOKEN_ADDRESS);
    const isWrongNetwork = isConnected && !isTargetNetwork(chainId);

    const [entryFeeEth, setEntryFeeEth] = useState('0.01');
    const [maxPlayers, setMaxPlayers] = useState('5');
    const [actionError, setActionError] = useState('');

    const {
        writeContractAsync,
        data: createLottoHash,
        isPending: isCreateLottoPending,
        reset,
    } = useWriteContract();

    const { isLoading: isCreateLottoConfirming, isSuccess: isCreateLottoConfirmed } = useWaitForTransactionReceipt({
        hash: createLottoHash,
        chainId: targetChainId,
    });

    const { data: currentLetBalance } = useReadContract({
        address: hasValidEntryToken ? (ENTRY_TOKEN_ADDRESS as Address) : ZERO_ADDRESS,
        abi: erc20ViewAbi,
        functionName: 'balanceOf',
        chainId: targetChainId,
        args: connectedAddress ? [connectedAddress] : undefined,
        query: {
            enabled: Boolean(hasValidEntryToken && connectedAddress),
            refetchInterval: 2000,
        },
    });

    const canCreate = isConnected && hasValidEntryToken && !isCreateLottoPending && !isCreateLottoConfirming;

    const switchToTargetNetwork = useCallback(() => {
        switchChain({ chainId: targetChainId });
    }, [switchChain]);

    const createLotto = useCallback(async () => {
        try {
            setActionError('');

            if (!isTargetNetwork(chainId)) {
                setActionError(`Please switch your wallet network to ${targetNetworkLabel}.`);
                return;
            }

            const parsedEntryFee = parseEther(entryFeeEth);
            const parsedMaxPlayers = BigInt(maxPlayers);

            if (parsedEntryFee <= BigInt(0)) {
                setActionError('Entry fee must be greater than 0.');
                return;
            }

            if (parsedMaxPlayers <= BigInt(1)) {
                setActionError('Max players must be at least 2.');
                return;
            }
            if (!hasValidEntryToken) {
                setActionError('NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS is missing or invalid.');
                return;
            }

            await writeContractAsync({
                address: LOTTO_FACTORY_ADDRESS,
                abi: lottoFactoryCreateAbi,
                functionName: 'createLotto',
                args: [parsedEntryFee, parsedMaxPlayers, ENTRY_TOKEN_ADDRESS as Address],
            });
        } catch (error) {
            setActionError(getErrorMessage(error, 'Failed to create lottery instance.'));
        }
    }, [chainId, entryFeeEth, hasValidEntryToken, maxPlayers, writeContractAsync]);

    return {
        targetChainId,
        targetNetworkName,
        targetNetworkLabel,
        lottoFactoryAddress: LOTTO_FACTORY_ADDRESS,
        entryTokenAddress: ENTRY_TOKEN_ADDRESS ?? null,
        hasValidEntryToken,
        isConnected,
        isWrongNetwork,
        switchToTargetNetwork,
        entryFeeEth,
        setEntryFeeEth,
        maxPlayers,
        setMaxPlayers,
        actionError,
        createLotto,
        createLottoHash,
        isCreateLottoPending,
        isCreateLottoConfirming,
        isCreateLottoConfirmed,
        canCreate,
        currentLetBalance,
        resetTransaction: reset,
    };
}
