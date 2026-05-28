'use client';

import { useSyncExternalStore } from 'react';
import { isAddress } from 'viem';
import type { AAAccountResponse } from '@/lib/aa/types';
import { fetchLetBalanceForAccount } from '@/lib/aa/reads/fetchLetBalance';
import { deriveSaltFromOwnerAddress } from '@/lib/aa/userop/packing';

const ENTRY_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS;

type AAHeaderStatusState = {
    accountAddress: string;
    letBalance: bigint | null;
    isRefreshing: boolean;
    error: string;
};

let headerState: AAHeaderStatusState = {
    accountAddress: '',
    letBalance: null,
    isRefreshing: false,
    error: '',
};

const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((listener) => listener());
}

function setHeaderState(next: Partial<AAHeaderStatusState>) {
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

async function resolveAccountAddress(ownerAddress: string): Promise<string> {
    if (!isAddress(ownerAddress)) {
        throw new Error('Owner address is required.');
    }

    const params = new URLSearchParams({
        ownerAddress,
        salt: deriveSaltFromOwnerAddress(ownerAddress as `0x${string}`),
    });
    const response = await fetch(`/api/aa/account?${params.toString()}`, { method: 'GET' });
    const json = (await response.json()) as AAAccountResponse;
    if (!response.ok || !json.ok || !json.account) {
        throw new Error(json.error ?? 'AA account lookup failed.');
    }

    return json.account.accountAddress;
}

async function resolveLetBalance(accountAddress: string): Promise<bigint | null> {
    if (!ENTRY_TOKEN_ADDRESS || !isAddress(ENTRY_TOKEN_ADDRESS)) {
        return null;
    }
    return fetchLetBalanceForAccount(accountAddress, ENTRY_TOKEN_ADDRESS);
}

export function resetAAHeaderStatus() {
    headerState = {
        accountAddress: '',
        letBalance: null,
        isRefreshing: false,
        error: '',
    };
    emit();
}

export async function refreshAAHeaderStatus(ownerAddress: string): Promise<void> {
    if (!isAddress(ownerAddress)) {
        resetAAHeaderStatus();
        return;
    }

    setHeaderState({ isRefreshing: true, error: '' });
    try {
        const accountAddress = await resolveAccountAddress(ownerAddress);
        const letBalance = await resolveLetBalance(accountAddress);
        setHeaderState({ accountAddress, letBalance, isRefreshing: false, error: '' });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to refresh AA header status.';
        setHeaderState({ isRefreshing: false, error: message });
    }
}

export async function refreshAAHeaderLetBalance(): Promise<void> {
    const { accountAddress } = headerState;
    if (!accountAddress || !isAddress(accountAddress)) {
        return;
    }

    setHeaderState({ isRefreshing: true, error: '' });
    try {
        const letBalance = await resolveLetBalance(accountAddress);
        setHeaderState({ letBalance, isRefreshing: false, error: '' });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to refresh LET balance.';
        setHeaderState({ isRefreshing: false, error: message });
    }
}

export function useAAHeaderStatus() {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
