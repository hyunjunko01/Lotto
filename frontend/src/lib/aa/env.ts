import { isAddress } from 'viem';

export const AA_FACTORY_ENV_ERROR =
    '`NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS`, `NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS`, or `NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS` is missing or invalid. Check `.env.local` and restart the dev server.';

export type AAFactoryEnv = {
    lottoFactoryAddress: string;
    accountFactoryAddress: string;
    entryTokenAddress: string;
};

export function isValidAAAddress(value: unknown): value is `0x${string}` {
    return typeof value === 'string' && isAddress(value);
}

export function readAAFactoryEnv(): AAFactoryEnv | null {
    const lottoFactoryAddress = process.env.NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS;
    const accountFactoryAddress = process.env.NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS;
    const entryTokenAddress = process.env.NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS;

    if (
        !isValidAAAddress(lottoFactoryAddress) ||
        !isValidAAAddress(accountFactoryAddress) ||
        !isValidAAAddress(entryTokenAddress)
    ) {
        return null;
    }

    return { lottoFactoryAddress, accountFactoryAddress, entryTokenAddress };
}

export function readAALottoFactoryAddress(): string | undefined {
    const lottoFactoryAddress = process.env.NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS;
    return isValidAAAddress(lottoFactoryAddress) ? lottoFactoryAddress : undefined;
}
