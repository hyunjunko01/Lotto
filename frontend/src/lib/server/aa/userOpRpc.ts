import { formatUserOperationRequest } from 'viem/account-abstraction';

/** Packed UserOp fields stored client-side and hashed on-chain (EntryPoint v0.7). */
export type PackedUserOperationForRpc = {
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

const DEFAULT_PAYMASTER_VERIFICATION_GAS = BigInt(120_000);
const DEFAULT_PAYMASTER_POST_OP_GAS = BigInt(40_000);

export function unpackAccountGasLimits(accountGasLimits: `0x${string}`): {
    verificationGasLimit: bigint;
    callGasLimit: bigint;
} {
    const packed = BigInt(accountGasLimits);
    const low128Mask = (BigInt(1) << BigInt(128)) - BigInt(1);

    return {
        verificationGasLimit: packed >> BigInt(128),
        callGasLimit: packed & low128Mask,
    };
}

export function unpackGasFees(gasFees: `0x${string}`): {
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
} {
    const packed = BigInt(gasFees);
    const low128Mask = (BigInt(1) << BigInt(128)) - BigInt(1);

    return {
        maxFeePerGas: packed & low128Mask,
        maxPriorityFeePerGas: packed >> BigInt(128),
    };
}

export function splitInitCodeForV07(initCode: `0x${string}`): {
    factory?: `0x${string}`;
    factoryData?: `0x${string}`;
} {
    if (initCode === '0x') {
        return {};
    }

    if (initCode.length < 42) {
        throw new Error('Invalid initCode: expected at least factory address bytes.');
    }

    const factory = `0x${initCode.slice(2, 42)}` as `0x${string}`;
    const factoryDataBody = initCode.slice(42);
    const factoryData = (`0x${factoryDataBody}` as `0x${string}`) || '0x';
    return { factory, factoryData };
}

export function splitPaymasterAndDataForV07(paymasterAndData: `0x${string}`): {
    paymaster?: `0x${string}`;
    paymasterVerificationGasLimit?: bigint;
    paymasterPostOpGasLimit?: bigint;
    paymasterData?: `0x${string}`;
} {
    if (paymasterAndData === '0x') {
        return {};
    }

    if (paymasterAndData.length < 42) {
        throw new Error('Invalid paymasterAndData: expected paymaster address prefix.');
    }

    const paymaster = `0x${paymasterAndData.slice(2, 42)}` as `0x${string}`;
    const body = paymasterAndData.slice(42);

    if (body.length >= 64) {
        const verificationPart = body.slice(0, 32);
        const postOpPart = body.slice(32, 64);
        const paymasterDataBody = body.slice(64);

        return {
            paymaster,
            paymasterVerificationGasLimit: BigInt(`0x${verificationPart || '0'}`),
            paymasterPostOpGasLimit: BigInt(`0x${postOpPart || '0'}`),
            paymasterData: (`0x${paymasterDataBody}` as `0x${string}`) || '0x',
        };
    }

    return {
        paymaster,
        paymasterVerificationGasLimit: DEFAULT_PAYMASTER_VERIFICATION_GAS,
        paymasterPostOpGasLimit: DEFAULT_PAYMASTER_POST_OP_GAS,
        paymasterData: (`0x${body}` as `0x${string}`) || '0x',
    };
}

/**
 * EntryPoint v0.7 bundler RPC shape (factory/paymaster fields).
 * Do NOT send initCode or paymasterAndData — bundlers treat that as v0.6.
 */
export function toEntryPointV07BundlerRpcUserOp(userOp: PackedUserOperationForRpc) {
    const { verificationGasLimit, callGasLimit } = unpackAccountGasLimits(userOp.accountGasLimits);
    const { maxFeePerGas, maxPriorityFeePerGas } = unpackGasFees(userOp.gasFees);

    return formatUserOperationRequest({
        sender: userOp.sender,
        nonce: userOp.nonce,
        callData: userOp.callData,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas: userOp.preVerificationGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        signature: userOp.signature,
        ...splitInitCodeForV07(userOp.initCode),
        ...splitPaymasterAndDataForV07(userOp.paymasterAndData),
    });
}
