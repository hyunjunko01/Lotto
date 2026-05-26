'use client';

import { useCallback, useEffect, useState } from 'react';
import { decodeFunctionResult, encodeFunctionData, isAddress } from 'viem';
import { ERC20_ALLOWANCE_ABI, ERC20_BALANCE_OF_ABI } from '@/lib/aa/abis';
import type { AALotteryMode } from '@/lib/aa/types';
import { targetRpcUrl } from '@/lib/targetNetwork';

type UseAATokenReadsParams = {
    mode: AALotteryMode;
    accountAddress: string;
    entryTokenAddress?: string;
    selectedJoinEntryToken: string;
    joinTargetAddress: string;
};

export function useAATokenReads({
    mode,
    accountAddress,
    entryTokenAddress,
    selectedJoinEntryToken,
    joinTargetAddress,
}: UseAATokenReadsParams) {
    const [letBalance, setLetBalance] = useState<bigint | null>(null);
    const [joinEntryAllowance, setJoinEntryAllowance] = useState<bigint | null>(null);

    const fetchLetBalance = useCallback(async () => {
        if (!accountAddress || !isAddress(accountAddress)) {
            setLetBalance(null);
            return;
        }

        const tokenAddress =
            entryTokenAddress && isAddress(entryTokenAddress)
                ? entryTokenAddress
                : selectedJoinEntryToken && isAddress(selectedJoinEntryToken)
                  ? selectedJoinEntryToken
                  : '';
        if (!tokenAddress) {
            setLetBalance(null);
            return;
        }

        try {
            const rpcUrl = targetRpcUrl || 'http://127.0.0.1:8545';
            const callData = encodeFunctionData({
                abi: ERC20_BALANCE_OF_ABI,
                functionName: 'balanceOf',
                args: [accountAddress as `0x${string}`],
            });
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_call',
                    params: [{ to: tokenAddress, data: callData }, 'latest'],
                }),
            });
            const json = (await response.json()) as { result?: `0x${string}`; error?: { message?: string } };
            if (!response.ok || !json.result) {
                throw new Error(json.error?.message ?? 'Failed to fetch LET balance');
            }

            const balance = decodeFunctionResult({
                abi: ERC20_BALANCE_OF_ABI,
                functionName: 'balanceOf',
                data: json.result,
            }) as bigint;
            setLetBalance(balance);
        } catch (error) {
            console.error('Failed to fetch LET balance:', error);
            setLetBalance(null);
        }
    }, [accountAddress, entryTokenAddress, selectedJoinEntryToken]);

    const fetchJoinAllowance = useCallback(async () => {
        if (mode !== 'join') {
            setJoinEntryAllowance(null);
            return;
        }
        if (!accountAddress || !isAddress(accountAddress)) {
            setJoinEntryAllowance(null);
            return;
        }
        if (!joinTargetAddress || !isAddress(joinTargetAddress)) {
            setJoinEntryAllowance(null);
            return;
        }
        if (!selectedJoinEntryToken || !isAddress(selectedJoinEntryToken)) {
            setJoinEntryAllowance(null);
            return;
        }

        try {
            const rpcUrl = targetRpcUrl || 'http://127.0.0.1:8545';
            const callData = encodeFunctionData({
                abi: ERC20_ALLOWANCE_ABI,
                functionName: 'allowance',
                args: [accountAddress as `0x${string}`, joinTargetAddress as `0x${string}`],
            });
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_call',
                    params: [{ to: selectedJoinEntryToken, data: callData }, 'latest'],
                }),
            });
            const json = (await response.json()) as { result?: `0x${string}`; error?: { message?: string } };
            if (!response.ok || !json.result) {
                throw new Error(json.error?.message ?? 'Failed to fetch join allowance');
            }

            const allowance = decodeFunctionResult({
                abi: ERC20_ALLOWANCE_ABI,
                functionName: 'allowance',
                data: json.result,
            }) as bigint;
            setJoinEntryAllowance(allowance);
        } catch (error) {
            console.error('Failed to fetch join allowance:', error);
            setJoinEntryAllowance(null);
        }
    }, [accountAddress, joinTargetAddress, mode, selectedJoinEntryToken]);

    useEffect(() => {
        void fetchLetBalance();
    }, [fetchLetBalance]);

    useEffect(() => {
        void fetchJoinAllowance();
        const id = setInterval(() => {
            void fetchJoinAllowance();
        }, 3000);
        return () => clearInterval(id);
    }, [fetchJoinAllowance]);

    const resetTokenReads = useCallback(() => {
        setLetBalance(null);
        setJoinEntryAllowance(null);
    }, []);

    return {
        letBalance,
        joinEntryAllowance,
        fetchLetBalance,
        fetchJoinAllowance,
        resetTokenReads,
    };
}
