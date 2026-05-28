'use client';

import { ActionButtonsSection } from '@/components/aa/sections/ActionButtonsSection';
import { UserOpDetailsPanel } from '@/components/aa/workspace/common/UserOpDetailsPanel';
import sharedStyles from '@/components/aa/workspace/aaWorkspaceShared.module.css';

const FAUCET_LET_AMOUNT = '100';

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
        <div className={sharedStyles.pinkActionCard}>
            <div className={sharedStyles.actionStack}>
                <label className={sharedStyles.paramLabel}>
                    <span className={sharedStyles.paramLabelText}>Lotto Entry Token</span>
                    <input
                        readOnly
                        value={FAUCET_LET_AMOUNT}
                        aria-readonly
                        className={sharedStyles.paramInput}
                    />
                </label>
                <ActionButtonsSection
                    onExecute={onExecute}
                    isLoading={isLoading}
                    executeDisabled={executeDisabled}
                    label={executeLabel.toUpperCase()}
                    tone="neon-green"
                    marginTop={0}
                    compact
                />
                <button
                    type="button"
                    onClick={onToggleUserOpSettings}
                    className={sharedStyles.toggleButton}
                >
                    {showUserOpSettings ? '▼ Hide Auto UserOp Values' : '▶ View Auto UserOp Values'}
                </button>
            </div>
            {showUserOpSettings ? (
                <UserOpDetailsPanel
                    signResultHash={signResultHash}
                    bundlerResultHash={bundlerResultHash}
                    userOp={userOp}
                    panelClassName={sharedStyles.userOpPanel}
                    textClassName={sharedStyles.userOpText}
                />
            ) : null}
        </div>
    );
}
