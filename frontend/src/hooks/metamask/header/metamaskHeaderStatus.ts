'use client';

import { useSyncExternalStore } from 'react';
import { isAddress } from 'viem';
import { fetchLetBalanceForAccount } from '@/lib/aa/reads/fetchLetBalance';

const ENTRY_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS;

type MetamaskHeaderStatusState = {
    walletAddress: string;
    letBalance: bigint | null;
    isRefreshing: boolean;
    error: string;
};

let headerState: MetamaskHeaderStatusState = {
    walletAddress: '',
    letBalance: null,
    isRefreshing: false,
    error: '',
};

const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((listener) => listener());
}

function setHeaderState(next: Partial<MetamaskHeaderStatusState>) {
    headerState = { ...headerState, ...next };
    emit();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot() {
    return headerState;
}

async function resolveLetBalance(walletAddress: string): Promise<bigint | null> {
    if (!ENTRY_TOKEN_ADDRESS || !isAddress(ENTRY_TOKEN_ADDRESS)) {
        return null;
    }
    return fetchLetBalanceForAccount(walletAddress, ENTRY_TOKEN_ADDRESS);
}

export function resetMetamaskHeaderStatus() {
    headerState = {
        walletAddress: '',
        letBalance: null,
        isRefreshing: false,
        error: '',
    };
    emit();
}

export async function refreshMetamaskHeaderStatus(walletAddress: string): Promise<void> {
    if (!isAddress(walletAddress)) {
        resetMetamaskHeaderStatus();
        return;
    }

    setHeaderState({ walletAddress, isRefreshing: true, error: '' });
    try {
        const letBalance = await resolveLetBalance(walletAddress);
        setHeaderState({ letBalance, isRefreshing: false, error: '' });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to refresh MetaMask header status.';
        setHeaderState({ isRefreshing: false, error: message });
    }
}

export async function refreshMetamaskHeaderLetBalance(): Promise<void> {
    const { walletAddress } = headerState;
    if (!walletAddress || !isAddress(walletAddress)) {
        return;
    }

    setHeaderState({ isRefreshing: true, error: '' });
    try {
        const letBalance = await resolveLetBalance(walletAddress);
        setHeaderState({ letBalance, isRefreshing: false, error: '' });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to refresh LET balance.';
        setHeaderState({ isRefreshing: false, error: message });
    }
}

export function useMetamaskHeaderStatus() {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
