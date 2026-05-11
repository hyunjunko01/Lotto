import { isAddress } from 'viem';
import { z } from 'zod';

const hexPattern = /^0x[0-9a-fA-F]*$/;
const bytes32Pattern = /^0x[0-9a-fA-F]{64}$/;

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
const bytes32Schema = z.string().regex(bytes32Pattern, 'must be bytes32 hex');

const userOpBaseSchema = z.object({
    sender: addressSchema,
    nonce: bigintLikeSchema,
    initCode: hexSchema,
    callData: hexSchema,
    accountGasLimits: bytes32Schema,
    preVerificationGas: bigintLikeSchema,
    gasFees: bytes32Schema,
    paymasterAndData: hexSchema,
});

const userOpForSendSchema = userOpBaseSchema.extend({
    signature: hexSchema.refine((value) => value !== '0x', 'signature is required'),
});

const userOpForHashSchema = userOpBaseSchema.extend({
    signature: hexSchema.optional(),
});

const bytes32OptionalSchema = z.string().regex(bytes32Pattern, 'must be bytes32 hex').optional();

export const sendUserOpRequestSchema = z.object({
    clientUserOpHash: bytes32OptionalSchema,
    userOp: userOpForSendSchema,
});

export const hashUserOpRequestSchema = z.object({
    userOp: userOpForHashSchema,
});

export type SendUserOpRequest = z.infer<typeof sendUserOpRequestSchema>;
export type HashUserOpRequest = z.infer<typeof hashUserOpRequestSchema>;
