'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    useAccount,
    usePublicClient,
    useReadContract,
    useReadContracts,
    useSwitchChain,
    useWaitForTransactionReceipt,
    useWriteContract,
} from 'wagmi';
import { Address, isAddress, parseEventLogs } from 'viem';
import lottoFactoryAbi from '@/contracts/LottoFactory.json';
import { erc20Abi, lottoInstanceAbi, ZERO_LOTTO_WINNER } from '@/hooks/metamask/lib/abis';
import { refreshMetamaskHeaderLetBalance } from '@/hooks/metamask/header/metamaskHeaderStatus';
import type { MetamaskDetailAction } from '@/hooks/metamask/lotto-detail/types';
import { getErrorMessage } from '@/hooks/shared/lib/errors';
import {
    executeDetailAction as runDetailWrite,
    parseRequestIdFromReceipt,
    waitForDetailActionReceipt,
} from '@/hooks/metamask/lotto-detail/executeDetailAction';
import { lottoStateToLabel, LottoState } from '@/hooks/shared/lib/lottoState';
import { isTargetNetwork, targetChainId, targetLogLookbackBlocks, targetNetworkLabel } from '@/lib/targetNetwork';

export function useMetamaskLottoDetailPage() {
    const params = useParams<{ address: string }>();
    const rawAddress = params?.address;
    const lottoAddress = useMemo(
        () => (typeof rawAddress === 'string' && isAddress(rawAddress) ? (rawAddress as Address) : undefined),
        [rawAddress]
    );

    const { address: connectedAddress, isConnected, chainId } = useAccount();
    const publicClient = usePublicClient({ chainId: targetChainId });
    const { switchChain } = useSwitchChain();
    const isWrongNetwork = isConnected && !isTargetNetwork(chainId);

    const [actionError, setActionError] = useState('');
    const [requestId, setRequestId] = useState('');
    const [currentTimestamp, setCurrentTimestamp] = useState(() => BigInt(Math.floor(Date.now() / 1000)));

    const { data: lottoBalance, refetch: refetchBalance } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'getLottoBalance',
        chainId: targetChainId,
        query: {
            enabled: Boolean(lottoAddress),
            refetchInterval: 3000,
        },
    });

    const { data: entryFee } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'entryFee',
        chainId: targetChainId,
        query: { enabled: Boolean(lottoAddress) },
    });

    const { data: maxPlayers } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'maxPlayers',
        chainId: targetChainId,
        query: { enabled: Boolean(lottoAddress) },
    });

    const { data: playerCount, refetch: refetchPlayerCount } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'getPlayerCount',
        chainId: targetChainId,
        query: {
            enabled: Boolean(lottoAddress),
            refetchInterval: 3000,
        },
    });

    const { data: remainingSpots, refetch: refetchRemainingSpots } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'getRemainingSpots',
        chainId: targetChainId,
        query: {
            enabled: Boolean(lottoAddress),
            refetchInterval: 3000,
        },
    });

    const { data: winner } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'winner',
        chainId: targetChainId,
        query: { enabled: Boolean(lottoAddress) },
    });

    const { data: factory } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'factory',
        chainId: targetChainId,
        query: { enabled: Boolean(lottoAddress) },
    });

    const { data: entryTokenAddress } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'entryToken',
        chainId: targetChainId,
        query: { enabled: Boolean(lottoAddress) },
    });

    const { data: lottoStateValue, refetch: refetchLottoState } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'lottoState',
        chainId: targetChainId,
        query: {
            enabled: Boolean(lottoAddress),
            refetchInterval: 3000,
        },
    });

    const { data: isRandomnessRequested } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'isRandomnessRequested',
        chainId: targetChainId,
        query: { enabled: Boolean(lottoAddress) },
    });

    const { data: isPrizeWithdrawn } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'isPrizeWithdrawn',
        chainId: targetChainId,
        query: { enabled: Boolean(lottoAddress) },
    });

    const { data: refundableAmount } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'refundableAmount',
        chainId: targetChainId,
        args: connectedAddress ? [connectedAddress] : undefined,
        query: {
            enabled: Boolean(lottoAddress && connectedAddress),
            refetchInterval: 3000,
        },
    });

    const { data: randomnessRequestedAt } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'randomnessRequestedAt',
        chainId: targetChainId,
        query: {
            enabled: Boolean(lottoAddress),
            refetchInterval: 3000,
        },
    });

    const { data: calculatingTimeout } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'CALCULATING_TIMEOUT',
        chainId: targetChainId,
        query: { enabled: Boolean(lottoAddress) },
    });

    const {
        writeContractAsync,
        data: actionTxHash,
        isPending: isActionPending,
    } = useWriteContract();

    const { data: tokenReadResults, refetch: refetchTokenReads } = useReadContracts({
        contracts:
            entryTokenAddress && connectedAddress && lottoAddress
                ? [
                      {
                          address: entryTokenAddress,
                          abi: erc20Abi,
                          functionName: 'allowance',
                          chainId: targetChainId,
                          args: [connectedAddress, lottoAddress],
                      },
                      {
                          address: entryTokenAddress,
                          abi: erc20Abi,
                          functionName: 'balanceOf',
                          chainId: targetChainId,
                          args: [connectedAddress],
                      },
                  ]
                : [],
        query: {
            enabled: Boolean(entryTokenAddress && connectedAddress && lottoAddress),
            refetchInterval: 3000,
        },
    });

    const { isLoading: isActionConfirming } = useWaitForTransactionReceipt({
        hash: actionTxHash,
        chainId: targetChainId,
    });

    const canExecute = isConnected && !isActionPending && !isActionConfirming;

    const statusNumber = lottoStateValue !== undefined ? Number(lottoStateValue) : undefined;
    const canJoin = statusNumber === LottoState.OPEN;
    const canRequest = statusNumber === LottoState.FULL;
    const hasWinner = Boolean(winner && winner !== ZERO_LOTTO_WINNER);
    const isConnectedWinner =
        Boolean(connectedAddress) &&
        hasWinner &&
        winner !== undefined &&
        connectedAddress!.toLowerCase() === winner.toLowerCase();
    const canWithdraw = statusNumber === LottoState.CLOSED && !isPrizeWithdrawn && isConnectedWinner;
    const refundTimeoutAt =
        typeof randomnessRequestedAt === 'bigint' && typeof calculatingTimeout === 'bigint'
            ? randomnessRequestedAt + calculatingTimeout
            : undefined;
    const isRefundTimeoutElapsed =
        statusNumber === LottoState.CALCULATING &&
        refundTimeoutAt !== undefined &&
        currentTimestamp >= refundTimeoutAt;
    const canTriggerRefundMode = isRefundTimeoutElapsed;
    const canClaimRefund =
        statusNumber === LottoState.REFUNDING &&
        typeof refundableAmount === 'bigint' &&
        refundableAmount > BigInt(0);
    const currentAllowance =
        tokenReadResults?.[0]?.status === 'success' && typeof tokenReadResults[0].result === 'bigint'
            ? tokenReadResults[0].result
            : undefined;
    const currentTokenBalance =
        tokenReadResults?.[1]?.status === 'success' && typeof tokenReadResults[1].result === 'bigint'
            ? tokenReadResults[1].result
            : undefined;
    const hasSufficientAllowance =
        entryFee !== undefined && currentAllowance !== undefined ? currentAllowance >= entryFee : false;
    const hasSufficientBalance =
        entryFee !== undefined && currentTokenBalance !== undefined ? currentTokenBalance >= entryFee : false;
    const insufficientLetKnown =
        connectedAddress != null &&
        entryFee !== undefined &&
        currentTokenBalance !== undefined &&
        currentTokenBalance < entryFee;

    const switchToTargetNetwork = () => switchChain({ chainId: targetChainId });

    const ensureReady = () => {
        if (!lottoAddress) {
            setActionError('Invalid lotto instance address in URL.');
            return false;
        }
        if (!isTargetNetwork(chainId)) {
            setActionError(`Please switch your wallet network to ${targetNetworkLabel}.`);
            return false;
        }
        return true;
    };

    useEffect(() => {
        const id = setInterval(() => {
            setCurrentTimestamp(BigInt(Math.floor(Date.now() / 1000)));
        }, 1000);
        return () => clearInterval(id);
    }, []);

    const refetchLottoInstanceState = useCallback(() => {
        void refetchLottoState();
        void refetchPlayerCount();
        void refetchRemainingSpots();
        void refetchBalance();
    }, [refetchBalance, refetchLottoState, refetchPlayerCount, refetchRemainingSpots]);

    const refetchAfterAction = useCallback(async () => {
        await Promise.all([refetchTokenReads(), refetchLottoInstanceState()]);
    }, [refetchLottoInstanceState, refetchTokenReads]);

    const executeDetailAction = useCallback(
        async (action: MetamaskDetailAction): Promise<boolean> => {
            if (!publicClient) {
                setActionError('RPC client is unavailable.');
                return false;
            }

            try {
                setActionError('');
                if (action === 'requestWinner') {
                    setRequestId('');
                }

                const hash = await runDetailWrite(action, {
                    lottoAddress,
                    entryTokenAddress: entryTokenAddress as Address | undefined,
                    entryFee: entryFee as bigint | undefined,
                    currentTokenBalance,
                    statusNumber,
                    refundableAmount: refundableAmount as bigint | undefined,
                    isConnectedWinner,
                    canJoin,
                    canRequest,
                    canWithdraw,
                    canTriggerRefundMode,
                    hasSufficientAllowance,
                    ensureReady,
                    publicClient,
                    writeContract: (args) =>
                        writeContractAsync(
                            args as Parameters<typeof writeContractAsync>[0]
                        ),
                });

                const receipt = await waitForDetailActionReceipt(publicClient, hash);

                if (action === 'requestWinner' && lottoAddress) {
                    const nextRequestId = parseRequestIdFromReceipt(lottoAddress, receipt.logs);
                    if (nextRequestId) {
                        setRequestId(nextRequestId);
                    }
                }

                void refreshMetamaskHeaderLetBalance();
                return true;
            } catch (error) {
                setActionError(getErrorMessage(error, 'Failed to execute transaction.'));
                return false;
            }
        },
        [
            canJoin,
            canRequest,
            canTriggerRefundMode,
            canWithdraw,
            currentTokenBalance,
            entryFee,
            entryTokenAddress,
            ensureReady,
            hasSufficientAllowance,
            isConnectedWinner,
            lottoAddress,
            publicClient,
            refetchAfterAction,
            refundableAmount,
            statusNumber,
            writeContractAsync,
        ]
    );

    useEffect(() => {
        const loadLatestRequestId = async () => {
            if (!publicClient || !lottoAddress || !factory) return;

            try {
                const latestBlock = await publicClient.getBlockNumber();
                const fromBlock =
                    latestBlock >= targetLogLookbackBlocks ? latestBlock - targetLogLookbackBlocks + BigInt(1) : BigInt(0);

                const logs = await publicClient.getLogs({
                    address: factory,
                    event: {
                        type: 'event',
                        name: 'RandomnessRequested',
                        inputs: [
                            { name: 'requestId', type: 'uint256', indexed: true },
                            { name: 'lottoAddress', type: 'address', indexed: true },
                        ],
                        anonymous: false,
                    },
                    fromBlock,
                    toBlock: latestBlock,
                    args: {
                        lottoAddress,
                    },
                });

                const parsedLogs = parseEventLogs({
                    abi: lottoFactoryAbi,
                    logs,
                    eventName: 'RandomnessRequested',
                });

                const latestLog = parsedLogs[parsedLogs.length - 1] as
                    | {
                          args?: {
                              requestId?: bigint | number;
                          };
                      }
                    | undefined;
                const value = latestLog?.args?.requestId;
                if (typeof value === 'bigint') {
                    setRequestId(value.toString());
                } else if (typeof value === 'number') {
                    setRequestId(String(value));
                }
            } catch (error) {
                console.warn('Failed to load latest RandomnessRequested log:', error);
            }
        };

        void loadLatestRequestId();
    }, [factory, lottoAddress, publicClient, lottoStateValue]);

    const winnerDisplay =
        winner && winner !== ZERO_LOTTO_WINNER ? winner : 'No winner yet';

    return {
        rawAddress,
        lottoAddress,
        isConnected,
        targetNetworkLabel,
        isWrongNetwork,
        switchToTargetNetwork,
        isActionPending,
        isActionConfirming,
        stateLabel: lottoStateToLabel,
        lottoBalance,
        entryFee,
        maxPlayers,
        playerCount,
        remainingSpots,
        winner,
        winnerDisplay,
        factory,
        entryTokenAddress,
        lottoStateValue,
        isRandomnessRequested,
        isPrizeWithdrawn,
        refundableAmount,
        randomnessRequestedAt,
        calculatingTimeout,
        requestId,
        refundTimeoutAt,
        currentAllowance,
        currentTokenBalance,
        canExecute,
        statusNumber,
        canJoin,
        canRequest,
        canWithdraw,
        canTriggerRefundMode,
        canClaimRefund,
        hasSufficientAllowance,
        hasSufficientBalance,
        insufficientLetKnown,
        isConnectedWinner,
        actionError,
        executeDetailAction,
        refetchAfterAction,
    };
}
