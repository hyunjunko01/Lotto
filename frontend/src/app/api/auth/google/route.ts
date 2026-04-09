import { NextRequest, NextResponse } from 'next/server';
import { verifyGoogleIdToken } from '@/lib/server/googleAuth';
import { createSessionToken } from '@/lib/server/session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as { idToken?: string };
        if (!body.idToken) {
            return NextResponse.json({ error: 'idToken is required.' }, { status: 400 });
        }

        const tokenInfo = await verifyGoogleIdToken(body.idToken);
        const sessionToken = createSessionToken(tokenInfo.sub, tokenInfo.email);

        return NextResponse.json({
            ok: true,
            sessionToken,
            user: {
                googleSub: tokenInfo.sub,
                email: tokenInfo.email,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Google authentication failed.';
        return NextResponse.json({ error: message }, { status: 401 });
    }
}
