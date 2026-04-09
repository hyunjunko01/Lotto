import { NextRequest, NextResponse } from 'next/server';
import { createAccountIfMissing, getOrCreateAaIdentity } from '@/lib/server/aaService';
import { readBearerToken, verifySessionToken } from '@/lib/server/session';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const token = readBearerToken(request.headers.get('authorization'));
        if (!token) {
            return NextResponse.json({ error: 'Missing bearer token.' }, { status: 401 });
        }

        const session = verifySessionToken(token);
        if (!session) {
            return NextResponse.json({ error: 'Invalid or expired session token.' }, { status: 401 });
        }

        const identity = await getOrCreateAaIdentity(session.googleSub, session.email);
        const shouldCreate = request.nextUrl.searchParams.get('createIfMissing') === 'true';

        let deployedAccountAddress = identity.accountAddress;
        if (shouldCreate) {
            deployedAccountAddress = await createAccountIfMissing(identity.ownerAddress, identity.salt);
        }

        return NextResponse.json({
            ok: true,
            account: {
                ownerAddress: identity.ownerAddress,
                accountAddress: deployedAccountAddress,
                salt: identity.salt,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get AA account.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
