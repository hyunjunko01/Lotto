import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import type { Address, Hex } from 'viem';

type StoredUser = {
    googleSub: string;
    email?: string;
    privateKey: Hex;
    ownerAddress: Address;
    salt: string;
    createdAt: string;
    updatedAt: string;
};

type StoreShape = {
    users: Record<string, StoredUser>;
};

const DATA_DIR = path.join(process.cwd(), '.aa-data');
const STORE_FILE = path.join(DATA_DIR, 'users.json');

async function ensureStoreFile(): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true });
    try {
        await readFile(STORE_FILE, 'utf8');
    } catch {
        const initial: StoreShape = { users: {} };
        await writeFile(STORE_FILE, JSON.stringify(initial, null, 2), 'utf8');
    }
}

async function readStore(): Promise<StoreShape> {
    await ensureStoreFile();
    const raw = await readFile(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed.users) {
        return { users: {} };
    }
    return parsed;
}

async function writeStore(store: StoreShape): Promise<void> {
    await writeFile(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function deriveSaltFromGoogleSub(googleSub: string): string {
    const digest = createHash('sha256').update(googleSub).digest('hex');
    return BigInt(`0x${digest}`).toString();
}

export async function getOrCreateUserForGoogle(googleSub: string, email?: string): Promise<StoredUser> {
    const store = await readStore();
    const existing = store.users[googleSub];

    if (existing) {
        const updated: StoredUser = {
            ...existing,
            email: email ?? existing.email,
            updatedAt: new Date().toISOString(),
        };
        store.users[googleSub] = updated;
        await writeStore(store);
        return updated;
    }

    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const now = new Date().toISOString();

    const created: StoredUser = {
        googleSub,
        email,
        privateKey,
        ownerAddress: account.address,
        salt: deriveSaltFromGoogleSub(googleSub),
        createdAt: now,
        updatedAt: now,
    };

    store.users[googleSub] = created;
    await writeStore(store);
    return created;
}
