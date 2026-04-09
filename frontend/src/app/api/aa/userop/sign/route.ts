import { NextRequest, NextResponse } from 'next/server';
import { signUserOperation, type PackedUserOperation } from '@/lib/server/aaService';
import { readBearerToken, verifySessionToken } from '@/lib/server/session';

export const runtime = 'nodejs';

type SignUserOpRequest = {
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

function normalizeUserOp(input: NonNullable<SignUserOpRequest['userOp']>): PackedUserOperation {
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

        const body = (await request.json()) as SignUserOpRequest;
        if (!body.userOp) {
            return NextResponse.json({ error: 'userOp is required.' }, { status: 400 });
        }

        const normalizedUserOp = normalizeUserOp(body.userOp);
        const { signature, userOpHash } = await signUserOperation(session.googleSub, normalizedUserOp);

        return NextResponse.json({
            ok: true,
            userOpHash,
            signature,
            signedUserOp: {
                ...normalizedUserOp,
                nonce: normalizedUserOp.nonce.toString(),
                preVerificationGas: normalizedUserOp.preVerificationGas.toString(),
                signature,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sign user operation.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
