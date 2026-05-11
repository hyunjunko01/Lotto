import { NextRequest, NextResponse } from 'next/server';
import { computeAAUserOpHash, type PackedUserOperation } from '@/lib/server/aaService';
import { hashUserOpRequestSchema, type HashUserOpRequest } from '@/lib/server/validation/userOp';

export const runtime = 'nodejs';

function normalizeUserOp(input: HashUserOpRequest['userOp']): PackedUserOperation {
    return {
        sender: input.sender,
        nonce: BigInt(input.nonce),
        initCode: input.initCode,
        callData: input.callData,
        accountGasLimits: input.accountGasLimits,
        preVerificationGas: BigInt(input.preVerificationGas),
        gasFees: input.gasFees,
        paymasterAndData: input.paymasterAndData,
        signature: '0x',
    };
}

/**
 * Single source of truth for EntryPoint.getUserOpHash (same RPC + env as /userop/send).
 * The browser should use this for signing instead of eth_call via the wallet provider.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = hashUserOpRequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: 'Invalid userOp payload.',
                    details: parsed.error.issues.map((issue) => ({
                        path: issue.path.join('.'),
                        message: issue.message,
                    })),
                },
                { status: 400 }
            );
        }
        const validBody: HashUserOpRequest = parsed.data;

        const normalized = normalizeUserOp(validBody.userOp);
        const userOpHash = await computeAAUserOpHash(normalized);

        return NextResponse.json({ ok: true, userOpHash });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to compute userOp hash.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
