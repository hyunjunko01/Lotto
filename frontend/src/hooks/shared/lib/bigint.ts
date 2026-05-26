export function toBigIntValue(value: unknown): bigint | undefined {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return undefined;
}
