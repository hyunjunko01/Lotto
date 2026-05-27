'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Address, isAddress } from 'viem';
import { useAALottery } from '@/hooks/aa/workspace/useAALottery';
import { getNextJoinAction } from '@/lib/aa/join/getNextJoinAction';
import type { AAJoinAction } from '@/lib/aa/types';
import { lottoStateToLabel, LottoState } from '@/hooks/shared/lib/lottoState';

const LOTTO_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS;
const ACCOUNT_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function useAALottoDetailPage() {
    const params = useParams<{ address: string }>();
    const rawAddress = params?.address;
    const lottoAddress = useMemo(
        () => (typeof rawAddress === 'string' && isAddress(rawAddress) ? (rawAddress as Address) : undefined),
        [rawAddress]
    );

    const isReady = useMemo(() => Boolean(process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID), []);
    const hasValidConfig = useMemo(
        () =>
            typeof LOTTO_FACTORY_ADDRESS === 'string' &&
            typeof ACCOUNT_FACTORY_ADDRESS === 'string' &&
            isAddress(LOTTO_FACTORY_ADDRESS) &&
            isAddress(ACCOUNT_FACTORY_ADDRESS),
        []
    );

    const [expandedAction, setExpandedAction] = useState<AAJoinAction | null>(null);
    const [currentTimestamp, setCurrentTimestamp] = useState(() => BigInt(Math.floor(Date.now() / 1000)));

    const aa = useAALottery({
        mode: 'join',
        lottoFactoryAddress: (LOTTO_FACTORY_ADDRESS as Address | undefined) ?? '0x0000000000000000000000000000000000000000',
        accountFactoryAddress: (ACCOUNT_FACTORY_ADDRESS as Address | undefined) ?? '0x0000000000000000000000000000000000000000',
        initialJoinTargetAddress: lottoAddress ?? '',
        gasEstimateMode: 'manual',
    });

    const mustRefreshAAAccount = Boolean(aa.sessionToken) && !aa.AAAccountHydrated && !aa.isLoading;

    const selectedSummary = useMemo(
        () => aa.lottoInstances.find((item) => item.address.toLowerCase() === (lottoAddress ?? '').toLowerCase()),
        [lottoAddress, aa.lottoInstances]
    );

    const joinEntryFeeWei = selectedSummary?.entryFee;
    const insufficientLetKnown =
        aa.AAAccountHydrated && aa.letBalance !== null && joinEntryFeeWei !== undefined && aa.letBalance < joinEntryFeeWei;

    const statusNumber = selectedSummary?.lottoState !== undefined ? Number(selectedSummary.lottoState) : undefined;
    const canApproveOrJoin = statusNumber === LottoState.OPEN;
    const canRequestWinner = statusNumber === LottoState.FULL;
    const refundTimeoutAt =
        selectedSummary?.randomnessRequestedAt !== undefined && selectedSummary.calculatingTimeout !== undefined
            ? selectedSummary.randomnessRequestedAt + selectedSummary.calculatingTimeout
            : undefined;
    const isRefundTimeoutElapsed =
        statusNumber === LottoState.CALCULATING &&
        refundTimeoutAt !== undefined &&
        currentTimestamp >= refundTimeoutAt;
    const canTriggerRefundMode = isRefundTimeoutElapsed;
    const winnerAddr = selectedSummary?.winner;
    const hasWinner = Boolean(winnerAddr && winnerAddr.toLowerCase() !== ZERO_ADDRESS.toLowerCase());
    const isAAAccountWinner =
        Boolean(aa.accountAddress && winnerAddr && hasWinner) &&
        aa.accountAddress!.toLowerCase() === winnerAddr!.toLowerCase();
    const canWithdrawPrize =
        statusNumber === LottoState.CLOSED && !selectedSummary?.isPrizeWithdrawn && isAAAccountWinner;
    const canClaimRefund = statusNumber === LottoState.REFUNDING;

    const nextJoinAction = useMemo(
        () =>
            getNextJoinAction({
                canApproveOrJoin,
                hasSufficientJoinAllowance: aa.hasSufficientJoinAllowance,
                canRequestWinner,
                canTriggerRefundMode,
                canWithdrawPrize,
                canClaimRefund,
            }),
        [
            aa.hasSufficientJoinAllowance,
            canApproveOrJoin,
            canClaimRefund,
            canRequestWinner,
            canTriggerRefundMode,
            canWithdrawPrize,
        ]
    );

    useEffect(() => {
        if (!lottoAddress || !selectedSummary) return;
        aa.handleSelectJoinTarget(lottoAddress, selectedSummary.entryFee, selectedSummary.entryToken);
    }, [aa.handleSelectJoinTarget, lottoAddress, selectedSummary]);

    useEffect(() => {
        const id = setInterval(() => {
            setCurrentTimestamp(BigInt(Math.floor(Date.now() / 1000)));
        }, 1000);
        return () => clearInterval(id);
    }, []);

    return {
        rawAddress,
        lottoAddress,
        lottoFactoryAddressText: LOTTO_FACTORY_ADDRESS ?? '(missing NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS)',
        isReady,
        hasValidConfig,
        expandedAction,
        setExpandedAction,
        stateLabel: lottoStateToLabel,
        mustRefreshAAAccount,
        selectedSummary,
        joinEntryFeeWei,
        insufficientLetKnown,
        statusNumber,
        canApproveOrJoin,
        canRequestWinner,
        canWithdrawPrize,
        canTriggerRefundMode,
        refundTimeoutAt,
        isRefundTimeoutElapsed,
        canClaimRefund,
        isAAAccountWinner,
        hasWinner,
        nextJoinAction,
        ...aa,
    };
}
