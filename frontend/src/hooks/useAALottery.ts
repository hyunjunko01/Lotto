'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    decodeFunctionResult,
    encodeFunctionData,
    Hex,
    createWalletClient,
    custom,
    hashMessage,
    isAddress,
    keccak256,
    parseEther,
    recoverAddress,
    toHex,
} from 'viem';
import { anvil } from 'viem/chains';
import type { IProvider } from '@web3auth/base';
import type { UserOpFields } from '@/components/aa/types';
import accountFactoryAbi from '@/contracts/AccountFactory.json';
import { connectWeb3Auth, getWeb3Auth } from '@/lib/web3auth';

export type AALotteryMode = 'create' | 'join' | 'faucet';
export type AAJoinAction =
    | 'approveEntryFee'
    | 'joinLotto'
    | 'requestWinner'
    | 'withdrawPrize'
    | 'triggerRefundMode'
    | 'claimRefund';
export type AALottoSummary = {
    address: string;
    playerCount?: bigint;
    maxPlayers?: bigint;
    entryFee?: bigint;
    entryToken?: string;
    lottoState?: bigint;
    winner?: string;
    isPrizeWithdrawn?: boolean;
};

type AccountResponse = {
    ok: boolean;
    account?: {
        ownerAddress: string;
        accountAddress: string;
        salt: string;
    };
    error?: string;
};

type SendUserOpResponse = {
    ok?: boolean;
    userOpHash?: string;
    serverUserOpHash?: string;
    clientUserOpHash?: string;
    error?: string;
};

type NonceResponse = {
    ok?: boolean;
    nonce?: string;
    error?: string;
};

const SESSION_STORAGE_KEY = 'aaSessionToken';

const ETH_ACCOUNT_EXECUTE_ABI = [
    {
        type: 'function',
        name: 'execute',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'dest', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'functionData', type: 'bytes' },
        ],
        outputs: [],
    },
] as const;

const LOTTO_CREATE_ABI = [
    {
        type: 'function',
        name: 'createLotto',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_entryFee', type: 'uint256' },
            { name: '_maxPlayers', type: 'uint256' },
            { name: '_entryToken', type: 'address' },
        ],
        outputs: [{ name: '', type: 'address' }],
    },
] as const;

const LOTTO_JOIN_ABI = [
    {
        type: 'function',
        name: 'joinLotto',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
] as const;

const LOTTO_REQUEST_WINNER_ABI = [
    {
        type: 'function',
        name: 'requestWinner',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
] as const;

const LOTTO_WITHDRAW_PRIZE_ABI = [
    {
        type: 'function',
        name: 'withdrawPrize',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
] as const;

const LOTTO_TRIGGER_REFUND_MODE_ABI = [
    {
        type: 'function',
        name: 'triggerRefundMode',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
] as const;

const LOTTO_CLAIM_REFUND_ABI = [
    {
        type: 'function',
        name: 'claimRefund',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
] as const;

const ENTRY_TOKEN_FAUCET_ABI = [
    {
        type: 'function',
        name: 'claimTestTokens',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
] as const;

const LOTTO_FACTORY_VIEW_ABI = [
    {
        type: 'function',
        name: 'getAllLottos',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address[]' }],
    },
] as const;

const LOTTO_INSTANCE_VIEW_ABI = [
    {
        type: 'function',
        name: 'getPlayerCount',
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
        name: 'entryFee',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
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
        name: 'winner',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        type: 'function',
        name: 'isPrizeWithdrawn',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'bool' }],
    },
] as const;

const ERC20_APPROVE_ABI = [
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
] as const;

const ERC20_BALANCE_OF_ABI = [
    {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

const ERC20_ALLOWANCE_ABI = [
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
] as const;

function parseEtherOrZero(value: string): bigint {
    try {
        return parseEther(value || '0');
    } catch {
        return BigInt(0);
    }
}

function parseBigIntOrZero(value: string): bigint {
    try {
        return BigInt(value || '0');
    } catch {
        return BigInt(0);
    }
}

function toBigIntValue(value: unknown): bigint | undefined {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return undefined;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function findLottoSummary(instances: AALottoSummary[], joinTarget: string): AALottoSummary | undefined {
    if (!isAddress(joinTarget)) return undefined;
    return instances.find((item) => item.address.toLowerCase() === joinTarget.toLowerCase());
}

function packAccountGasLimits(verificationGasLimit: bigint, callGasLimit: bigint): `0x${string}` {
    const packed = (verificationGasLimit << BigInt(128)) | callGasLimit;
    return `0x${packed.toString(16).padStart(64, '0')}`;
}

function deriveSaltFromOwnerAddress(ownerAddress: `0x${string}`): string {
    const digest = keccak256(toHex(ownerAddress.toLowerCase()));
    return BigInt(digest).toString();
}

/** Join actions: requestWinner hits VRF via factory and needs much higher callGas than approve/join. */
function accountGasLimitsForJoinAction(action: AAJoinAction): `0x${string}` {
    if (action === 'requestWinner') {
        return packAccountGasLimits(BigInt(300000), BigInt(1200000));
    }
    return packAccountGasLimits(BigInt(150000), BigInt(200000));
}

/** Matches MetaMask lotto page: OPEN=approve/join, FULL=requestWinner, CLOSED+winner+AA=withdraw */
function joinActionAllowedByState(
    action: AAJoinAction,
    summary: AALottoSummary | undefined,
    aaAccountAddress: string
): { ok: true } | { ok: false; message: string } {
    const st =
        summary?.lottoState !== undefined && summary.lottoState !== null ? Number(summary.lottoState) : undefined;

    if (action === 'approveEntryFee' || action === 'joinLotto') {
        if (st !== 0) {
            return {
                ok: false,
                message:
                    st === undefined
                        ? 'Lottery state could not be read. Use Refresh Account State or reload instances, then try again.'
                        : 'approve and join are only available while lottery status is OPEN.',
            };
        }
        return { ok: true };
    }

    if (action === 'requestWinner') {
        if (st !== 1) {
            return {
                ok: false,
                message:
                    st === undefined
                        ? 'Lottery state could not be read. Use Refresh Account State or reload instances, then try again.'
                        : 'requestWinner is only available while lottery status is FULL.',
            };
        }
        return { ok: true };
    }

    if (action === 'triggerRefundMode') {
        if (st !== 2) {
            return {
                ok: false,
                message:
                    st === undefined
                        ? 'Lottery state could not be read. Use Refresh Account State or reload instances, then try again.'
                        : 'triggerRefundMode is only available while lottery status is CALCULATING.',
            };
        }
        return { ok: true };
    }

    if (action === 'claimRefund') {
        if (st !== 4) {
            return {
                ok: false,
                message:
                    st === undefined
                        ? 'Lottery state could not be read. Use Refresh Account State or reload instances, then try again.'
                        : 'claimRefund is only available while lottery status is REFUNDING.',
            };
        }
        return { ok: true };
    }

    const winnerAddr = summary?.winner;
    const hasWinner = Boolean(winnerAddr && winnerAddr.toLowerCase() !== ZERO_ADDRESS.toLowerCase());
    const isAaWinner =
        Boolean(aaAccountAddress && winnerAddr) && aaAccountAddress.toLowerCase() === winnerAddr!.toLowerCase();
    if (st !== 3 || summary?.isPrizeWithdrawn || !isAaWinner) {
        return {
            ok: false,
            message:
                'withdrawPrize is only available when status is CLOSED, the prize was not withdrawn yet, and your AA account is the recorded winner.',
        };
    }
    return { ok: true };
}

function encodePaymasterAndData(
    paymasterAddress: `0x${string}`,
    paymasterVerificationGasLimit: bigint,
    paymasterPostOpGasLimit: bigint
): `0x${string}` {
    const addressPart = paymasterAddress.slice(2);
    const verificationGasPart = paymasterVerificationGasLimit.toString(16).padStart(32, '0');
    const postOpGasPart = paymasterPostOpGasLimit.toString(16).padStart(32, '0');
    return `0x${addressPart}${verificationGasPart}${postOpGasPart}` as `0x${string}`;
}

const EMPTY_USER_OP: UserOpFields = {
    sender: '',
    nonce: '0',
    initCode: '0x',
    callData: '0x',
    accountGasLimits: '0x0000000000000000000000000000000000000000000000000000000000000000',
    preVerificationGas: '0',
    gasFees: '0x0000000000000000000000000000000000000000000000000000000000000000',
    paymasterAndData: '0x',
    signature: '0x',
};

interface UseAALotteryProps {
    mode: AALotteryMode;
    lottoFactoryAddress: string;
    accountFactoryAddress: string;
    entryTokenAddress?: string;
    initialJoinTargetAddress?: string;
}

export function useAALottery({
    mode,
    lottoFactoryAddress,
    accountFactoryAddress,
    entryTokenAddress,
    initialJoinTargetAddress,
}: UseAALotteryProps) {
    const [sessionToken, setSessionToken] = useState('');
    const [web3Provider, setWeb3Provider] = useState<IProvider | null>(null);
    const [email, setEmail] = useState('');
    const [ownerAddress, setOwnerAddress] = useState('');
    const [accountAddress, setAccountAddress] = useState('');
    const [salt, setSalt] = useState('');
    const [status, setStatus] = useState('Log in with Web3Auth to create or load your AA account.');
    const [isLoading, setIsLoading] = useState(false);
    const [signResultHash, setSignResultHash] = useState('');
    const [bundlerResultHash, setBundlerResultHash] = useState('');
    const [accountDeployed, setAccountDeployed] = useState(false);
    const [accountNonce, setAccountNonce] = useState<bigint>(BigInt(0));
    const [userOp, setUserOp] = useState<UserOpFields>(EMPTY_USER_OP);

    const [entryFeeEth, setEntryFeeEth] = useState('0.01');
    const [maxPlayers, setMaxPlayers] = useState('5');
    const [joinValueEth, setJoinValueEth] = useState('0.01');
    const [joinTargetAddress, setJoinTargetAddress] = useState(initialJoinTargetAddress ?? '');
    const [selectedJoinAction, setSelectedJoinAction] = useState<AAJoinAction>('joinLotto');
    const [selectedJoinEntryFee, setSelectedJoinEntryFee] = useState<bigint>(BigInt(0));
    const [selectedJoinEntryToken, setSelectedJoinEntryToken] = useState('');
    const [letBalance, setLetBalance] = useState<bigint | null>(null);
    /** ERC20 allowance(entryToken): AA account → lotto instance (join flow, same as MetaMask). */
    const [joinEntryAllowance, setJoinEntryAllowance] = useState<bigint | null>(null);
    /** True after Web3Auth login or "Refresh Account State" successfully loads account + nonce (not set by localStorage-only session restore). */
    const [aaAccountHydrated, setAaAccountHydrated] = useState(false);
    const [lottoInstances, setLottoInstances] = useState<AALottoSummary[]>([]);
    const [isLoadingLottoInstances, setIsLoadingLottoInstances] = useState(false);
    const [lottoInstancesError, setLottoInstancesError] = useState('');

    // Load session from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
            setSessionToken(stored);
            setStatus('An existing session was found. Use Refresh Account State to load your account.');
            void getWeb3Auth()
                .then((web3auth) => {
                    if (web3auth.provider) {
                        setWeb3Provider(web3auth.provider);
                    }
                })
                .catch(() => {});
        }
    }, []);

    // Fetch AA account info
    const fetchAaAccount = useCallback(async (owner: string): Promise<string> => {
        if (!isAddress(owner)) {
            throw new Error('Owner address is required.');
        }

        const params = new URLSearchParams({
            ownerAddress: owner,
            salt: deriveSaltFromOwnerAddress(owner as `0x${string}`),
        });
        const endpoint = `/api/aa/account?${params.toString()}`;
        const response = await fetch(endpoint, { method: 'GET' });

        let json = (await response.json()) as AccountResponse;
        if (!response.ok || !json.ok || !json.account) {
            throw new Error(json.error ?? 'AA account lookup failed.');
        }

        setOwnerAddress(json.account.ownerAddress);
        setAccountAddress(json.account.accountAddress);
        setSalt(json.account.salt);
        setUserOp((prev) => ({
            ...prev,
            sender: json.account?.accountAddress ?? prev.sender,
        }));
        return json.account.accountAddress;
    }, []);

    // Check if account is deployed on-chain
    useEffect(() => {
        if (!accountAddress) {
            setAccountDeployed(false);
            return;
        }

        const checkDeployed = async () => {
            try {
                const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
                const response = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'eth_getCode',
                        params: [accountAddress, 'latest'],
                        id: 1,
                    }),
                });

                const data = (await response.json()) as Record<string, unknown>;
                const code = (data.result as string) || '0x';
                setAccountDeployed(code !== '0x');
            } catch (error) {
                console.error('Failed to check account deployment:', error);
                setAccountDeployed(false);
            }
        };

        void checkDeployed();
    }, [accountAddress]);

    // Compute initCode based on deployment status
    const computeInitCode = useMemo(() => {
        if (accountDeployed || !ownerAddress || !salt) {
            return '0x';
        }

        const createAccountData = encodeFunctionData({
            abi: accountFactoryAbi,
            functionName: 'createAccount',
            args: [ownerAddress as `0x${string}`, BigInt(salt)],
        });

        return `${accountFactoryAddress}${createAccountData.slice(2)}` as `0x${string}`;
    }, [accountDeployed, accountFactoryAddress, ownerAddress, salt]);

    // Compute callData based on mode
    const buildJoinActionCallData = useCallback(
        (action: AAJoinAction) => {
            if (!isAddress(joinTargetAddress)) {
                return '';
            }

            let inner: `0x${string}`;
            let value = BigInt(0);

            if (action === 'approveEntryFee') {
                if (!selectedJoinEntryToken || !isAddress(selectedJoinEntryToken)) {
                    return '';
                }
                inner = encodeFunctionData({
                    abi: ERC20_APPROVE_ABI,
                    functionName: 'approve',
                    args: [joinTargetAddress as `0x${string}`, selectedJoinEntryFee],
                });
                return encodeFunctionData({
                    abi: ETH_ACCOUNT_EXECUTE_ABI,
                    functionName: 'execute',
                    args: [selectedJoinEntryToken as `0x${string}`, value, inner],
                });
            } else if (action === 'joinLotto') {
                inner = encodeFunctionData({
                    abi: LOTTO_JOIN_ABI,
                    functionName: 'joinLotto',
                    args: [],
                });
            } else if (action === 'requestWinner') {
                inner = encodeFunctionData({
                    abi: LOTTO_REQUEST_WINNER_ABI,
                    functionName: 'requestWinner',
                    args: [],
                });
            } else if (action === 'triggerRefundMode') {
                inner = encodeFunctionData({
                    abi: LOTTO_TRIGGER_REFUND_MODE_ABI,
                    functionName: 'triggerRefundMode',
                    args: [],
                });
            } else if (action === 'claimRefund') {
                inner = encodeFunctionData({
                    abi: LOTTO_CLAIM_REFUND_ABI,
                    functionName: 'claimRefund',
                    args: [],
                });
            } else {
                inner = encodeFunctionData({
                    abi: LOTTO_WITHDRAW_PRIZE_ABI,
                    functionName: 'withdrawPrize',
                    args: [],
                });
            }

            return encodeFunctionData({
                abi: ETH_ACCOUNT_EXECUTE_ABI,
                functionName: 'execute',
                args: [joinTargetAddress as `0x${string}`, value, inner],
            });
        },
        [joinTargetAddress, selectedJoinEntryFee, selectedJoinEntryToken]
    );

    const computeCallData = useMemo(() => {
        if (mode === 'create') {
            if (!entryTokenAddress || !isAddress(entryTokenAddress)) {
                return '';
            }
            const inner = encodeFunctionData({
                abi: LOTTO_CREATE_ABI,
                functionName: 'createLotto',
                args: [parseEtherOrZero(entryFeeEth), parseBigIntOrZero(maxPlayers), entryTokenAddress as `0x${string}`],
            });

            return encodeFunctionData({
                abi: ETH_ACCOUNT_EXECUTE_ABI,
                functionName: 'execute',
                args: [lottoFactoryAddress as `0x${string}`, BigInt(0), inner],
            });
        }

        if (mode === 'faucet') {
            if (!entryTokenAddress || !isAddress(entryTokenAddress)) {
                return '';
            }

            const inner = encodeFunctionData({
                abi: ENTRY_TOKEN_FAUCET_ABI,
                functionName: 'claimTestTokens',
                args: [],
            });

            return encodeFunctionData({
                abi: ETH_ACCOUNT_EXECUTE_ABI,
                functionName: 'execute',
                args: [entryTokenAddress as `0x${string}`, BigInt(0), inner],
            });
        }

        return buildJoinActionCallData(selectedJoinAction);
    }, [buildJoinActionCallData, entryFeeEth, entryTokenAddress, lottoFactoryAddress, maxPlayers, mode, selectedJoinAction]);

    const fetchLottoInstances = useCallback(async () => {
        if (mode !== 'join') return;

        setIsLoadingLottoInstances(true);
        setLottoInstancesError('');

        try {
            const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
            const callJsonRpc = async (to: string, data: `0x${string}`) => {
                const response = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'eth_call',
                        params: [{ to, data }, 'latest'],
                    }),
                });
                const json = (await response.json()) as { result?: `0x${string}`; error?: { message?: string } };
                if (!response.ok || !json.result) {
                    throw new Error(json.error?.message ?? 'eth_call failed');
                }
                return json.result;
            };

            const allLottosData = encodeFunctionData({
                abi: LOTTO_FACTORY_VIEW_ABI,
                functionName: 'getAllLottos',
            });
            const allLottosRaw = await callJsonRpc(lottoFactoryAddress, allLottosData);
            const addresses = decodeFunctionResult({
                abi: LOTTO_FACTORY_VIEW_ABI,
                functionName: 'getAllLottos',
                data: allLottosRaw,
            }) as string[];

            const summaries = await Promise.all(
                addresses.map(async (address) => {
                    const [
                        playerCountRaw,
                        maxPlayersRaw,
                        entryFeeRaw,
                        entryTokenRaw,
                        lottoStateRaw,
                        winnerRaw,
                        prizeWithdrawnRaw,
                    ] = await Promise.all([
                        callJsonRpc(
                            address,
                            encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'getPlayerCount' })
                        ),
                        callJsonRpc(
                            address,
                            encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'maxPlayers' })
                        ),
                        callJsonRpc(address, encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'entryFee' })),
                        callJsonRpc(address, encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'entryToken' })),
                        callJsonRpc(
                            address,
                            encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'lottoState' })
                        ),
                        callJsonRpc(address, encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'winner' })),
                        callJsonRpc(
                            address,
                            encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'isPrizeWithdrawn' })
                        ),
                    ]);

                    return {
                        address,
                        playerCount: decodeFunctionResult({
                            abi: LOTTO_INSTANCE_VIEW_ABI,
                            functionName: 'getPlayerCount',
                            data: playerCountRaw,
                        }) as bigint,
                        maxPlayers: decodeFunctionResult({
                            abi: LOTTO_INSTANCE_VIEW_ABI,
                            functionName: 'maxPlayers',
                            data: maxPlayersRaw,
                        }) as bigint,
                        entryFee: decodeFunctionResult({
                            abi: LOTTO_INSTANCE_VIEW_ABI,
                            functionName: 'entryFee',
                            data: entryFeeRaw,
                        }) as bigint,
                        entryToken: decodeFunctionResult({
                            abi: LOTTO_INSTANCE_VIEW_ABI,
                            functionName: 'entryToken',
                            data: entryTokenRaw,
                        }) as string,
                        lottoState: toBigIntValue(
                            decodeFunctionResult({
                                abi: LOTTO_INSTANCE_VIEW_ABI,
                                functionName: 'lottoState',
                                data: lottoStateRaw,
                            })
                        ),
                        winner: decodeFunctionResult({
                            abi: LOTTO_INSTANCE_VIEW_ABI,
                            functionName: 'winner',
                            data: winnerRaw,
                        }) as string,
                        isPrizeWithdrawn: decodeFunctionResult({
                            abi: LOTTO_INSTANCE_VIEW_ABI,
                            functionName: 'isPrizeWithdrawn',
                            data: prizeWithdrawnRaw,
                        }) as boolean,
                    } as AALottoSummary;
                })
            );

            setLottoInstances(summaries);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load lottery instances.';
            setLottoInstancesError(message);
            setLottoInstances([]);
        } finally {
            setIsLoadingLottoInstances(false);
        }
    }, [lottoFactoryAddress, mode]);

    const fetchAccountNonce = useCallback(
        async (sender: string): Promise<bigint> => {
            if (!isAddress(sender)) {
                return BigInt(0);
            }

            const response = await fetch(`/api/aa/userop/nonce?sender=${sender}`, { method: 'GET' });
            const json = (await response.json()) as NonceResponse;
            if (!response.ok || !json.ok || json.nonce === undefined) {
                throw new Error(json.error ?? 'Failed to fetch account nonce.');
            }

            const nonce = BigInt(json.nonce);
            setAccountNonce(nonce);
            return nonce;
        },
        []
    );

    const fetchLetBalance = useCallback(async () => {
        if (!accountAddress || !isAddress(accountAddress)) {
            setLetBalance(null);
            return;
        }

        const tokenAddress =
            entryTokenAddress && isAddress(entryTokenAddress)
                ? entryTokenAddress
                : selectedJoinEntryToken && isAddress(selectedJoinEntryToken)
                  ? selectedJoinEntryToken
                  : '';
        if (!tokenAddress) {
            setLetBalance(null);
            return;
        }

        try {
            const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
            const callData = encodeFunctionData({
                abi: ERC20_BALANCE_OF_ABI,
                functionName: 'balanceOf',
                args: [accountAddress as `0x${string}`],
            });
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_call',
                    params: [{ to: tokenAddress, data: callData }, 'latest'],
                }),
            });
            const json = (await response.json()) as { result?: `0x${string}`; error?: { message?: string } };
            if (!response.ok || !json.result) {
                throw new Error(json.error?.message ?? 'Failed to fetch LET balance');
            }

            const balance = decodeFunctionResult({
                abi: ERC20_BALANCE_OF_ABI,
                functionName: 'balanceOf',
                data: json.result,
            }) as bigint;
            setLetBalance(balance);
        } catch (error) {
            console.error('Failed to fetch LET balance:', error);
            setLetBalance(null);
        }
    }, [accountAddress, entryTokenAddress, selectedJoinEntryToken]);

    const fetchJoinAllowance = useCallback(async () => {
        if (mode !== 'join') {
            setJoinEntryAllowance(null);
            return;
        }
        if (!accountAddress || !isAddress(accountAddress)) {
            setJoinEntryAllowance(null);
            return;
        }
        if (!joinTargetAddress || !isAddress(joinTargetAddress)) {
            setJoinEntryAllowance(null);
            return;
        }
        if (!selectedJoinEntryToken || !isAddress(selectedJoinEntryToken)) {
            setJoinEntryAllowance(null);
            return;
        }

        try {
            const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
            const callData = encodeFunctionData({
                abi: ERC20_ALLOWANCE_ABI,
                functionName: 'allowance',
                args: [accountAddress as `0x${string}`, joinTargetAddress as `0x${string}`],
            });
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_call',
                    params: [{ to: selectedJoinEntryToken, data: callData }, 'latest'],
                }),
            });
            const json = (await response.json()) as { result?: `0x${string}`; error?: { message?: string } };
            if (!response.ok || !json.result) {
                throw new Error(json.error?.message ?? 'Failed to fetch join allowance');
            }

            const allowance = decodeFunctionResult({
                abi: ERC20_ALLOWANCE_ABI,
                functionName: 'allowance',
                data: json.result,
            }) as bigint;
            setJoinEntryAllowance(allowance);
        } catch (error) {
            console.error('Failed to fetch join allowance:', error);
            setJoinEntryAllowance(null);
        }
    }, [accountAddress, joinTargetAddress, mode, selectedJoinEntryToken]);

    const handleSelectJoinTarget = useCallback((address: string, entryFeeWei?: bigint, entryTokenAddress?: string) => {
        setJoinTargetAddress(address);
        setSelectedJoinEntryFee(entryFeeWei ?? BigInt(0));
        setSelectedJoinEntryToken(entryTokenAddress ?? '');
    }, []);

    useEffect(() => {
        if (mode !== 'join') return;
        void fetchLottoInstances();
    }, [fetchLottoInstances, mode]);

    // Auto-computed fields
    const computedNonce = useMemo(() => accountNonce.toString(), [accountNonce]);

    const computedAccountGasLimits = useMemo(() => {
        if (mode === 'create') {
            return packAccountGasLimits(BigInt(300000), BigInt(500000));
        }
        if (mode === 'join') {
            return accountGasLimitsForJoinAction(selectedJoinAction);
        }
        return packAccountGasLimits(BigInt(150000), BigInt(200000));
    }, [mode, selectedJoinAction]);

    const computedPreVerificationGas = useMemo(() => '60000', []);

    const computedGasFees = useMemo(() => {
        const maxFeePerGas = BigInt(2e9);
        const maxPriorityFeePerGas = BigInt(1e9);
        // EntryPoint v0.7 packing order: high128=maxPriorityFeePerGas, low128=maxFeePerGas
        const packed = (maxPriorityFeePerGas << BigInt(128)) | maxFeePerGas;
        return `0x${packed.toString(16).padStart(64, '0')}`;
    }, []);

    const computedPaymasterAndData = useMemo(() => {
        const paymasterAddress = process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS;
        if ((mode !== 'create' && mode !== 'faucet' && mode !== 'join') || !paymasterAddress || !isAddress(paymasterAddress)) {
            return '0x';
        }

        // ERC-4337 packed format: paymaster(20) + verificationGasLimit(16) + postOpGasLimit(16) + data
        return encodePaymasterAndData(paymasterAddress, BigInt(120000), BigInt(40000));
    }, [mode]);

    // Update UserOp whenever computed fields change. If a signature exists but any
    // userOpHash input drifted (e.g. initCode cleared after deployment check), clear it
    // so we never send a stale signature (bundler → AA24).
    useEffect(() => {
        setUserOp((prev) => {
            const computedSender = accountAddress || '';
            const computed = {
                sender: computedSender || prev.sender,
                nonce: computedNonce,
                initCode: computeInitCode,
                callData: computeCallData || '0x',
                accountGasLimits: computedAccountGasLimits,
                preVerificationGas: computedPreVerificationGas,
                gasFees: computedGasFees,
                paymasterAndData: computedPaymasterAndData,
            };

            const hasSig = Boolean(prev.signature && prev.signature !== '0x');
            const senderAligned =
                !computedSender ||
                !prev.sender ||
                prev.sender.toLowerCase() === computedSender.toLowerCase();
            const hashInputsEqual =
                senderAligned &&
                prev.nonce === computed.nonce &&
                prev.initCode === computed.initCode &&
                prev.callData === computed.callData &&
                prev.accountGasLimits === computed.accountGasLimits &&
                prev.preVerificationGas === computed.preVerificationGas &&
                prev.gasFees === computed.gasFees &&
                prev.paymasterAndData === computed.paymasterAndData;

            if (hasSig && !hashInputsEqual) {
                return { ...prev, ...computed, signature: '0x' };
            }

            return { ...prev, ...computed };
        });
    }, [
        accountAddress,
        computeCallData,
        computeInitCode,
        computedAccountGasLimits,
        computedGasFees,
        computedNonce,
        computedPaymasterAndData,
        computedPreVerificationGas,
    ]);

    useEffect(() => {
        if (!userOp.signature || userOp.signature === '0x') {
            setSignResultHash('');
        }
    }, [userOp.signature]);

    // Field setters
    const handleUserOpFieldChange = useCallback((field: keyof UserOpFields, value: string) => {
        setUserOp((prev) => ({
            ...prev,
            [field]: value,
        }));
    }, []);

    const getPreviewUserOpForJoinAction = useCallback(
        (action: AAJoinAction): UserOpFields => ({
            ...userOp,
            callData: buildJoinActionCallData(action) || '0x',
            signature: '0x',
            accountGasLimits: accountGasLimitsForJoinAction(action),
        }),
        [buildJoinActionCallData, userOp]
    );

    const signUserOperationLocally = useCallback(
        async (nextUserOp: UserOpFields): Promise<{ signedUserOp: UserOpFields; userOpHash: string }> => {
            if (!web3Provider || !ownerAddress || !isAddress(ownerAddress)) {
                throw new Error('Connect Web3Auth first.');
            }

            const hashResponse = await fetch('/api/aa/userop/hash', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userOp: {
                        sender: nextUserOp.sender,
                        nonce: nextUserOp.nonce,
                        initCode: nextUserOp.initCode,
                        callData: nextUserOp.callData,
                        accountGasLimits: nextUserOp.accountGasLimits,
                        preVerificationGas: nextUserOp.preVerificationGas,
                        gasFees: nextUserOp.gasFees,
                        paymasterAndData: nextUserOp.paymasterAndData,
                        signature: '0x',
                    },
                }),
            });
            const hashJson = (await hashResponse.json()) as { ok?: boolean; userOpHash?: string; error?: string };
            if (!hashResponse.ok || !hashJson.ok || !hashJson.userOpHash) {
                throw new Error(hashJson.error ?? 'Failed to compute userOp hash (server).');
            }
            const userOpHash = hashJson.userOpHash as Hex;

            const walletClient = createWalletClient({
                chain: anvil,
                transport: custom(web3Provider),
                account: ownerAddress as `0x${string}`,
            });

            const signature = await walletClient.signMessage({
                account: ownerAddress as `0x${string}`,
                message: { raw: userOpHash },
            });

            // EthAccount uses OpenZeppelin MessageHashUtils.toEthSignedMessageHash(userOpHash) + ECDSA.recover.
            // That matches EIP-191 personal_sign over the 32-byte userOpHash (Web3Auth / viem).
            const eip191Digest = hashMessage({ raw: userOpHash });
            const recovered = await recoverAddress({ hash: eip191Digest, signature });
            if (recovered.toLowerCase() !== ownerAddress.toLowerCase()) {
                throw new Error(
                    `Signature does not match AA owner (recovered ${recovered}, owner ${ownerAddress}). Reconnect Web3Auth and try again.`
                );
            }

            return {
                userOpHash,
                signedUserOp: {
                    ...nextUserOp,
                    signature,
                },
            };
        },
        [ownerAddress, web3Provider]
    );

    // Sign UserOp
    const handleSignUserOp = useCallback(async () => {
        if (!sessionToken) {
            setStatus('Please log in with Web3Auth first.');
            return;
        }

        if (!userOp.sender) {
            setStatus('The sender address is required.');
            return;
        }

        if (mode === 'join') {
            const needsLet =
                selectedJoinAction === 'approveEntryFee' || selectedJoinAction === 'joinLotto';
            if (
                needsLet &&
                letBalance !== null &&
                selectedJoinEntryFee > BigInt(0) &&
                letBalance < selectedJoinEntryFee
            ) {
                setStatus('Not enough LET balance for this entry fee. Use the AA token faucet page first.');
                return;
            }

            const joinSummary = findLottoSummary(lottoInstances, joinTargetAddress);
            const stateGate = joinActionAllowedByState(selectedJoinAction, joinSummary, accountAddress);
            if (!stateGate.ok) {
                setStatus(stateGate.message);
                return;
            }

            if (
                selectedJoinAction === 'joinLotto' &&
                selectedJoinEntryFee > BigInt(0) &&
                (joinEntryAllowance === null || joinEntryAllowance < selectedJoinEntryFee)
            ) {
                setStatus('Approve entry fee first: sign and send approveEntryFee, then try joinLotto again.');
                return;
            }
        }

        try {
            setIsLoading(true);
            setStatus('Requesting UserOperation signature...');
            setBundlerResultHash('');
            const latestNonce = await fetchAccountNonce(userOp.sender);
            const userOpToSign = {
                ...userOp,
                nonce: latestNonce.toString(),
                ...(mode === 'join' ? { accountGasLimits: accountGasLimitsForJoinAction(selectedJoinAction) } : {}),
            };
            setUserOp(userOpToSign);

            const signed = await signUserOperationLocally(userOpToSign);
            setUserOp(signed.signedUserOp);
            setSignResultHash(signed.userOpHash);
            setStatus('UserOperation signature completed.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to sign user operation.';
            setStatus(`Error: ${message}`);
        } finally {
            setIsLoading(false);
        }
    }, [
        accountAddress,
        fetchAccountNonce,
        joinEntryAllowance,
        joinTargetAddress,
        letBalance,
        lottoInstances,
        mode,
        selectedJoinAction,
        selectedJoinEntryFee,
        sessionToken,
        signUserOperationLocally,
        userOp,
    ]);

    // Send UserOp to bundler
    const handleSendUserOp = useCallback(async () => {
        if (!sessionToken) {
            setStatus('Please log in with Web3Auth first.');
            return;
        }

        if (!userOp.signature || userOp.signature === '0x') {
            setStatus('Please sign the UserOperation first.');
            return;
        }

        try {
            setIsLoading(true);
            setStatus('Sending UserOperation to the bundler...');

            const latestNonce = await fetchAccountNonce(userOp.sender);
            if (latestNonce !== BigInt(userOp.nonce)) {
                setStatus(
                    `On-chain nonce changed (${userOp.nonce} -> ${latestNonce}). Re-sign the UserOperation, then send again.`
                );
                return;
            }

            const response = await fetch('/api/aa/userop/send', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userOp,
                    ...(signResultHash && /^0x[0-9a-fA-F]{64}$/i.test(signResultHash)
                        ? { clientUserOpHash: signResultHash }
                        : {}),
                }),
            });

            const json = (await response.json()) as SendUserOpResponse;
            if (!response.ok || !json.ok || !json.userOpHash) {
                const detail =
                    json.serverUserOpHash && json.clientUserOpHash
                        ? ` (client ${json.clientUserOpHash.slice(0, 12)}… vs server ${json.serverUserOpHash.slice(0, 12)}…)`
                        : '';
                throw new Error((json.error ?? 'Failed to send user operation.') + detail);
            }

            setBundlerResultHash(json.userOpHash);
            setAccountNonce((prev) => prev + BigInt(1));
            setStatus('UserOperation sent successfully.');
            await fetchLetBalance();
            if (mode === 'join') {
                await fetchJoinAllowance();
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to send user operation.';
            setStatus(`Error: ${message}`);
        } finally {
            setIsLoading(false);
        }
    }, [fetchAccountNonce, fetchJoinAllowance, fetchLetBalance, mode, sessionToken, signResultHash, userOp]);

    const handleSignUserOpForJoinAction = useCallback(
        async (action: AAJoinAction) => {
            setSelectedJoinAction(action);
            const preparedUserOp = {
                ...userOp,
                callData: buildJoinActionCallData(action) || '0x',
                signature: '0x',
                accountGasLimits: accountGasLimitsForJoinAction(action),
            };
            setUserOp(preparedUserOp);

            if (!sessionToken) {
                setStatus('Please log in with Web3Auth first.');
                return;
            }

            if (!preparedUserOp.sender) {
                setStatus('The sender address is required.');
                return;
            }

            if (
                (action === 'approveEntryFee' || action === 'joinLotto') &&
                letBalance !== null &&
                selectedJoinEntryFee > BigInt(0) &&
                letBalance < selectedJoinEntryFee
            ) {
                setStatus('Not enough LET balance for this entry fee. Use the AA token faucet page first.');
                return;
            }

            const joinSummary = findLottoSummary(lottoInstances, joinTargetAddress);
            const stateGate = joinActionAllowedByState(action, joinSummary, accountAddress);
            if (!stateGate.ok) {
                setStatus(stateGate.message);
                return;
            }

            if (
                action === 'joinLotto' &&
                selectedJoinEntryFee > BigInt(0) &&
                (joinEntryAllowance === null || joinEntryAllowance < selectedJoinEntryFee)
            ) {
                setStatus('Approve entry fee first: sign and send approveEntryFee, then try joinLotto again.');
                return;
            }

            try {
                setIsLoading(true);
                setStatus('Requesting UserOperation signature...');
                setBundlerResultHash('');
                const latestNonce = await fetchAccountNonce(preparedUserOp.sender);
                const userOpToSign = {
                    ...preparedUserOp,
                    nonce: latestNonce.toString(),
                };
                setUserOp(userOpToSign);
                const signed = await signUserOperationLocally(userOpToSign);
                setUserOp(signed.signedUserOp);
                setSignResultHash(signed.userOpHash);
                setStatus('UserOperation signature completed.');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to sign user operation.';
                setStatus(`Error: ${message}`);
            } finally {
                setIsLoading(false);
            }
        },
        [
            accountAddress,
            buildJoinActionCallData,
            fetchAccountNonce,
            joinEntryAllowance,
            joinTargetAddress,
            letBalance,
            lottoInstances,
            selectedJoinEntryFee,
            sessionToken,
            signUserOperationLocally,
            userOp,
        ]
    );

    const handleWeb3AuthLogin = useCallback(async () => {
        try {
            setIsLoading(true);
            setStatus('Processing Web3Auth login...');

            const provider = await connectWeb3Auth();
            setWeb3Provider(provider);

            const walletClient = createWalletClient({
                chain: anvil,
                transport: custom(provider),
            });
            const addresses = await walletClient.getAddresses();
            const connectedAddress = addresses[0];
            if (!connectedAddress || !isAddress(connectedAddress)) {
                throw new Error('Failed to read wallet address from Web3Auth provider.');
            }

            setSessionToken(connectedAddress);
            localStorage.setItem(SESSION_STORAGE_KEY, connectedAddress);
            setEmail('');

            setStatus('Loading AA account...');
            const nextAccountAddress = await fetchAaAccount(connectedAddress);
            await fetchAccountNonce(nextAccountAddress);
            if (mode === 'join') {
                await fetchLottoInstances();
            }
            setStatus('Web3Auth login and AA account connection completed.');
            setAaAccountHydrated(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Web3Auth login failed.';
            setStatus(`Error: ${message}`);
        } finally {
            setIsLoading(false);
        }
    }, [fetchAaAccount, fetchAccountNonce, fetchLottoInstances, mode]);

    // Refresh account
    const handleRefresh = useCallback(async () => {
        if (!sessionToken) {
            setStatus('Please log in with Web3Auth first.');
            return;
        }

        try {
            setIsLoading(true);
            setStatus('Refreshing AA account state...');
            const nextAccountAddress = await fetchAaAccount(sessionToken);
            await fetchAccountNonce(nextAccountAddress);
            if (mode === 'join') {
                await fetchLottoInstances();
            }
            setStatus('AA account state refreshed.');
            setAaAccountHydrated(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to refresh account.';
            setStatus(`Error: ${message}`);
        } finally {
            setIsLoading(false);
        }
    }, [fetchAaAccount, fetchAccountNonce, fetchLottoInstances, mode, sessionToken]);

    // Logout
    const handleLogout = useCallback(() => {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        void getWeb3Auth()
            .then((web3auth) => web3auth.logout())
            .catch(() => {});
        setSessionToken('');
        setWeb3Provider(null);
        setEmail('');
        setOwnerAddress('');
        setAccountAddress('');
        setAccountNonce(BigInt(0));
        setSalt('');
        setSignResultHash('');
        setBundlerResultHash('');
        setEntryFeeEth('0.01');
        setMaxPlayers('5');
        setJoinValueEth('0.01');
        setJoinTargetAddress('');
        setSelectedJoinAction('joinLotto');
        setSelectedJoinEntryFee(BigInt(0));
        setSelectedJoinEntryToken('');
        setLottoInstances([]);
        setIsLoadingLottoInstances(false);
        setLottoInstancesError('');
        setLetBalance(null);
        setJoinEntryAllowance(null);
        setAaAccountHydrated(false);
        setUserOp(EMPTY_USER_OP);
        setStatus('Web3Auth session has been reset.');
    }, []);

    useEffect(() => {
        if (!sessionToken || !accountAddress) return;
        void fetchAccountNonce(accountAddress).catch((error) => {
            console.error('Failed to refresh account nonce:', error);
        });
    }, [accountAddress, fetchAccountNonce, sessionToken]);

    useEffect(() => {
        void fetchLetBalance();
    }, [fetchLetBalance]);

    useEffect(() => {
        void fetchJoinAllowance();
        const id = setInterval(() => {
            void fetchJoinAllowance();
        }, 3000);
        return () => clearInterval(id);
    }, [fetchJoinAllowance]);

    const joinTargetSummary = useMemo(() => {
        if (mode !== 'join') return undefined;
        return findLottoSummary(lottoInstances, joinTargetAddress);
    }, [mode, lottoInstances, joinTargetAddress]);

    const hasSufficientJoinAllowance = useMemo(() => {
        if (mode !== 'join') return true;
        if (!(selectedJoinEntryFee > BigInt(0))) return false;
        if (joinEntryAllowance === null) return false;
        return joinEntryAllowance >= selectedJoinEntryFee;
    }, [joinEntryAllowance, mode, selectedJoinEntryFee]);

    const joinSignStateOk = useMemo(() => {
        if (mode !== 'join') return true;
        if (!joinActionAllowedByState(selectedJoinAction, joinTargetSummary, accountAddress).ok) return false;
        if (selectedJoinAction === 'joinLotto' && !hasSufficientJoinAllowance) return false;
        return true;
    }, [accountAddress, hasSufficientJoinAllowance, joinTargetSummary, mode, selectedJoinAction]);

    return {
        sessionToken,
        aaAccountHydrated,
        joinSignStateOk,
        email,
        ownerAddress,
        accountAddress,
        salt,
        status,
        isLoading,
        signResultHash,
        bundlerResultHash,
        letBalance,
        joinEntryAllowance,
        hasSufficientJoinAllowance,
        accountDeployed,
        userOp,
        entryFeeEth,
        setEntryFeeEth,
        maxPlayers,
        setMaxPlayers,
        joinValueEth,
        setJoinValueEth,
        joinTargetAddress,
        setJoinTargetAddress,
        selectedJoinEntryFee,
        selectedJoinAction,
        setSelectedJoinAction,
        lottoInstances,
        isLoadingLottoInstances,
        lottoInstancesError,
        fetchLottoInstances,
        handleSelectJoinTarget,
        handleUserOpFieldChange,
        handleSignUserOp,
        handleSignUserOpForJoinAction,
        handleSendUserOp,
        getPreviewUserOpForJoinAction,
        handleWeb3AuthLogin,
        handleRefresh,
        handleLogout,
    };
}
