'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    decodeFunctionResult,
    encodeFunctionData,
    type Hex,
    createWalletClient,
    custom,
    hashMessage,
    isAddress,
    recoverAddress,
} from 'viem';
import type { IProvider } from '@web3auth/base';
import type { UserOpFields } from '@/components/aa/types';
import accountFactoryAbi from '@/contracts/AccountFactory.json';
import { connectWeb3Auth, getWeb3Auth } from '@/lib/web3auth';
import { targetChain, targetRpcUrl } from '@/lib/targetNetwork';
import {
    ENTRY_TOKEN_FAUCET_ABI,
    ERC20_ALLOWANCE_ABI,
    ERC20_APPROVE_ABI,
    ERC20_BALANCE_OF_ABI,
    ETH_ACCOUNT_EXECUTE_ABI,
    LOTTO_CLAIM_REFUND_ABI,
    LOTTO_CREATE_ABI,
    LOTTO_JOIN_ABI,
    LOTTO_REQUEST_WINNER_ABI,
    LOTTO_TRIGGER_REFUND_MODE_ABI,
    LOTTO_WITHDRAW_PRIZE_ABI,
} from './abis';
import { EMPTY_USER_OP, SESSION_STORAGE_KEY } from './constants';
import { fetchLottoSummaries } from './fetchLottoSummaries';
import {
    accountGasLimitsForJoinAction,
    deriveSaltFromOwnerAddress,
    encodePaymasterAndData,
    findLottoSummary,
    joinActionAllowedByState,
    packAccountGasLimits,
    parseBigIntOrZero,
    parseEtherOrZero,
} from './helpers';
import type {
    AAJoinAction,
    AALottoSummary,
    AccountResponse,
    NonceResponse,
    SendUserOpResponse,
    UseAALotteryProps,
} from './types';

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

        const json = (await response.json()) as AccountResponse;
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
                const rpcUrl = targetRpcUrl || 'http://127.0.0.1:8545';
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
            const value = BigInt(0);

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
            }
            if (action === 'joinLotto') {
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
            const rpcUrl = targetRpcUrl || 'http://127.0.0.1:8545';
            const summaries = await fetchLottoSummaries(rpcUrl, lottoFactoryAddress);
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
            const rpcUrl = targetRpcUrl || 'http://127.0.0.1:8545';
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
            const rpcUrl = targetRpcUrl || 'http://127.0.0.1:8545';
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

    const handleSelectJoinTarget = useCallback((address: string, entryFeeWei?: bigint, entryToken?: string) => {
        setJoinTargetAddress(address);
        setSelectedJoinEntryFee(entryFeeWei ?? BigInt(0));
        setSelectedJoinEntryToken(entryToken ?? '');
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
                chain: targetChain,
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
                chain: targetChain,
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
