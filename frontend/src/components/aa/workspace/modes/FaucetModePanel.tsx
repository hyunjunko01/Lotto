'use client';

import { ActionButtonsSection } from '@/components/aa/sections/ActionButtonsSection';
import { UserOpDetailsPanel } from '@/components/aa/workspace/common/UserOpDetailsPanel';
import styles from '@/components/aa/workspace/AALotteryWorkspace.faucet.module.css';

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

export function FaucetModePanel({
    actionCardTitle,
    actionCardDescription,
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
    );
}
