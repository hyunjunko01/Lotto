import { NextRequest, NextResponse } from 'next/server';
import {
    computeAAUserOpHash,
    sendAAUserOperationToBundler,
    type PackedUserOperation,
} from '@/lib/server/aaService';
import { sendUserOpRequestSchema, type SendUserOpRequest } from '@/lib/server/validation/userOp';
import { checkRateLimit, getClientIpFromHeaders } from '@/lib/server/security/rateLimit';

export const runtime = 'nodejs';

function isBytes32Hex(value: string): boolean {
    return /^0x[0-9a-fA-F]{64}$/.test(value);
}

function normalizeUserOp(input: NonNullable<SendUserOpRequest['userOp']>): PackedUserOperation {
    return {
        sender: input.sender,
        nonce: BigInt(input.nonce),
        initCode: input.initCode as `0x${string}`,
        callData: input.callData as `0x${string}`,
        accountGasLimits: input.accountGasLimits as `0x${string}`,
        preVerificationGas: BigInt(input.preVerificationGas),
        gasFees: input.gasFees as `0x${string}`,
        paymasterAndData: input.paymasterAndData as `0x${string}`,
        signature: input.signature as `0x${string}`,
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = sendUserOpRequestSchema.safeParse(body);
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
        const validBody: SendUserOpRequest = parsed.data;
        const clientIp = getClientIpFromHeaders(request.headers);
        const senderKey = validBody.userOp.sender.toLowerCase();

        const ipLimit = checkRateLimit({
            scope: 'aa-userop-send-ip',
            key: clientIp,
            limit: 30,
            windowMs: 60_000,
        });
        if (!ipLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests from this IP. Please retry later.' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(ipLimit.retryAfterSec),
                        'X-RateLimit-Scope': 'ip',
                    },
                }
            );
        }

        const senderLimit = checkRateLimit({
            scope: 'aa-userop-send-sender',
            key: senderKey,
            limit: 15,
            windowMs: 60_000,
        });
        if (!senderLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests for this sender. Please retry later.' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(senderLimit.retryAfterSec),
                        'X-RateLimit-Scope': 'sender',
                    },
                }
            );
        }

        const normalizedUserOp = normalizeUserOp(validBody.userOp);
        const serverUserOpHash = await computeAAUserOpHash(normalizedUserOp);

        if (validBody.clientUserOpHash && isBytes32Hex(validBody.clientUserOpHash)) {
            if (validBody.clientUserOpHash.toLowerCase() !== serverUserOpHash.toLowerCase()) {
                console.warn('[aa/userop/send] userOpHash mismatch', {
                    clientUserOpHash: validBody.clientUserOpHash,
                    serverUserOpHash,
                });
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            'userOpHash mismatch: the signed hash (client) does not match EntryPoint.getUserOpHash on AA_RPC_URL (server). Re-sign the UserOperation or check RPC / env addresses.',
                        clientUserOpHash: validBody.clientUserOpHash,
                        serverUserOpHash,
                    },
                    { status: 409 }
                );
            }
        }

        console.log('[aa/userop/send] userOpHash (server):', serverUserOpHash);
        console.log('[aa/userop/send] effective paymasterAndData:', normalizedUserOp.paymasterAndData);
        const result = await sendAAUserOperationToBundler(normalizedUserOp);

        return NextResponse.json({
            ok: true,
            serverUserOpHash,
            effectivePaymasterAndData: normalizedUserOp.paymasterAndData,
            ...result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send user operation.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
