'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    useAccount,
    useReadContract,
    usePublicClient,
    useSwitchChain,
    useWaitForTransactionReceipt,
    useWriteContract,
} from 'wagmi';
import { Address, BaseError, formatEther, isAddress, parseEther, parseEventLogs } from 'viem';
import lottoFactoryAbi from '@/contracts/LottoFactory.json';

enum LottoState {
    OPEN = 0,
    FULL = 1,
    CALCULATING = 2,
    CLOSED = 3,
}

const ANVIL_CHAIN_ID = 31337;

const lottoInstanceAbi = [
    {
        type: 'function',
        name: 'joinLotto',
        stateMutability: 'payable',
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
        name: 'getLottoBalance',
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

function stateToLabel(stateValue?: bigint | number) {
    if (stateValue === undefined) return '-';
    const state = typeof stateValue === 'bigint' ? Number(stateValue) : stateValue;
    if (state === LottoState.OPEN) return 'OPEN';
    if (state === LottoState.FULL) return 'FULL';
    if (state === LottoState.CALCULATING) return 'CALCULATING';
    if (state === LottoState.CLOSED) return 'CLOSED';
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
    const publicClient = usePublicClient();
    const { switchChain } = useSwitchChain();
    const isWrongNetwork = isConnected && chainId !== ANVIL_CHAIN_ID;

    const [joinValueEth, setJoinValueEth] = useState('0.01');
    const [actionError, setActionError] = useState('');
    const [requestId, setRequestId] = useState<string>('');

    const { data: lottoBalance, refetch: refetchBalance } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'getLottoBalance',
        query: {
            enabled: Boolean(lottoAddress),
            refetchInterval: 3000,
        },
    });

    const { data: entryFee } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'entryFee',
        query: { enabled: Boolean(lottoAddress) },
    });

    const { data: maxPlayers } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'maxPlayers',
        query: { enabled: Boolean(lottoAddress) },
    });

    const { data: playerCount } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'getPlayerCount',
        query: {
            enabled: Boolean(lottoAddress),
            refetchInterval: 3000,
        },
    });

    const { data: remainingSpots } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'getRemainingSpots',
        query: {
            enabled: Boolean(lottoAddress),
            refetchInterval: 3000,
        },
    });

    const { data: winner } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'winner',
        query: { enabled: Boolean(lottoAddress) },
    });

    const { data: factory } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'factory',
        query: { enabled: Boolean(lottoAddress) },
    });

    const { data: lottoStateValue } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'lottoState',
        query: {
            enabled: Boolean(lottoAddress),
            refetchInterval: 3000,
        },
    });

    const { data: isRandomnessRequested } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'isRandomnessRequested',
        query: { enabled: Boolean(lottoAddress) },
    });

    const { data: isPrizeWithdrawn } = useReadContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'isPrizeWithdrawn',
        query: { enabled: Boolean(lottoAddress) },
    });

    const {
        writeContractAsync,
        data: actionTxHash,
        isPending: isActionPending,
    } = useWriteContract();

    const { isLoading: isActionConfirming, isSuccess: isActionConfirmed } = useWaitForTransactionReceipt({
        hash: actionTxHash,
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
        if (chainId !== ANVIL_CHAIN_ID) {
            setActionError('Please switch your wallet network to Anvil (chainId 31337).');
            return false;
        }
        return true;
    };

    const handleJoinLotto = async () => {
        try {
            setActionError('');
            if (!ensureReady() || !lottoAddress) return;
            if (!canJoin) {
                setActionError('joinLotto is only available while state is OPEN.');
                return;
            }

            const parsedJoinValue = parseEther(joinValueEth);
            if (parsedJoinValue <= BigInt(0)) {
                setActionError('Join value must be greater than 0.');
                return;
            }

            await writeContractAsync({
                address: lottoAddress,
                abi: lottoInstanceAbi,
                functionName: 'joinLotto',
                value: parsedJoinValue,
            });
            void refetchBalance();
        } catch (error) {
            setActionError(getErrorMessage(error, 'Failed to execute joinLotto.'));
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
                fromBlock: BigInt(0),
                toBlock: 'latest',
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
                <Link href="/join-lottery" style={{ color: '#8fe8ff', textDecoration: 'underline' }}>
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
                            <p style={{ color: '#ffc2b6' }}>Wrong network detected. Switch to Anvil (31337).</p>
                            <button
                                onClick={() => switchChain({ chainId: ANVIL_CHAIN_ID })}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: '1px solid #76b4be',
                                    background: 'linear-gradient(135deg, #0f7f8f, #155a8a)',
                                    color: '#ecf8ff',
                                    cursor: 'pointer',
                                }}
                            >
                                Switch to Anvil
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
                        <p style={{ margin: 0 }}>Entry Fee: {entryFee !== undefined ? formatEther(entryFee) : '-'} ETH</p>
                        <p style={{ margin: 0 }}>Max Players: {maxPlayers !== undefined ? Number(maxPlayers) : '-'}</p>
                        <p style={{ margin: 0 }}>Current Players: {playerCount !== undefined ? Number(playerCount) : '-'}</p>
                        <p style={{ margin: 0 }}>Remaining Spots: {remainingSpots !== undefined ? Number(remainingSpots) : '-'}</p>
                        <p style={{ margin: 0 }}>Current Balance: {lottoBalance !== undefined ? formatEther(lottoBalance) : '-'} ETH</p>
                        <p style={{ margin: 0, wordBreak: 'break-all' }}>Winner: {winner ?? '-'}</p>
                        <p style={{ margin: 0, wordBreak: 'break-all' }}>Factory: {factory ?? '-'}</p>
                        <p style={{ margin: 0 }}>requestId: {requestId || '-'}</p>
                        <p style={{ margin: 0 }}>Randomness Requested: {isRandomnessRequested ? 'Yes' : 'No'}</p>
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
                        <label style={{ display: 'block', marginBottom: 10, color: '#d6ebef' }}>
                            Join Value (ETH)
                            <input
                                value={joinValueEth}
                                onChange={(e) => setJoinValueEth(e.target.value)}
                                placeholder="0.01"
                                style={{
                                    width: '100%',
                                    marginTop: 8,
                                    padding: '11px 12px',
                                    borderRadius: 10,
                                    border: '1px solid #3a4e53',
                                    background: '#0c1f26',
                                    color: '#e7f2f2',
                                }}
                            />
                        </label>
                        <button
                            onClick={handleJoinLotto}
                            disabled={!canExecute || !lottoAddress || !canJoin}
                            style={{
                                padding: '11px 16px',
                                borderRadius: 10,
                                border: '1px solid #76b4be',
                                background: 'linear-gradient(135deg, #0f7f8f, #155a8a)',
                                color: '#ecf8ff',
                                cursor: canExecute && canJoin ? 'pointer' : 'not-allowed',
                                opacity: canExecute && canJoin ? 1 : 0.5,
                            }}
                        >
                            Join Lotto
                        </button>
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
