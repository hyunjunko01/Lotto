import { NextRequest, NextResponse } from 'next/server';
import { getAAIdentityFromOwner } from '@/lib/server/aaService';
import { isAddress } from 'viem';

export const runtime = 'nodejs';

function parseAndValidate(request: NextRequest): { ownerAddress: `0x${string}`; salt: string } | NextResponse {
    const ownerAddressParam = request.nextUrl.searchParams.get('ownerAddress');
    const saltParam = request.nextUrl.searchParams.get('salt');

    if (!ownerAddressParam || !saltParam) {
        return NextResponse.json(
            { error: 'ownerAddress and salt query parameters are required (Web3Auth EOA + client-derived salt).' },
            { status: 400 }
        );
    }

    if (!isAddress(ownerAddressParam)) {
        return NextResponse.json({ error: 'ownerAddress must be a valid address.' }, { status: 400 });
    }

    return { ownerAddress: ownerAddressParam, salt: saltParam };
}

export async function GET(request: NextRequest) {
    try {
        const parsed = parseAndValidate(request);
        if (parsed instanceof NextResponse) {
            return parsed;
        }
        const identity = await getAAIdentityFromOwner(parsed.ownerAddress, parsed.salt);

        return NextResponse.json({
            ok: true,
            account: {
                ownerAddress: identity.ownerAddress,
                accountAddress: identity.accountAddress,
                salt: identity.salt,
            },
        });
    } catch (error) {
        const rawMessage = error instanceof Error ? error.message : 'Failed to get AA account.';
        const message = /fetch failed|HTTP request failed/i.test(rawMessage)
            ? 'Failed to reach RPC (AA_RPC_URL). Check the configured target network RPC and restart the flow.'
            : rawMessage;
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
