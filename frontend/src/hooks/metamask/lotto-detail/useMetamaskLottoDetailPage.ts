'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { getErrorMessage } from '@/hooks/shared/lib/errors';
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

    const { data: playerCount } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'getPlayerCount',
        chainId: targetChainId,
        query: {
            enabled: Boolean(lottoAddress),
            refetchInterval: 3000,
        },
    });

    const { data: remainingSpots } = useReadContract({
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

    const { data: lottoStateValue } = useReadContract({
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

    const { isLoading: isActionConfirming, isSuccess: isActionConfirmed } = useWaitForTransactionReceipt({
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

    const handleJoinLotto = async () => {
        try {
            setActionError('');
            if (!ensureReady() || !lottoAddress) return;
            if (!canJoin) {
                setActionError('joinLotto is only available while state is OPEN.');
                return;
            }

            if (!entryTokenAddress) {
                setActionError('Entry token address is not available.');
                return;
            }
            if (entryFee !== undefined && typeof currentTokenBalance === 'bigint' && currentTokenBalance < entryFee) {
                setActionError('Not enough LET balance. Use the token faucet first.');
                return;
            }
            if (!hasSufficientAllowance) {
                setActionError('Approve entry token first.');
                return;
            }

            await writeContractAsync({
                address: lottoAddress,
                abi: lottoInstanceAbi,
                functionName: 'joinLotto',
            });
            void refetchBalance();
            void refetchTokenReads();
        } catch (error) {
            setActionError(getErrorMessage(error, 'Failed to execute joinLotto.'));
        }
    };

    const handleApproveEntryToken = async () => {
        try {
            setActionError('');
            if (!ensureReady() || !lottoAddress || !entryTokenAddress || entryFee === undefined) return;
            if (!canJoin) {
                setActionError('approve is only available while state is OPEN.');
                return;
            }
            if (typeof currentTokenBalance === 'bigint' && currentTokenBalance < entryFee) {
                setActionError('Not enough LET balance. Use the token faucet first.');
                return;
            }

            await writeContractAsync({
                address: entryTokenAddress,
                abi: erc20Abi,
                functionName: 'approve',
                args: [lottoAddress, entryFee],
            });
            void refetchTokenReads();
        } catch (error) {
            setActionError(getErrorMessage(error, 'Failed to approve entry token.'));
        }
    };

    const handleRequestWinner = async () => {
        try {
            setActionError('');
            setRequestId('');
            if (!ensureReady() || !lottoAddress) return;
            if (!canRequest) {
                setActionError('requestWinner is only available while state is FULL.');
                return;
            }

            await writeContractAsync({
                address: lottoAddress,
                abi: lottoInstanceAbi,
                functionName: 'requestWinner',
            });
        } catch (error) {
            setActionError(getErrorMessage(error, 'Failed to execute requestWinner.'));
        }
    };

    useEffect(() => {
        const resolveRequestId = async () => {
            if (!isActionConfirmed || !actionTxHash || !publicClient || !lottoAddress) return;

            const receipt = await publicClient.getTransactionReceipt({ hash: actionTxHash });
            const parsedLogs = parseEventLogs({
                abi: lottoInstanceAbi,
                logs: receipt.logs,
                eventName: 'RandomnessRequested',
            });

            const matchedLog = parsedLogs.find(
                (log) => log.args.lottoAddress?.toLowerCase() === lottoAddress.toLowerCase()
            );
            if (!matchedLog) return;

            const value = matchedLog.args.requestId;
            if (typeof value === 'bigint') {
                setRequestId(value.toString());
            } else if (typeof value === 'number') {
                setRequestId(String(value));
            }
        };

        void resolveRequestId();
    }, [actionTxHash, isActionConfirmed, lottoAddress, publicClient]);

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

    const handleWithdrawPrize = async () => {
        try {
            setActionError('');
            if (!ensureReady() || !lottoAddress) return;
            if (!isConnectedWinner) {
                setActionError('Only the winner can withdraw the prize.');
                return;
            }
            if (!canWithdraw) {
                setActionError('withdrawPrize is only available when state is CLOSED and prize is not withdrawn.');
                return;
            }

            await writeContractAsync({
                address: lottoAddress,
                abi: lottoInstanceAbi,
                functionName: 'withdrawPrize',
            });
            void refetchBalance();
        } catch (error) {
            setActionError(getErrorMessage(error, 'Failed to execute withdrawPrize.'));
        }
    };

    const handleTriggerRefundMode = async () => {
        try {
            setActionError('');
            if (!ensureReady() || !lottoAddress) return;
            if (!canTriggerRefundMode) {
                setActionError('triggerRefundMode is only available after the CALCULATING timeout has elapsed.');
                return;
            }

            await writeContractAsync({
                address: lottoAddress,
                abi: lottoInstanceAbi,
                functionName: 'triggerRefundMode',
            });
        } catch (error) {
            setActionError(getErrorMessage(error, 'Failed to execute triggerRefundMode.'));
        }
    };

    const handleClaimRefund = async () => {
        try {
            setActionError('');
            if (!ensureReady() || !lottoAddress) return;
            if (statusNumber !== LottoState.REFUNDING) {
                setActionError('claimRefund is only available while state is REFUNDING.');
                return;
            }
            if (!(typeof refundableAmount === 'bigint') || refundableAmount <= BigInt(0)) {
                setActionError('No refundable balance for this wallet.');
                return;
            }

            await writeContractAsync({
                address: lottoAddress,
                abi: lottoInstanceAbi,
                functionName: 'claimRefund',
            });
            void refetchBalance();
            void refetchTokenReads();
        } catch (error) {
            setActionError(getErrorMessage(error, 'Failed to execute claimRefund.'));
        }
    };

    const winnerDisplay =
        winner && winner !== ZERO_LOTTO_WINNER ? winner : 'No winner yet';

    return {
        rawAddress,
        lottoAddress,
        targetNetworkLabel,
        isWrongNetwork,
        switchToTargetNetwork,
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
        actionTxHash,
        isActionConfirmed,
        actionError,
        handleApproveEntryToken,
        handleJoinLotto,
        handleRequestWinner,
        handleWithdrawPrize,
        handleTriggerRefundMode,
        handleClaimRefund,
    };
}
