import { NextRequest, NextResponse } from 'next/server';
import { sendUserOperationToBundler, type PackedUserOperation } from '@/lib/server/aaService';
import { readBearerToken, verifySessionToken } from '@/lib/server/session';

export const runtime = 'nodejs';

type SendUserOpRequest = {
    userOp?: {
        sender: `0x${string}`;
        nonce: string | number | bigint;
        initCode: `0x${string}`;
        callData: `0x${string}`;
        accountGasLimits: `0x${string}`;
        preVerificationGas: string | number | bigint;
        gasFees: `0x${string}`;
        paymasterAndData: `0x${string}`;
        signature: `0x${string}`;
    };
};

function normalizeUserOp(input: NonNullable<SendUserOpRequest['userOp']>): PackedUserOperation {
    return {
        ...input,
        nonce: BigInt(input.nonce),
        preVerificationGas: BigInt(input.preVerificationGas),
    };
}

export async function POST(request: NextRequest) {
    try {
        const token = readBearerToken(request.headers.get('authorization'));
        if (!token) {
            return NextResponse.json({ error: 'Missing bearer token.' }, { status: 401 });
        }

        const session = verifySessionToken(token);
        if (!session) {
            return NextResponse.json({ error: 'Invalid or expired session token.' }, { status: 401 });
        }

        const body = (await request.json()) as SendUserOpRequest;
        if (!body.userOp) {
            return NextResponse.json({ error: 'userOp is required.' }, { status: 400 });
        }

        const normalizedUserOp = normalizeUserOp(body.userOp);
        const result = await sendUserOperationToBundler(normalizedUserOp);

        return NextResponse.json({
            ok: true,
            ...result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send user operation.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
