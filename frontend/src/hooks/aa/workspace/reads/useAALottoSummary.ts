'use client';

import { useCallback, useEffect, useState } from 'react';
import { isAddress } from 'viem';
import { fetchLottoSummaryByAddress } from '@/lib/aa/reads/fetchLottoSummaries';
import type { AALottoSummary } from '@/lib/aa/types';
import { targetRpcUrl } from '@/lib/targetNetwork';

export function useAALottoSummary(lottoAddress?: string) {
    const [summary, setSummary] = useState<AALottoSummary | undefined>(undefined);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [summaryError, setSummaryError] = useState('');

    const fetchSummary = useCallback(async () => {
        if (!lottoAddress || !isAddress(lottoAddress)) {
            setSummary(undefined);
            return;
        }
        if (!targetRpcUrl) {
            setSummaryError('NEXT_PUBLIC_RPC_URL is required.');
            setSummary(undefined);
            return;
        }

        setIsLoadingSummary(true);
        setSummaryError('');
        try {
            const next = await fetchLottoSummaryByAddress(targetRpcUrl, lottoAddress);
            setSummary(next);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load lottery details.';
            setSummaryError(message);
            setSummary(undefined);
        } finally {
            setIsLoadingSummary(false);
        }
    }, [lottoAddress]);

    useEffect(() => {
        void fetchSummary();
    }, [fetchSummary]);

    return {
        summary,
        isLoadingSummary,
        summaryError,
        fetchSummary,
    };
}
