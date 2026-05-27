export type UserOpReceiptStatus = 'pending' | 'included' | 'failed' | 'rpc-error';

export type UserOpReceiptTrace = {
    status: UserOpReceiptStatus;
    userOpHash: string;
    transactionHash?: string;
    success?: boolean;
    reason?: string;
};

type ReceiptApiResponse = UserOpReceiptTrace & {
    ok?: boolean;
    error?: string;
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
        }
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener(
            'abort',
            () => {
                clearTimeout(timer);
                reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true }
        );
    });
}

/**
 * Poll bundler until the UserOp is included on-chain (or fails / times out).
 * `eth_sendUserOperation` returning a hash only means the bundler accepted the op.
 */
export async function waitForUserOpReceipt(
    userOpHash: string,
    options?: { maxAttempts?: number; intervalMs?: number; signal?: AbortSignal }
): Promise<UserOpReceiptTrace> {
    const maxAttempts = options?.maxAttempts ?? 45;
    const intervalMs = options?.intervalMs ?? 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (options?.signal?.aborted) {
            return { status: 'pending', userOpHash };
        }

        const response = await fetch(
            `/api/aa/userop/receipt?userOpHash=${encodeURIComponent(userOpHash)}`,
            { method: 'GET', signal: options?.signal }
        );
        const json = (await response.json()) as ReceiptApiResponse;

        if (!response.ok || !json.ok) {
            return {
                status: 'rpc-error',
                userOpHash,
                reason: json.error ?? 'Failed to query UserOperation receipt.',
            };
        }

        if (json.status === 'included' || json.status === 'failed') {
            return {
                status: json.status,
                userOpHash,
                transactionHash: json.transactionHash,
                success: json.success,
                reason: json.reason,
            };
        }

        if (json.status === 'rpc-error') {
            return {
                status: 'rpc-error',
                userOpHash,
                reason: json.reason,
            };
        }

        try {
            await sleep(intervalMs, options?.signal);
        } catch {
            return { status: 'pending', userOpHash };
        }
    }

    return { status: 'pending', userOpHash };
}
