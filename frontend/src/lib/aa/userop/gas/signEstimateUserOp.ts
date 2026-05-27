import type { IProvider } from '@web3auth/base';
import { createWalletClient, custom, type Hex } from 'viem';
import type { UserOpGasEstimate } from '@/lib/aa/userop/gas/types';
import { targetChain } from '@/lib/targetNetwork';

type UserOpHashPayload = {
    sender: string;
    nonce: string | bigint;
    initCode: `0x${string}`;
    callData: string;
    gas: UserOpGasEstimate;
};

/**
 * EthAccount validates ECDSA on-chain; Alchemy estimate fails (AA23) with zeroed dummy signatures.
 * Sign a userOpHash built from static gas fields, then pass that signature into eth_estimateUserOperationGas.
 */
export async function signUserOpHashForEstimate(
    web3Provider: IProvider,
    ownerAddress: `0x${string}`,
    payload: UserOpHashPayload
): Promise<Hex> {
    const hashResponse = await fetch('/api/aa/userop/hash', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            userOp: {
                sender: payload.sender,
                nonce: payload.nonce.toString(),
                initCode: payload.initCode,
                callData: payload.callData,
                accountGasLimits: payload.gas.accountGasLimits,
                preVerificationGas: payload.gas.preVerificationGas,
                gasFees: payload.gas.gasFees,
                paymasterAndData: payload.gas.paymasterAndData,
                signature: '0x',
            },
        }),
    });

    const hashJson = (await hashResponse.json()) as { ok?: boolean; userOpHash?: string; error?: string };
    if (!hashResponse.ok || !hashJson.ok || !hashJson.userOpHash) {
        throw new Error(hashJson.error ?? 'Failed to compute userOp hash for gas estimation.');
    }

    const walletClient = createWalletClient({
        chain: targetChain,
        transport: custom(web3Provider),
        account: ownerAddress,
    });

    return walletClient.signMessage({
        account: ownerAddress,
        message: { raw: hashJson.userOpHash as Hex },
    });
}
