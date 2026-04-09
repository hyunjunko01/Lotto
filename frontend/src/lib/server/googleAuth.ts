type GoogleTokenInfo = {
    aud: string;
    sub: string;
    email?: string;
    email_verified?: 'true' | 'false';
    exp?: string;
};

const TOKENINFO_ENDPOINT = 'https://oauth2.googleapis.com/tokeninfo';

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo> {
    const url = `${TOKENINFO_ENDPOINT}?id_token=${encodeURIComponent(idToken)}`;
    const response = await fetch(url, { method: 'GET', cache: 'no-store' });

    if (!response.ok) {
        throw new Error('Google token verification failed.');
    }

    const tokenInfo = (await response.json()) as GoogleTokenInfo;

    if (!tokenInfo.sub || !tokenInfo.aud) {
        throw new Error('Google token payload missing required claims.');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && tokenInfo.aud !== clientId) {
        throw new Error('Google token aud mismatch.');
    }

    if (tokenInfo.exp && Number(tokenInfo.exp) * 1000 < Date.now()) {
        throw new Error('Google token expired.');
    }

    return tokenInfo;
}
