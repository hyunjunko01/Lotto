'use client';

import { ActionButtonsSection } from '@/components/aa/sections/ActionButtonsSection';
import { LottoParamsSection } from '@/components/aa/sections/LottoParamsSection';
import sharedStyles from '@/components/metamask/workspace/metamaskWorkspaceShared.module.css';
import styles from '@/components/metamask/workspace/MetamaskLotteryWorkspace.create.module.css';

type Props = {
    entryFeeEth: string;
    setEntryFeeEth: (value: string) => void;
    maxPlayers: string;
    setMaxPlayers: (value: string) => void;
    onExecute: () => void;
    isLoading: boolean;
    executeDisabled: boolean;
    executeLabel: string;
};

export function MetamaskCreateModePanel({
    entryFeeEth,
    setEntryFeeEth,
    maxPlayers,
    setMaxPlayers,
    onExecute,
    isLoading,
    executeDisabled,
    executeLabel,
}: Props) {
    return (
        <div className={sharedStyles.pinkActionCard}>
            <div className={styles.createParamsCard}>
                <LottoParamsSection
                    mode="create"
                    hideTitle
                    entryFeeEth={entryFeeEth}
                    setEntryFeeEth={setEntryFeeEth}
                    maxPlayers={maxPlayers}
                    setMaxPlayers={setMaxPlayers}
                    joinTargetAddress=""
                    setJoinTargetAddress={() => undefined}
                    joinValueEth=""
                    setJoinValueEth={() => undefined}
                />
            </div>
            <div className={styles.createActionCard}>
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
