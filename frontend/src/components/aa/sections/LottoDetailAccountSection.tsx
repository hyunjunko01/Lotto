'use client';

import { formatEther } from 'viem';
import { AASection } from '@/components/aa/layout/AASection';
import { AccountStatusSection } from '@/components/aa/sections/AccountStatusSection';
import { Web3AuthSection } from '@/components/aa/sections/Web3AuthSection';
import type { useAALottoDetailPage } from '@/hooks/aa/useAALottoDetailPage';
import type { AAUi } from '@/styles/aa/uiStyles';

type Detail = ReturnType<typeof useAALottoDetailPage>;

type Props = {
    ui: AAUi;
    d: Detail;
};

export function LottoDetailAccountSection({ ui, d }: Props) {
    return (
        <AASection ui={ui}>
            {!d.hasValidConfig ? (
                <p style={{ marginTop: 0, ...ui.warningText }}>
                    `NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS` or `NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS` is missing or invalid.
                    Check `.env.local` and restart the dev server.
                </p>
            ) : null}
            <Web3AuthSection
                onLogin={d.handleWeb3AuthLogin}
                isReady={d.isReady}
                isLoading={d.isLoading}
                onRefresh={d.handleRefresh}
                onLogout={d.handleLogout}
            />

            <AccountStatusSection
                status={d.status}
                email={d.email}
                accountAddress={d.accountAddress}
                accountDeployed={d.accountDeployed}
                letBalance={d.letBalance}
                signResultHash={d.signResultHash}
                bundlerResultHash={d.bundlerResultHash}
            />

            {d.mustRefreshAAAccount ? (
                <p style={{ marginTop: 14, ...ui.warningText, lineHeight: 1.55 }}>
                    Click <strong>Refresh Account State</strong> above to load your AA account and nonce before signing.
                </p>
            ) : null}

            {d.insufficientLetKnown ? (
                <p style={{ marginTop: 14, ...ui.warningText, lineHeight: 1.55 }}>
                    Not enough LET on your AA account for this entry fee. Use the AA token faucet page first, then approve
                    and join.
                </p>
            ) : null}

            {d.AAAccountHydrated && d.canApproveOrJoin && d.joinEntryFeeWei !== undefined ? (
                <p style={{ marginTop: 12, color: '#d4eaee', lineHeight: 1.55 }}>
                    <strong>Join flow (same order as MetaMask):</strong> first sign and send{' '}
                    <strong>approveEntryFee</strong>, wait until it confirms, then sign and send <strong>joinLotto</strong>{' '}
                    once allowance is at least the entry fee.
                </p>
            ) : null}

            {d.AAAccountHydrated && d.canApproveOrJoin && d.joinEntryFeeWei !== undefined ? (
                <p style={{ marginTop: 8, color: '#d4eaee' }}>
                    LET allowance (AA account → this lottery):{' '}
                    {d.joinEntryAllowance !== null ? formatEther(d.joinEntryAllowance) : '…'} / need{' '}
                    {formatEther(d.joinEntryFeeWei)}
                </p>
            ) : null}
        </AASection>
    );
}
