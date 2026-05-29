'use client';

import { ActionButtonsSection } from '@/components/aa/sections/ActionButtonsSection';
import aaSharedStyles from '@/components/aa/workspace/aaWorkspaceShared.module.css';
import sharedStyles from '@/components/metamask/workspace/metamaskWorkspaceShared.module.css';

const FAUCET_LET_AMOUNT = '100';

type Props = {
    onExecute: () => void;
    isLoading: boolean;
    executeDisabled: boolean;
    executeLabel: string;
};

export function MetamaskFaucetModePanel({ onExecute, isLoading, executeDisabled, executeLabel }: Props) {
    return (
        <div className={sharedStyles.pinkActionCard}>
            <div className={aaSharedStyles.actionStack}>
                <label className={aaSharedStyles.paramLabel}>
                    <span className={aaSharedStyles.paramLabelText}>Lotto Entry Token</span>
                    <input
                        readOnly
                        value={FAUCET_LET_AMOUNT}
                        aria-readonly
                        className={aaSharedStyles.paramInput}
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
            </div>
        </div>
    );
}
