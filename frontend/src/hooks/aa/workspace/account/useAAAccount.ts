'use client';

import { useCallback, useEffect, useState } from 'react';
import { isAddress } from 'viem';
import type { AAAccountResponse, AANonceResponse } from '@/lib/aa/types';
import { deriveSaltFromOwnerAddress } from '@/lib/aa/userop/packing';
import { targetRpcUrl } from '@/lib/targetNetwork';

export function useAAAccount() {
    const [ownerAddress, setOwnerAddress] = useState('');
    const [accountAddress, setAccountAddress] = useState('');
    const [salt, setSalt] = useState('');
    const [accountDeployed, setAccountDeployed] = useState(false);
    const [accountNonce, setAccountNonce] = useState<bigint>(BigInt(0));
    const [AAAccountHydrated, setAAAccountHydrated] = useState(false);

    const fetchAAAccount = useCallback(async (owner: string): Promise<string> => {
        if (!isAddress(owner)) {
            throw new Error('Owner address is required.');
        }

        const params = new URLSearchParams({
            ownerAddress: owner,
            salt: deriveSaltFromOwnerAddress(owner as `0x${string}`),
        });
        const endpoint = `/api/aa/account?${params.toString()}`;
        const response = await fetch(endpoint, { method: 'GET' });

        const json = (await response.json()) as AAAccountResponse;
        if (!response.ok || !json.ok || !json.account) {
            throw new Error(json.error ?? 'AA account lookup failed.');
        }

        setOwnerAddress(json.account.ownerAddress);
        setAccountAddress(json.account.accountAddress);
        setSalt(json.account.salt);
        return json.account.accountAddress;
    }, []);

    const fetchAccountNonce = useCallback(async (sender: string): Promise<bigint> => {
        if (!isAddress(sender)) {
            return BigInt(0);
        }

        const response = await fetch(`/api/aa/userop/nonce?sender=${sender}`, { method: 'GET' });
        const json = (await response.json()) as AANonceResponse;
        if (!response.ok || !json.ok || json.nonce === undefined) {
            throw new Error(json.error ?? 'Failed to fetch account nonce.');
        }

        const nonce = BigInt(json.nonce);
        setAccountNonce(nonce);
        return nonce;
    }, []);

    useEffect(() => {
        if (!accountAddress) {
            setAccountDeployed(false);
            return;
        }

        const checkDeployed = async () => {
            try {
                const rpcUrl = targetRpcUrl || 'http://127.0.0.1:8545';
                const response = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'eth_getCode',
                        params: [accountAddress, 'latest'],
                        id: 1,
                    }),
                });

                const data = (await response.json()) as Record<string, unknown>;
                const code = (data.result as string) || '0x';
                setAccountDeployed(code !== '0x');
            } catch (error) {
                console.error('Failed to check account deployment:', error);
                setAccountDeployed(false);
            }
        };

        void checkDeployed();
    }, [accountAddress]);

    const resetAAAccount = useCallback(() => {
        setOwnerAddress('');
        setAccountAddress('');
        setSalt('');
        setAccountNonce(BigInt(0));
        setAccountDeployed(false);
        setAAAccountHydrated(false);
    }, []);

    return {
        ownerAddress,
        accountAddress,
        salt,
        accountDeployed,
        accountNonce,
        setAccountNonce,
        AAAccountHydrated,
        setAAAccountHydrated,
        fetchAAAccount,
        fetchAccountNonce,
        resetAAAccount,
    };
}
