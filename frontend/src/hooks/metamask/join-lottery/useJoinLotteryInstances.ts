'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useAccount, useBlockNumber, useReadContract, useReadContracts } from 'wagmi';
import { Address } from 'viem';
import lottoFactoryAbi from '@/contracts/LottoFactory.json';
import type { JoinLottoInstanceSummary } from '@/hooks/metamask/join-lottery/types';
import { LOTTO_FACTORY_ADDRESS } from '@/hooks/shared/factory/constants';
import { lottoInstanceReadAbi } from '@/hooks/shared/factory/lottoInstanceReadAbi';
import { toBigIntValue } from '@/hooks/shared/lib/bigint';
import { lottoStateToLabel } from '@/hooks/shared/lib/lottoState';
import { isTargetNetwork, targetChainId, targetNetworkLabel } from '@/lib/targetNetwork';

export type { JoinLottoInstanceSummary };

export { lottoStateToLabel };

const READS_PER_LOTTO = 5;

export function useJoinLotteryInstances() {
    const { chainId } = useAccount();

    const {
        data: lottoAddresses,
        isLoading: isLoadingLottoAddresses,
        isError: isLottoAddressesError,
        refetch: refetchLottoAddresses,
    } = useReadContract({
        address: LOTTO_FACTORY_ADDRESS,
        abi: lottoFactoryAbi,
        functionName: 'getAllLottos',
        chainId: targetChainId,
        query: {
            enabled: true,
            refetchInterval: 5000,
        },
    });

    const parsedLottoAddresses = useMemo(() => {
        if (!lottoAddresses) return [] as Address[];
        return lottoAddresses as Address[];
    }, [lottoAddresses]);

    const lottoReadContracts = useMemo(
        () =>
            parsedLottoAddresses.flatMap((lottoAddress) => [
                {
                    address: lottoAddress,
                    abi: lottoInstanceReadAbi,
                    functionName: 'getPlayerCount' as const,
                    chainId: targetChainId,
                },
                {
                    address: lottoAddress,
                    abi: lottoInstanceReadAbi,
                    functionName: 'maxPlayers' as const,
                    chainId: targetChainId,
                },
                {
                    address: lottoAddress,
                    abi: lottoInstanceReadAbi,
                    functionName: 'entryFee' as const,
                    chainId: targetChainId,
                },
                {
                    address: lottoAddress,
                    abi: lottoInstanceReadAbi,
                    functionName: 'lottoState' as const,
                    chainId: targetChainId,
                },
                {
                    address: lottoAddress,
                    abi: lottoInstanceReadAbi,
                    functionName: 'isPrizeWithdrawn' as const,
                    chainId: targetChainId,
                },
            ]),
        [parsedLottoAddresses]
    );

    const {
        data: lottoReadResults,
        isLoading: isLoadingLottoStats,
        refetch: refetchLottoStats,
    } = useReadContracts({
        contracts: lottoReadContracts,
        query: {
            enabled: parsedLottoAddresses.length > 0,
            refetchInterval: 3000,
        },
    });

    const { data: blockNumber } = useBlockNumber({
        chainId: targetChainId,
        watch: true,
        query: {
            enabled: parsedLottoAddresses.length > 0,
        },
    });

    useEffect(() => {
        if (!blockNumber) return;
        void refetchLottoStats();
    }, [blockNumber, refetchLottoStats]);

    const lottoSummaries = useMemo(() => {
        if (!lottoReadResults || parsedLottoAddresses.length === 0) {
            return new Map<Address, JoinLottoInstanceSummary>();
        }

        const resultMap = new Map<Address, JoinLottoInstanceSummary>();

        parsedLottoAddresses.forEach((lottoAddress, index) => {
            const base = index * READS_PER_LOTTO;
            const playerCountResult = lottoReadResults[base];
            const maxPlayersResult = lottoReadResults[base + 1];
            const entryFeeResult = lottoReadResults[base + 2];
            const lottoStateResult = lottoReadResults[base + 3];
            const isPrizeWithdrawnResult = lottoReadResults[base + 4];

            resultMap.set(lottoAddress, {
                playerCount:
                    playerCountResult?.status === 'success' ? toBigIntValue(playerCountResult.result) : undefined,
                maxPlayers:
                    maxPlayersResult?.status === 'success' ? toBigIntValue(maxPlayersResult.result) : undefined,
                entryFee: entryFeeResult?.status === 'success' ? toBigIntValue(entryFeeResult.result) : undefined,
                lottoState: lottoStateResult?.status === 'success' ? toBigIntValue(lottoStateResult.result) : undefined,
                isPrizeWithdrawn:
                    isPrizeWithdrawnResult?.status === 'success'
                        ? Boolean(isPrizeWithdrawnResult.result)
                        : undefined,
            });
        });

        return resultMap;
    }, [lottoReadResults, parsedLottoAddresses]);

    const refreshInstances = useCallback(async () => {
        await refetchLottoAddresses();
        if (parsedLottoAddresses.length > 0) {
            await refetchLottoStats();
        }
    }, [parsedLottoAddresses.length, refetchLottoAddresses, refetchLottoStats]);

    const isWrongNetwork = chainId !== undefined && !isTargetNetwork(chainId);

    return {
        isWrongNetwork,
        targetNetworkLabel,
        parsedLottoAddresses,
        isLoadingLottoAddresses,
        isLottoAddressesError,
        isLoadingLottoStats,
        lottoSummaries,
        refreshInstances,
    };
}
