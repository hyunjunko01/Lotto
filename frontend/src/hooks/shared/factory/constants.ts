import type { Address } from 'viem';

export const ANVIL_LOTTO_FACTORY_ADDRESS: Address = '0x7a2088a1bFc9d81c55368AE168C2C02570cB814F';

export const LOTTO_FACTORY_ADDRESS =
    (process.env.NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS as Address | undefined) ?? ANVIL_LOTTO_FACTORY_ADDRESS;

export const LOTTO_FACTORY_ADDRESS_ENV = process.env.NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS;
