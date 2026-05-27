/**
 * Surfaces EntryPoint / bundler simulation failures from viem `estimateUserOperationGas`.
 */
export function formatBundlerEstimateError(error: unknown): string {
    const parts: string[] = [];
    let current: unknown = error;
    for (let depth = 0; depth < 6 && current; depth++) {
        if (current instanceof Error) {
            if (current.message) {
                parts.push(current.message);
            }
            const withData = current as Error & { data?: unknown; details?: string };
            if (typeof withData.details === 'string') {
                parts.push(withData.details);
            }
            current = current.cause;
            continue;
        }
        break;
    }

    const combined = parts.join(' ');
    const aaMatch = combined.match(/AA\d{2}[^"'\\]*/);
    if (aaMatch) {
        return `Bundler simulation failed (${aaMatch[0]}). Check callData, paymaster allowlist, and hash-anchor gas floors.`;
    }

    if (/execution reverted/i.test(combined)) {
        return (
            'Bundler simulation reverted during gas estimation. ' +
            'Often the estimate request callGasLimit cap is too low for this action (e.g. createLotto), ' +
            'or the inner call reverts (paymaster allowlist, token, factory).'
        );
    }

    return error instanceof Error ? error.message : 'Failed to estimate userOp gas.';
}
