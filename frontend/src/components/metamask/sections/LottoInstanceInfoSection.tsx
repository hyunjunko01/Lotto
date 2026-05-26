'use client';

import { formatEther } from 'viem';
import { MetamaskSection } from '@/components/metamask/layout/MetamaskSection';
import type { useMetamaskLottoDetailPage } from '@/hooks/metamask/lotto-detail/useMetamaskLottoDetailPage';
import type { MetamaskUi } from '@/styles/metamask/uiStyles';

type Detail = ReturnType<typeof useMetamaskLottoDetailPage>;

type Props = {
    ui: MetamaskUi;
    d: Detail;
};

export function LottoInstanceInfoSection({ ui, d }: Props) {
    return (
        <MetamaskSection ui={ui}>
            <h2 style={ui.h2InSection}>Instance Information</h2>
            <div style={{ display: 'grid', gap: 8, ...ui.bodyMuted }}>
                <p style={{ margin: 0 }}>Status: {d.stateLabel(d.lottoStateValue)}</p>
                <p style={{ margin: 0 }}>Entry Fee: {d.entryFee !== undefined ? formatEther(d.entryFee) : '-'} LET</p>
                <p style={{ margin: 0 }}>Max Players: {d.maxPlayers !== undefined ? Number(d.maxPlayers) : '-'}</p>
                <p style={{ margin: 0 }}>Current Players: {d.playerCount !== undefined ? Number(d.playerCount) : '-'}</p>
                <p style={{ margin: 0 }}>
                    Remaining Spots: {d.remainingSpots !== undefined ? Number(d.remainingSpots) : '-'}
                </p>
                <p style={{ margin: 0 }}>
                    Current Pot: {d.lottoBalance !== undefined ? formatEther(d.lottoBalance) : '-'} LET
                </p>
                <p style={{ margin: 0, wordBreak: 'break-all' }}>Entry Token: {d.entryTokenAddress ?? '-'}</p>
                <p style={{ margin: 0 }}>
                    Your LET Balance:{' '}
                    {d.currentTokenBalance !== undefined ? formatEther(d.currentTokenBalance) : '-'}
                </p>
                <p style={{ margin: 0 }}>
                    Your Allowance: {d.currentAllowance !== undefined ? formatEther(d.currentAllowance) : '-'}
                </p>
                <p style={{ margin: 0 }}>
                    Your Refundable Amount:{' '}
                    {typeof d.refundableAmount === 'bigint' ? formatEther(d.refundableAmount) : '-'} LET
                </p>
                <p style={{ margin: 0, wordBreak: 'break-all' }}>Winner: {d.winner ?? '-'}</p>
                <p style={{ margin: 0, wordBreak: 'break-all' }}>Factory: {d.factory ?? '-'}</p>
                <p style={{ margin: 0 }}>requestId: {d.requestId || '-'}</p>
                <p style={{ margin: 0 }}>Randomness Requested: {d.isRandomnessRequested ? 'Yes' : 'No'}</p>
                <p style={{ margin: 0 }}>
                    randomnessRequestedAt:{' '}
                    {typeof d.randomnessRequestedAt === 'bigint' ? d.randomnessRequestedAt.toString() : '-'}
                </p>
                <p style={{ margin: 0 }}>
                    CALCULATING_TIMEOUT:{' '}
                    {typeof d.calculatingTimeout === 'bigint' ? `${d.calculatingTimeout.toString()} seconds` : '-'}
                </p>
                <p style={{ margin: 0 }}>
                    Refund timeout at: {d.refundTimeoutAt !== undefined ? d.refundTimeoutAt.toString() : '-'}
                </p>
                <p style={{ margin: 0 }}>Prize Withdrawn: {d.isPrizeWithdrawn ? 'Yes' : 'No'}</p>
            </div>
        </MetamaskSection>
    );
}
