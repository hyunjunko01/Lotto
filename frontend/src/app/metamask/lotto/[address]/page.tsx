'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    useAccount,
    useReadContracts,
    useReadContract,
    usePublicClient,
    useSwitchChain,
    useWaitForTransactionReceipt,
    useWriteContract,
} from 'wagmi';
import { Address, BaseError, formatEther, isAddress, parseEventLogs } from 'viem';
import lottoFactoryAbi from '@/contracts/LottoFactory.json';
import { isTargetNetwork, targetChainId, targetLogLookbackBlocks, targetNetworkLabel } from '@/lib/targetNetwork';

enum LottoState {
    OPEN = 0,
    FULL = 1,
    CALCULATING = 2,
    CLOSED = 3,
    REFUNDING = 4,
}

const lottoInstanceAbi = [
    {
        type: 'function',
        name: 'joinLotto',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        type: 'function',
        name: 'requestWinner',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        type: 'event',
        name: 'RandomnessRequested',
        inputs: [
            { name: 'requestId', type: 'uint256', indexed: true },
            { name: 'lottoAddress', type: 'address', indexed: true },
        ],
        anonymous: false,
    },
    {
        type: 'function',
        name: 'withdrawPrize',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        type: 'function',
        name: 'triggerRefundMode',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        type: 'function',
        name: 'claimRefund',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        type: 'function',
        name: 'getLottoBalance',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'refundableAmount',
        stateMutability: 'view',
        inputs: [{ name: '', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'randomnessRequestedAt',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'CALCULATING_TIMEOUT',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'entryFee',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'maxPlayers',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'getPlayerCount',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'getRemainingSpots',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'winner',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        type: 'function',
        name: 'factory',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        type: 'function',
        name: 'entryToken',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        type: 'function',
        name: 'lottoState',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
    },
    {
        type: 'function',
        name: 'isRandomnessRequested',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        type: 'function',
        name: 'isPrizeWithdrawn',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'bool' }],
    },
] as const;

const erc20Abi = [
    {
        type: 'function',
        name: 'approve',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        type: 'function',
        name: 'allowance',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

function stateToLabel(stateValue?: bigint | number) {
    if (stateValue === undefined) return '-';
    const state = typeof stateValue === 'bigint' ? Number(stateValue) : stateValue;
    if (state === LottoState.OPEN) return 'OPEN';
    if (state === LottoState.FULL) return 'FULL';
    if (state === LottoState.CALCULATING) return 'CALCULATING';
    if (state === LottoState.CLOSED) return 'CLOSED';
    if (state === LottoState.REFUNDING) return 'REFUNDING';
    return `UNKNOWN (${state})`;
}

export default function LottoInstancePage() {
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
    const [requestId, setRequestId] = useState<string>('');
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

    const {
        data: tokenReadResults,
        refetch: refetchTokenReads,
    } = useReadContracts({
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
    const hasWinner = Boolean(winner && winner !== '0x0000000000000000000000000000000000000000');
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
        statusNumber === LottoState.CALCULATING && refundTimeoutAt !== undefined && currentTimestamp >= refundTimeoutAt;
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
    /** True when we know the wallet cannot cover one entry fee in LET. */
    const insufficientLetKnown =
        connectedAddress != null &&
        entryFee !== undefined &&
        currentTokenBalance !== undefined &&
        currentTokenBalance < entryFee;

    const getErrorMessage = (error: unknown, fallback: string) => {
        if (error instanceof BaseError) return error.shortMessage || fallback;
        if (error instanceof Error) return error.message || fallback;
        return fallback;
    };

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
            if (
                entryFee !== undefined &&
                typeof currentTokenBalance === 'bigint' &&
                currentTokenBalance < entryFee
            ) {
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

            const matchedLog = parsedLogs.find((log) => log.args.lottoAddress?.toLowerCase() === lottoAddress.toLowerCase());
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

    return (
        <main
            style={{
                minHeight: '100dvh',
                padding: '28px 16px 44px',
                background:
                    'radial-gradient(1200px 500px at 10% -10%, rgba(22, 86, 102, 0.4), transparent), linear-gradient(180deg, #07161c 0%, #0b101a 100%)',
                fontFamily: "'Avenir Next', 'IBM Plex Sans', 'Segoe UI', sans-serif",
                color: '#e8f2f4',
            }}
        >
            <div style={{ maxWidth: 920, margin: '0 auto' }}>
                <Link href="/metamask/join-lottery" style={{ color: '#8fe8ff', textDecoration: 'underline' }}>
                    Back to instances
                </Link>

                <section
                    style={{
                        marginTop: 16,
                        padding: 20,
                        border: '1px solid #2d3f45',
                        borderRadius: 14,
                        background: 'rgba(7, 19, 24, 0.72)',
                    }}
                >
                    <h1 style={{ margin: 0, fontSize: 'clamp(1.7rem, 3vw, 2.2rem)' }}>Lotto Instance</h1>
                    <p style={{ marginTop: 10, color: '#c6dfe2', wordBreak: 'break-all' }}>
                        Address: {lottoAddress ?? String(rawAddress ?? '')}
                    </p>

                    {isWrongNetwork ? (
                        <div style={{ marginTop: 14 }}>
                            <p style={{ color: '#ffc2b6' }}>Wrong network detected. Switch to {targetNetworkLabel}.</p>
                            <button
                                onClick={() => switchChain({ chainId: targetChainId })}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: '1px solid #76b4be',
                                    background: 'linear-gradient(135deg, #0f7f8f, #155a8a)',
                                    color: '#ecf8ff',
                                    cursor: 'pointer',
                                }}
                            >
                                Switch to {targetNetworkLabel}
                            </button>
                        </div>
                    ) : null}
                </section>

                <section
                    style={{
                        marginTop: 16,
                        padding: 20,
                        border: '1px solid #2d3f45',
                        borderRadius: 14,
                        background: 'rgba(7, 19, 24, 0.72)',
                    }}
                >
                    <h2 style={{ marginTop: 0 }}>Winner</h2>
                    <p style={{ margin: 0, color: '#d4eaee', wordBreak: 'break-all' }}>
                        {winner && winner !== '0x0000000000000000000000000000000000000000' ? winner : 'No winner yet'}
                    </p>
                </section>

                <section
                    style={{
                        marginTop: 16,
                        padding: 20,
                        border: '1px solid #2d3f45',
                        borderRadius: 14,
                        background: 'rgba(7, 19, 24, 0.72)',
                    }}
                >
                    <h2 style={{ marginTop: 0 }}>Instance Information</h2>
                    <div style={{ display: 'grid', gap: 8, color: '#d4eaee' }}>
                        <p style={{ margin: 0 }}>Status: {stateToLabel(lottoStateValue)}</p>
                        <p style={{ margin: 0 }}>Entry Fee: {entryFee !== undefined ? formatEther(entryFee) : '-'} LET</p>
                        <p style={{ margin: 0 }}>Max Players: {maxPlayers !== undefined ? Number(maxPlayers) : '-'}</p>
                        <p style={{ margin: 0 }}>Current Players: {playerCount !== undefined ? Number(playerCount) : '-'}</p>
                        <p style={{ margin: 0 }}>Remaining Spots: {remainingSpots !== undefined ? Number(remainingSpots) : '-'}</p>
                        <p style={{ margin: 0 }}>Current Pot: {lottoBalance !== undefined ? formatEther(lottoBalance) : '-'} LET</p>
                        <p style={{ margin: 0, wordBreak: 'break-all' }}>Entry Token: {entryTokenAddress ?? '-'}</p>
                        <p style={{ margin: 0 }}>
                            Your LET Balance: {currentTokenBalance !== undefined ? formatEther(currentTokenBalance) : '-'}
                        </p>
                        <p style={{ margin: 0 }}>
                            Your Allowance: {currentAllowance !== undefined ? formatEther(currentAllowance) : '-'}
                        </p>
                        <p style={{ margin: 0 }}>
                            Your Refundable Amount:{' '}
                            {typeof refundableAmount === 'bigint' ? formatEther(refundableAmount) : '-'} LET
                        </p>
                        <p style={{ margin: 0, wordBreak: 'break-all' }}>Winner: {winner ?? '-'}</p>
                        <p style={{ margin: 0, wordBreak: 'break-all' }}>Factory: {factory ?? '-'}</p>
                        <p style={{ margin: 0 }}>requestId: {requestId || '-'}</p>
                        <p style={{ margin: 0 }}>Randomness Requested: {isRandomnessRequested ? 'Yes' : 'No'}</p>
                        <p style={{ margin: 0 }}>
                            randomnessRequestedAt:{' '}
                            {typeof randomnessRequestedAt === 'bigint' ? randomnessRequestedAt.toString() : '-'}
                        </p>
                        <p style={{ margin: 0 }}>
                            CALCULATING_TIMEOUT:{' '}
                            {typeof calculatingTimeout === 'bigint' ? calculatingTimeout.toString() : '-'} seconds
                        </p>
                        <p style={{ margin: 0 }}>
                            Refund timeout at: {refundTimeoutAt !== undefined ? refundTimeoutAt.toString() : '-'}
                        </p>
                        <p style={{ margin: 0 }}>Prize Withdrawn: {isPrizeWithdrawn ? 'Yes' : 'No'}</p>
                    </div>
                </section>

                <section
                    style={{
                        marginTop: 16,
                        padding: 20,
                        border: '1px solid #2d3f45',
                        borderRadius: 14,
                        background: 'rgba(7, 19, 24, 0.72)',
                    }}
                >
                    <h2 style={{ marginTop: 0 }}>Callable Functions</h2>

                    <div style={{ border: '1px solid #31525b', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                        <h3 style={{ margin: '0 0 10px 0' }}>joinLotto</h3>
                        <p style={{ margin: '0 0 10px', color: '#d6ebef' }}>
                            `joinLotto` uses ERC20 (LET) allowance, not direct ETH transfer.
                        </p>
                        <button
                            onClick={handleApproveEntryToken}
                            disabled={
                                !canExecute ||
                                !lottoAddress ||
                                !entryTokenAddress ||
                                entryFee === undefined ||
                                !canJoin ||
                                insufficientLetKnown
                            }
                            style={{
                                marginRight: 8,
                                padding: '11px 16px',
                                borderRadius: 10,
                                border: '1px solid #76b4be',
                                background: 'linear-gradient(135deg, #246f8f, #1d4d7a)',
                                color: '#ecf8ff',
                                cursor:
                                    canExecute &&
                                        lottoAddress &&
                                        entryTokenAddress &&
                                        entryFee !== undefined &&
                                        canJoin &&
                                        !insufficientLetKnown
                                        ? 'pointer'
                                        : 'not-allowed',
                                opacity:
                                    canExecute &&
                                        lottoAddress &&
                                        entryTokenAddress &&
                                        entryFee !== undefined &&
                                        canJoin &&
                                        !insufficientLetKnown
                                        ? 1
                                        : 0.5,
                            }}
                        >
                            Approve Entry Fee
                        </button>
                        <button
                            onClick={handleJoinLotto}
                            disabled={
                                !canExecute ||
                                !lottoAddress ||
                                !canJoin ||
                                !hasSufficientAllowance ||
                                !hasSufficientBalance
                            }
                            style={{
                                padding: '11px 16px',
                                borderRadius: 10,
                                border: '1px solid #76b4be',
                                background: 'linear-gradient(135deg, #0f7f8f, #155a8a)',
                                color: '#ecf8ff',
                                cursor:
                                    canExecute && canJoin && hasSufficientAllowance && hasSufficientBalance
                                        ? 'pointer'
                                        : 'not-allowed',
                                opacity:
                                    canExecute && canJoin && hasSufficientAllowance && hasSufficientBalance ? 1 : 0.5,
                            }}
                        >
                            Join Lotto
                        </button>
                        {insufficientLetKnown ? (
                            <p style={{ marginTop: 10, color: '#ffc2b6' }}>
                                Not enough LET to pay the entry fee. Use the token faucet, then approve and join.
                            </p>
                        ) : null}
                        {!insufficientLetKnown && !hasSufficientAllowance ? (
                            <p style={{ marginTop: 10, color: '#ffc2b6' }}>Run "Approve Entry Fee" first.</p>
                        ) : null}
                        {!canJoin ? <p style={{ marginTop: 10, color: '#c6dfe2' }}>Enabled only when status is OPEN.</p> : null}
                    </div>

                    <div style={{ border: '1px solid #31525b', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                        <h3 style={{ margin: '0 0 10px 0' }}>requestWinner</h3>
                        <button
                            onClick={handleRequestWinner}
                            disabled={!canExecute || !lottoAddress || !canRequest}
                            style={{
                                padding: '11px 16px',
                                borderRadius: 10,
                                border: '1px solid #76b4be',
                                background: 'linear-gradient(135deg, #0f7f8f, #155a8a)',
                                color: '#ecf8ff',
                                cursor: canExecute && canRequest ? 'pointer' : 'not-allowed',
                                opacity: canExecute && canRequest ? 1 : 0.5,
                            }}
                        >
                            Request Winner
                        </button>
                        {!canRequest ? <p style={{ marginTop: 10, color: '#c6dfe2' }}>Enabled only when status is FULL.</p> : null}
                    </div>

                    <div style={{ border: '1px solid #31525b', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                        <h3 style={{ margin: '0 0 10px 0' }}>triggerRefundMode</h3>
                        <p style={{ margin: '0 0 10px', color: '#d6ebef' }}>
                            If VRF is stuck, anyone can switch the instance into REFUNDING mode after the timeout.
                        </p>
                        <button
                            onClick={handleTriggerRefundMode}
                            disabled={!canExecute || !lottoAddress || !canTriggerRefundMode}
                            style={{
                                padding: '11px 16px',
                                borderRadius: 10,
                                border: '1px solid #76b4be',
                                background: 'linear-gradient(135deg, #246f8f, #1d4d7a)',
                                color: '#ecf8ff',
                                cursor: canExecute && canTriggerRefundMode ? 'pointer' : 'not-allowed',
                                opacity: canExecute && canTriggerRefundMode ? 1 : 0.5,
                            }}
                        >
                            Trigger Refund Mode
                        </button>
                        {!canTriggerRefundMode ? (
                            <p style={{ marginTop: 10, color: '#c6dfe2' }}>
                                {statusNumber === LottoState.CALCULATING
                                    ? 'Enabled only after the CALCULATING timeout has elapsed.'
                                    : 'Enabled only when status is CALCULATING.'}
                            </p>
                        ) : null}
                    </div>

                    <div style={{ border: '1px solid #31525b', borderRadius: 10, padding: '12px 14px' }}>
                        <h3 style={{ margin: '0 0 10px 0' }}>withdrawPrize</h3>
                        <button
                            onClick={handleWithdrawPrize}
                            disabled={!canExecute || !lottoAddress || !canWithdraw}
                            style={{
                                padding: '11px 16px',
                                borderRadius: 10,
                                border: '1px solid #76b4be',
                                background: 'linear-gradient(135deg, #0f7f8f, #155a8a)',
                                color: '#ecf8ff',
                                cursor: canExecute && canWithdraw ? 'pointer' : 'not-allowed',
                                opacity: canExecute && canWithdraw ? 1 : 0.5,
                            }}
                        >
                            Withdraw Prize
                        </button>
                        {!canWithdraw ? (
                            <p style={{ marginTop: 10, color: '#c6dfe2' }}>
                                Enabled only when status is CLOSED and prize is not withdrawn.
                            </p>
                        ) : null}
                        {statusNumber === LottoState.CLOSED && !isPrizeWithdrawn && !isConnectedWinner ? (
                            <p style={{ marginTop: 10, color: '#ffc2b6' }}>
                                Only the winner can withdraw the prize.
                            </p>
                        ) : null}
                    </div>

                    <div style={{ border: '1px solid #31525b', borderRadius: 10, padding: '12px 14px', marginTop: 12 }}>
                        <h3 style={{ margin: '0 0 10px 0' }}>claimRefund</h3>
                        <button
                            onClick={handleClaimRefund}
                            disabled={!canExecute || !lottoAddress || !canClaimRefund}
                            style={{
                                padding: '11px 16px',
                                borderRadius: 10,
                                border: '1px solid #76b4be',
                                background: 'linear-gradient(135deg, #1f6f58, #2a8b66)',
                                color: '#ecf8ff',
                                cursor: canExecute && canClaimRefund ? 'pointer' : 'not-allowed',
                                opacity: canExecute && canClaimRefund ? 1 : 0.5,
                            }}
                        >
                            Claim Refund
                        </button>
                        {!canClaimRefund ? (
                            <p style={{ marginTop: 10, color: '#c6dfe2' }}>
                                Enabled only when status is REFUNDING and you have a refundable balance.
                            </p>
                        ) : null}
                    </div>

                    {actionTxHash ? (
                        <p style={{ marginTop: 12, color: '#d4eaee', fontFamily: 'ui-monospace, Menlo, monospace', wordBreak: 'break-all' }}>
                            Tx: {actionTxHash}
                        </p>
                    ) : null}
                    {isActionConfirmed ? <p style={{ marginTop: 12, color: '#9ff2be' }}>Transaction confirmed.</p> : null}

                    {actionError ? (
                        <p
                            style={{
                                marginTop: 12,
                                color: '#ffd3cb',
                                background: 'rgba(127, 39, 39, 0.34)',
                                border: '1px solid #924747',
                                borderRadius: 10,
                                padding: '10px 12px',
                            }}
                        >
                            {actionError}
                        </p>
                    ) : null}
                </section>
            </div>
        </main>
    );
}
