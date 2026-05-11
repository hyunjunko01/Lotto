import { NextRequest, NextResponse } from 'next/server';
import { traceAAUserOperation } from '@/lib/server/aaService';

export const runtime = 'nodejs';

function isUserOpHash(value: string): value is `0x${string}` {
    return /^0x[0-9a-fA-F]{64}$/.test(value);
}

export async function GET(request: NextRequest) {
    try {
        const userOpHash = request.nextUrl.searchParams.get('userOpHash');
        if (!userOpHash || !isUserOpHash(userOpHash)) {
            return NextResponse.json(
                { error: 'Valid userOpHash query parameter is required.' },
                { status: 400 }
            );
        }

        const trace = await traceAAUserOperation(userOpHash);

        return NextResponse.json({
            ok: true,
            ...trace,
            checkedAt: new Date().toISOString(),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to trace user operation.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
