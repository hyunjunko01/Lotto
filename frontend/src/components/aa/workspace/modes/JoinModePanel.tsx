'use client';

import { ActionButtonsSection } from '@/components/aa/sections/ActionButtonsSection';
import { LottoParamsSection } from '@/components/aa/sections/LottoParamsSection';
import { UserOpDetailsPanel } from '@/components/aa/workspace/common/UserOpDetailsPanel';
import styles from '@/components/aa/workspace/AALotteryWorkspace.join.module.css';

type UserOpLike = {
    sender: string;
    nonce: string;
    initCode: string;
    callData: string;
    accountGasLimits: string;
    preVerificationGas: string;
    gasFees: string;
    paymasterAndData: string;
};

type Props = {
    actionCardTitle: string;
    actionCardDescription: string;
    entryFeeEth: string;
    setEntryFeeEth: (value: string) => void;
    maxPlayers: string;
    setMaxPlayers: (value: string) => void;
    joinTargetAddress: string;
    setJoinTargetAddress: (value: string) => void;
    joinValueEth: string;
    setJoinValueEth: (value: string) => void;
    onExecute: () => void;
    isLoading: boolean;
    executeDisabled: boolean;
    executeLabel: string;
    showUserOpSettings: boolean;
    onToggleUserOpSettings: () => void;
    signResultHash?: string;
    bundlerResultHash?: string;
    userOp: UserOpLike;
};

export function JoinModePanel({
    actionCardTitle,
    actionCardDescription,
    entryFeeEth,
    setEntryFeeEth,
    maxPlayers,
    setMaxPlayers,
    joinTargetAddress,
    setJoinTargetAddress,
    joinValueEth,
    setJoinValueEth,
    onExecute,
    isLoading,
    executeDisabled,
    executeLabel,
    showUserOpSettings,
    onToggleUserOpSettings,
    signResultHash,
    bundlerResultHash,
    userOp,
}: Props) {
    return (
        <>
            <LottoParamsSection
                mode="join"
                entryFeeEth={entryFeeEth}
                setEntryFeeEth={setEntryFeeEth}
                maxPlayers={maxPlayers}
                setMaxPlayers={setMaxPlayers}
                joinTargetAddress={joinTargetAddress}
                setJoinTargetAddress={setJoinTargetAddress}
                joinValueEth={joinValueEth}
                setJoinValueEth={setJoinValueEth}
            />
            <div className={styles.actionCard}>
                <h3 className={styles.actionCardTitle}>{actionCardTitle}</h3>
                <p className={styles.actionCardDescription}>{actionCardDescription}</p>
                <ActionButtonsSection
                    onExecute={onExecute}
                    isLoading={isLoading}
                    executeDisabled={executeDisabled}
                    label={executeLabel}
                />
                <button
                    type="button"
                    onClick={onToggleUserOpSettings}
                    className={styles.toggleButton}
                >
                    {showUserOpSettings ? '▼ Hide Auto UserOp Values' : '▶ View Auto UserOp Values'}
                </button>
                {showUserOpSettings ? (
                    <UserOpDetailsPanel
                        signResultHash={signResultHash}
                        bundlerResultHash={bundlerResultHash}
                        userOp={userOp}
                        panelClassName={styles.userOpPanel}
                        textClassName={styles.userOpText}
                    />
                ) : null}
            </div>
        </>
    );
}
