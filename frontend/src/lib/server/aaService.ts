import { privateKeyToAccount } from 'viem/accounts';
import {
    createPublicClient,
    createWalletClient,
    encodeFunctionData,
    Hex,
    http,
    isAddress,
    parseAbi,
} from 'viem';
import { anvil } from 'viem/chains';
import accountFactoryAbi from '@/contracts/AccountFactory.json';
import { getOrCreateUserForGoogle } from './aaStore';

type PackedUserOperation = {
    sender: `0x${string}`;
    nonce: bigint;
    initCode: `0x${string}`;
    callData: `0x${string}`;
    accountGasLimits: `0x${string}`;
    preVerificationGas: bigint;
    gasFees: `0x${string}`;
    paymasterAndData: `0x${string}`;
    signature: `0x${string}`;
};

const ENTRY_POINT_ABI = parseAbi([
    'function getUserOpHash((address sender,uint256 nonce,bytes initCode,bytes callData,bytes32 accountGasLimits,uint256 preVerificationGas,bytes32 gasFees,bytes paymasterAndData,bytes signature) userOp) view returns (bytes32)',
]);

const FACTORY_INTERFACE_ABI = accountFactoryAbi;

function getRpcUrl(): string {
    return process.env.AA_RPC_URL ?? 'http://127.0.0.1:8545';
}

function getBundlerUrl(): string {
    return process.env.AA_BUNDLER_URL ?? 'http://127.0.0.1:4337';
}

function getAccountFactoryAddress(): `0x${string}` {
    const value = process.env.AA_ACCOUNT_FACTORY_ADDRESS ?? process.env.NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS;
    if (!value || !isAddress(value)) {
        throw new Error('AA_ACCOUNT_FACTORY_ADDRESS is required and must be a valid address.');
    }
    return value;
}

function getEntryPointAddress(): `0x${string}` {
    const value = process.env.AA_ENTRY_POINT_ADDRESS;
    if (!value || !isAddress(value)) {
        throw new Error('AA_ENTRY_POINT_ADDRESS is required and must be a valid address.');
    }
    return value;
}

function getRelayerPrivateKey(): Hex {
    const value = process.env.AA_RELAYER_PRIVATE_KEY as Hex | undefined;
    if (!value || !value.startsWith('0x')) {
        throw new Error('AA_RELAYER_PRIVATE_KEY is required to broadcast createAccount transactions.');
    }
    return value;
}

function getPublicClient() {
    return createPublicClient({
        chain: anvil,
        transport: http(getRpcUrl()),
    });
}

function getWalletClient(privateKey: Hex) {
    const account = privateKeyToAccount(privateKey);
    return createWalletClient({
        chain: anvil,
        account,
        transport: http(getRpcUrl()),
    });
}

export async function getOrCreateAaIdentity(googleSub: string, email?: string) {
    const user = await getOrCreateUserForGoogle(googleSub, email);
    const publicClient = getPublicClient();
    const factory = getAccountFactoryAddress();

    const accountAddress = (await publicClient.readContract({
        address: factory,
        abi: FACTORY_INTERFACE_ABI,
        functionName: 'getAddress',
        args: [user.ownerAddress, BigInt(user.salt)],
    })) as `0x${string}`;

    return {
        googleSub: user.googleSub,
        email: user.email,
        ownerAddress: user.ownerAddress,
        salt: user.salt,
        accountAddress,
    };
}

export async function createAccountIfMissing(ownerAddress: `0x${string}`, salt: string): Promise<`0x${string}`> {
    const publicClient = getPublicClient();
    const walletClient = getWalletClient(getRelayerPrivateKey());
    const factory = getAccountFactoryAddress();

    const predicted = (await publicClient.readContract({
        address: factory,
        abi: FACTORY_INTERFACE_ABI,
        functionName: 'getAddress',
        args: [ownerAddress, BigInt(salt)],
    })) as `0x${string}`;

    const code = await publicClient.getBytecode({ address: predicted });
    if (code && code !== '0x') {
        return predicted;
    }

    const txHash = await walletClient.writeContract({
        chain: anvil,
        address: factory,
        abi: FACTORY_INTERFACE_ABI,
        functionName: 'createAccount',
        args: [ownerAddress, BigInt(salt)],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return predicted;
}

export async function signUserOperation(googleSub: string, userOp: PackedUserOperation): Promise<{ signature: Hex; userOpHash: Hex }> {
    const user = await getOrCreateUserForGoogle(googleSub);
    const signer = privateKeyToAccount(user.privateKey);
    const publicClient = getPublicClient();
    const entryPoint = getEntryPointAddress();

    const userOpHash = (await publicClient.readContract({
        address: entryPoint,
        abi: ENTRY_POINT_ABI,
        functionName: 'getUserOpHash',
        args: [userOp],
    })) as Hex;

    const signature = await signer.signMessage({
        message: { raw: userOpHash },
    });

    return { signature, userOpHash };
}

export async function buildCreateAccountInitCode(ownerAddress: `0x${string}`, salt: string): Promise<Hex> {
    const factory = getAccountFactoryAddress();
    const data = encodeFunctionData({
        abi: FACTORY_INTERFACE_ABI,
        functionName: 'createAccount',
        args: [ownerAddress, BigInt(salt)],
    });
    return `${factory}${data.slice(2)}` as Hex;
}

export async function sendUserOperationToBundler(userOp: PackedUserOperation): Promise<{ userOpHash: string }> {
    const bundlerUrl = getBundlerUrl();
    const entryPoint = getEntryPointAddress();

    const payload = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_sendUserOperation',
        params: [
            {
                ...userOp,
                nonce: `0x${userOp.nonce.toString(16)}`,
                preVerificationGas: `0x${userOp.preVerificationGas.toString(16)}`,
            },
            entryPoint,
        ],
    };

    const response = await fetch(bundlerUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const json = (await response.json()) as { result?: string; error?: { message?: string } };

    if (!response.ok || json.error || !json.result) {
        throw new Error(json.error?.message ?? 'Bundler eth_sendUserOperation failed.');
    }

    return { userOpHash: json.result };
}

export type { PackedUserOperation };
