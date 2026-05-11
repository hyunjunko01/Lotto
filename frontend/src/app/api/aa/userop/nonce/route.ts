import { NextRequest, NextResponse } from 'next/server';
import { getAAAccountNonce } from '@/lib/server/aaService';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const sender = request.nextUrl.searchParams.get('sender');
        if (!sender) {
            return NextResponse.json({ error: 'sender is required.' }, { status: 400 });
        }

        const nonce = await getAAAccountNonce(sender as `0x${string}`);
        return NextResponse.json({ ok: true, nonce: nonce.toString() });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch account nonce.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
