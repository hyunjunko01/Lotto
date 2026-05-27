import { isAddress } from 'viem';
import { z } from 'zod';
import { AA_JOIN_ACTIONS } from '@/lib/aa/constants';

const hexPattern = /^0x[0-9a-fA-F]*$/;

const bigintLikeSchema = z.union([z.string(), z.number(), z.bigint()]).refine((value) => {
    try {
        BigInt(value);
        return true;
    } catch {
        return false;
    }
}, 'must be bigint-convertible');

const addressSchema = z.string().refine((value) => isAddress(value), 'must be a valid address');
const hexSchema = z.string().regex(hexPattern, 'must be a hex string');

const bytes32Schema = z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'must be bytes32 hex');

export const estimateUserOpRequestSchema = z.object({
    mode: z.enum(['create', 'join', 'faucet']),
    selectedJoinAction: z.enum(AA_JOIN_ACTIONS).optional(),
    sender: addressSchema,
    nonce: bigintLikeSchema,
    initCode: hexSchema,
    callData: hexSchema,
    paymasterAddress: addressSchema.optional(),
    /** EIP-191 signature over userOpHash (required for EthAccount + Alchemy estimate). */
    signature: hexSchema.refine((value) => value !== '0x', 'signature is required'),
    /** Gas fields used when the client signed userOpHash (static template). */
    accountGasLimits: bytes32Schema,
    preVerificationGas: bigintLikeSchema,
    gasFees: bytes32Schema,
    paymasterAndData: hexSchema,
});

export type EstimateUserOpRequest = z.infer<typeof estimateUserOpRequestSchema>;
