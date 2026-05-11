'use client';

import { formatEther } from 'viem';
import { MetamaskSection } from '@/components/metamask/MetamaskSection';
import { useMetamaskUi } from '@/components/metamask/useMetamaskUi';
import { useCreateLotto } from '@/hooks/useCreateLotto';
import { getMetamaskTokens } from '@/styles/metamask/tokens';

export default function CreateLotteryPage() {
    const ui = useMetamaskUi('teal');
    const t = getMetamaskTokens('teal');

    const {
        anvilChainId,
        lottoFactoryAddress,
        entryTokenAddress,
        isWrongNetwork,
        switchToAnvil,
        entryFeeEth,
        setEntryFeeEth,
        maxPlayers,
        setMaxPlayers,
        actionError,
        createLotto,
        createLottoHash,
        isCreateLottoPending,
        isCreateLottoConfirming,
        isCreateLottoConfirmed,
        canCreate,
        currentLetBalance,
        resetTransaction,
    } = useCreateLotto();

    const isCreating = isCreateLottoPending || isCreateLottoConfirming;

    return (
        <main style={ui.pageMain}>
            <div style={ui.container}>
                <MetamaskSection ui={ui}>
                    <h1 style={ui.h1Flat}>Create Lottery</h1>
                    <p style={ui.bodyMuted}>
                        Enter lottery settings, then call factory.createLotto. Creating an instance only costs gas (native
                        ETH on this network); LET is used when players join, not to create.
                    </p>

                    {isWrongNetwork ? (
                        <div style={{ marginTop: 14 }}>
                            <p style={{ color: t.warnText }}>Wrong network detected. Please switch to Anvil (31337).</p>
                            <button type="button" onClick={switchToAnvil} style={ui.primaryButtonSm}>
                                Switch to Anvil
                            </button>
                        </div>
                    ) : null}
                </MetamaskSection>

                <MetamaskSection ui={ui}>
                    <label style={{ ...ui.label, marginBottom: 12 }}>
                        Entry Fee (LET)
                        <input
                            value={entryFeeEth}
                            onChange={(e) => setEntryFeeEth(e.target.value)}
                            placeholder="0.01"
                            style={ui.input}
                        />
                    </label>

                    <label style={{ ...ui.label, marginBottom: 16 }}>
                        Max Players
                        <input
                            value={maxPlayers}
                            onChange={(e) => setMaxPlayers(e.target.value)}
                            placeholder="5"
                            type="number"
                            min={2}
                            style={ui.input}
                        />
                    </label>

                    <button
                        type="button"
                        onClick={() => void createLotto()}
                        disabled={!canCreate}
                        style={canCreate ? ui.primaryButton : ui.primaryButtonDisabled}
                    >
                        {isCreating ? 'Creating...' : 'Create Lottery'}
                    </button>

                    {createLottoHash ? <p style={ui.monoInline}>Create tx: {createLottoHash}</p> : null}
                    {isCreateLottoConfirmed ? (
                        <p style={{ marginTop: 12, color: t.successText }}>Lottery instance created successfully.</p>
                    ) : null}
                    {actionError ? <p style={ui.errorBox}>{actionError}</p> : null}

                    {isCreateLottoConfirmed ? (
                        <button type="button" onClick={() => resetTransaction()} style={ui.secondaryButton}>
                            Clear transaction state
                        </button>
                    ) : null}
                </MetamaskSection>

                <p style={{ ...ui.monoNote, marginTop: 20 }}>
                    Factory address in use: {lottoFactoryAddress} (chainId {anvilChainId})
                </p>
                <p style={{ ...ui.monoNote, marginTop: 6 }}>
                    Entry token in use: {entryTokenAddress ?? '(missing NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS)'}
                </p>
                <p style={{ ...ui.monoNote, marginTop: 6 }}>
                    Current LET Balance: {typeof currentLetBalance === 'bigint' ? formatEther(currentLetBalance) : '-'}
                </p>
            </div>
        </main>
    );
}
