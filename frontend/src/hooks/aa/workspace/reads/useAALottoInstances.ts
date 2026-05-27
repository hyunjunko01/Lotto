'use client';

import { useCallback, useEffect, useState } from 'react';
import { isAddress } from 'viem';
import type { AALottoSummary } from '@/lib/aa/types';
import { fetchLottoSummaries } from '@/lib/aa/reads/fetchLottoSummaries';
import { targetRpcUrl } from '@/lib/targetNetwork';

type UseAALottoInstancesOptions = {
    enabled?: boolean;
    refetchIntervalMs?: number;
};

export function useAALottoInstances(
    lottoFactoryAddress: string | undefined,
    options?: UseAALottoInstancesOptions
) {
    const enabled =
        options?.enabled ??
        Boolean(lottoFactoryAddress && isAddress(lottoFactoryAddress));
    const refetchIntervalMs = options?.refetchIntervalMs;

    const [lottoInstances, setLottoInstances] = useState<AALottoSummary[]>([]);
    const [isLoadingLottoInstances, setIsLoadingLottoInstances] = useState(false);
    const [lottoInstancesError, setLottoInstancesError] = useState('');

    const fetchLottoInstances = useCallback(async () => {
        if (!enabled || !lottoFactoryAddress || !isAddress(lottoFactoryAddress)) {
            return;
        }

        setIsLoadingLottoInstances(true);
        setLottoInstancesError('');

        const rpcUrl = targetRpcUrl;
        if (!rpcUrl) {
            setLottoInstancesError('NEXT_PUBLIC_RPC_URL is required.');
            setLottoInstances([]);
            setIsLoadingLottoInstances(false);
            return;
        }

        try {
            const summaries = await fetchLottoSummaries(rpcUrl, lottoFactoryAddress);
            setLottoInstances(summaries);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load lottery instances.';
            setLottoInstancesError(message);
            setLottoInstances([]);
        } finally {
            setIsLoadingLottoInstances(false);
        }
    }, [enabled, lottoFactoryAddress]);

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
