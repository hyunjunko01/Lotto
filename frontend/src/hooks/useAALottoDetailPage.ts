'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Address, isAddress } from 'viem';
import type { AAJoinAction } from '@/hooks/useAALottery';
import { useAALottery } from '@/hooks/useAALottery';
import { aaStateToLabel } from '@/hooks/useAAJoinLotteryIndex';

const LOTTO_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS;
const ACCOUNT_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export enum AALottoDetailState {
    OPEN = 0,
    FULL = 1,
    CALCULATING = 2,
    CLOSED = 3,
    REFUNDING = 4,
}

export const AA_LOTTO_JOIN_ACTION_CARDS = [
    {
        action: 'approveEntryFee' as const,
        title: 'approveEntryFee',
        description: 'Step 1 — AA account sets ERC20 allowance for this lottery (do this before joinLotto).',
    },
    {
        action: 'joinLotto' as const,
        title: 'joinLotto',
        description: 'Step 2 — After approve confirms and allowance ≥ entry fee, join the lottery.',
    },
    {
        action: 'requestWinner' as const,
        title: 'requestWinner',
        description: 'After the lottery is full, request winner selection through VRF.',
    },
    {
        action: 'triggerRefundMode' as const,
        title: 'triggerRefundMode',
        description: 'If VRF is stuck in CALCULATING past the timeout, switch the instance into REFUNDING mode.',
    },
    {
        action: 'withdrawPrize' as const,
        title: 'withdrawPrize',
        description: 'The recorded winner withdraws the prize.',
    },
    {
        action: 'claimRefund' as const,
        title: 'claimRefund',
        description: 'Claim your refundable entry fees after the instance enters REFUNDING mode.',
    },
] as const;

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

    const aa = useAALottery({
        mode: 'join',
        lottoFactoryAddress: (LOTTO_FACTORY_ADDRESS as Address | undefined) ?? '0x0000000000000000000000000000000000000000',
        accountFactoryAddress: (ACCOUNT_FACTORY_ADDRESS as Address | undefined) ?? '0x0000000000000000000000000000000000000000',
        initialJoinTargetAddress: lottoAddress ?? '',
    });

    const mustRefreshAaAccount = Boolean(aa.sessionToken) && !aa.aaAccountHydrated && !aa.isLoading;

    const selectedSummary = useMemo(
        () => aa.lottoInstances.find((item) => item.address.toLowerCase() === (lottoAddress ?? '').toLowerCase()),
        [lottoAddress, aa.lottoInstances]
    );

    const joinEntryFeeWei = selectedSummary?.entryFee;
    const insufficientLetKnown =
        aa.aaAccountHydrated && aa.letBalance !== null && joinEntryFeeWei !== undefined && aa.letBalance < joinEntryFeeWei;

    const statusNumber = selectedSummary?.lottoState !== undefined ? Number(selectedSummary.lottoState) : undefined;
    const canApproveOrJoin = statusNumber === AALottoDetailState.OPEN;
    const canRequestWinner = statusNumber === AALottoDetailState.FULL;
    const canTriggerRefundMode = statusNumber === AALottoDetailState.CALCULATING;
    const winnerAddr = selectedSummary?.winner;
    const hasWinner = Boolean(winnerAddr && winnerAddr.toLowerCase() !== ZERO_ADDRESS.toLowerCase());
    const isAaAccountWinner =
        Boolean(aa.accountAddress && winnerAddr && hasWinner) &&
        aa.accountAddress!.toLowerCase() === winnerAddr!.toLowerCase();
    const canWithdrawPrize =
        statusNumber === AALottoDetailState.CLOSED && !selectedSummary?.isPrizeWithdrawn && isAaAccountWinner;
    const canClaimRefund = statusNumber === AALottoDetailState.REFUNDING;

    useEffect(() => {
        if (!lottoAddress || !selectedSummary) return;
        aa.handleSelectJoinTarget(lottoAddress, selectedSummary.entryFee, selectedSummary.entryToken);
    }, [aa.handleSelectJoinTarget, lottoAddress, selectedSummary]);

    return {
        rawAddress,
        lottoAddress,
        lottoFactoryAddressText: LOTTO_FACTORY_ADDRESS ?? '(missing NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS)',
        isReady,
        hasValidConfig,
        expandedAction,
        setExpandedAction,
        stateLabel: (v?: bigint | number) => aaStateToLabel(v),
        mustRefreshAaAccount,
        selectedSummary,
        joinEntryFeeWei,
        insufficientLetKnown,
        statusNumber,
        canApproveOrJoin,
        canRequestWinner,
        canWithdrawPrize,
        canTriggerRefundMode,
        canClaimRefund,
        isAaAccountWinner,
        hasWinner,
        ...aa,
    };
}
