'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isAddress } from 'viem';
import type { AALottoSummary } from '@/lib/aa/types';
import { fetchLottoListSummaries, fetchLottoSummaries } from '@/lib/aa/reads/fetchLottoSummaries';
import { targetRpcUrl } from '@/lib/targetNetwork';

type UseAALottoInstancesOptions = {
    enabled?: boolean;
    refetchIntervalMs?: number;
    /** Fewer eth_calls per instance for list UIs (join-lottery page). */
    listOnly?: boolean;
};

export function useAALottoInstances(
    lottoFactoryAddress: string | undefined,
    options?: UseAALottoInstancesOptions
) {
    const enabled =
        options?.enabled ??
        Boolean(lottoFactoryAddress && isAddress(lottoFactoryAddress));
    const refetchIntervalMs = options?.refetchIntervalMs;
    const listOnly = options?.listOnly ?? false;

    const [lottoInstances, setLottoInstances] = useState<AALottoSummary[]>([]);
    const [isLoadingLottoInstances, setIsLoadingLottoInstances] = useState(false);
    const [lottoInstancesError, setLottoInstancesError] = useState('');
    const requestSeqRef = useRef(0);

    const fetchLottoInstances = useCallback(async () => {
        if (!enabled || !lottoFactoryAddress || !isAddress(lottoFactoryAddress)) {
            return;
        }

        const requestId = ++requestSeqRef.current;
        setIsLoadingLottoInstances(true);
        setLottoInstancesError('');

        const rpcUrl = targetRpcUrl;
        if (!rpcUrl) {
            if (requestId !== requestSeqRef.current) return;
            setLottoInstancesError('NEXT_PUBLIC_RPC_URL is required.');
            setLottoInstances([]);
            setIsLoadingLottoInstances(false);
            return;
        }

        try {
            const summaries = listOnly
                ? await fetchLottoListSummaries(rpcUrl, lottoFactoryAddress)
                : await fetchLottoSummaries(rpcUrl, lottoFactoryAddress);
            if (requestId !== requestSeqRef.current) return;
            setLottoInstances(summaries);
        } catch (error) {
            if (requestId !== requestSeqRef.current) return;
            const message = error instanceof Error ? error.message : 'Failed to load lottery instances.';
            setLottoInstancesError(message);
            setLottoInstances([]);
        } finally {
            if (requestId === requestSeqRef.current) {
                setIsLoadingLottoInstances(false);
            }
        }
    }, [enabled, listOnly, lottoFactoryAddress]);

    useEffect(() => {
        if (!enabled) return;
        void fetchLottoInstances();
    }, [enabled, fetchLottoInstances]);

    useEffect(() => {
        if (!enabled || !refetchIntervalMs) return;
        const id = setInterval(() => {
            void fetchLottoInstances();
        }, refetchIntervalMs);
        return () => clearInterval(id);
    }, [enabled, fetchLottoInstances, refetchIntervalMs]);

    const resetLottoInstances = useCallback(() => {
        setLottoInstances([]);
        setIsLoadingLottoInstances(false);
        setLottoInstancesError('');
    }, []);

    return {
        lottoInstances,
        isLoadingLottoInstances,
        lottoInstancesError,
        fetchLottoInstances,
        resetLottoInstances,
    };
}
