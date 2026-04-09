import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_SECRET = process.env.AA_SESSION_SECRET ?? 'dev-only-session-secret-change-me';
const SESSION_TTL_SECONDS = Number(process.env.AA_SESSION_TTL_SECONDS ?? 60 * 60 * 12);

type SessionPayload = {
    googleSub: string;
    email?: string;
    exp: number;
};

function base64UrlEncode(input: string): string {
    return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string): string {
    return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(unsignedToken: string): string {
    return createHmac('sha256', SESSION_SECRET).update(unsignedToken).digest('base64url');
}

export function createSessionToken(googleSub: string, email?: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload: SessionPayload = {
        googleSub,
        email,
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const unsigned = `${encodedHeader}.${encodedPayload}`;
    const signature = sign(unsigned);

    return `${unsigned}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const unsigned = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = sign(unsigned);

    const a = Buffer.from(signature, 'base64url');
    const b = Buffer.from(expectedSignature, 'base64url');

    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    try {
        const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
        if (!payload.googleSub || !payload.exp) return null;
        if (payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch {
        return null;
    }
}

export function readBearerToken(authHeader: string | null): string | null {
    if (!authHeader) return null;
    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token;
}
