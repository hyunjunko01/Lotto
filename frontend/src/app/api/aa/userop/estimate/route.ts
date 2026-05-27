import { NextRequest, NextResponse } from 'next/server';
import { estimateAAUserOpGas } from '@/lib/server/aa/estimateUserOpGas';
import { formatBundlerEstimateError } from '@/lib/server/aa/formatBundlerEstimateError';
import {
    estimateUserOpRequestSchema,
    type EstimateUserOpRequest,
} from '@/lib/server/validation/userOpEstimate';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = estimateUserOpRequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: 'Invalid userOp estimate payload.',
                    details: parsed.error.issues.map((issue) => ({
                        path: issue.path.join('.'),
                        message: issue.message,
                    })),
                },
                { status: 400 }
            );
        }

        const validBody: EstimateUserOpRequest = parsed.data;
        const gas = await estimateAAUserOpGas({
            mode: validBody.mode,
            sender: validBody.sender as `0x${string}`,
            nonce: BigInt(validBody.nonce),
            initCode: validBody.initCode as `0x${string}`,
            callData: validBody.callData as `0x${string}`,
            paymasterAddress: validBody.paymasterAddress,
            signature: validBody.signature as `0x${string}`,
            accountGasLimits: validBody.accountGasLimits as `0x${string}`,
            preVerificationGas: BigInt(validBody.preVerificationGas),
            gasFees: validBody.gasFees as `0x${string}`,
            paymasterAndData: validBody.paymasterAndData as `0x${string}`,
        });

        return NextResponse.json({ ok: true, gas });
    } catch (error) {
        const message = formatBundlerEstimateError(error);
        console.error('[aa/userop/estimate]', message, error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
