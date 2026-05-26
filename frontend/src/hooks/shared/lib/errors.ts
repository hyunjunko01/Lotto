import { BaseError } from 'viem';

export function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof BaseError) return error.shortMessage || fallback;
    if (error instanceof Error) return error.message || fallback;
    return fallback;
}
