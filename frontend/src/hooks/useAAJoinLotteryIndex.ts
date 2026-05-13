'use client';

import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { Address, isAddress } from 'viem';
import lottoFactoryAbi from '@/contracts/LottoFactory.json';
import { targetChainId } from '@/lib/targetNetwork';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
const LOTTO_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS;

const lottoInstanceReadAbi = [
  { type: 'function', name: 'getPlayerCount', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'maxPlayers', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'entryFee', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'lottoState', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
] as const;

export function aaStateToLabel(stateValue?: bigint | number) {
  if (stateValue === undefined) return '-';
  const state = typeof stateValue === 'bigint' ? Number(stateValue) : stateValue;
  if (state === 0) return 'OPEN';
  if (state === 1) return 'FULL';
  if (state === 2) return 'CALCULATING';
  if (state === 3) return 'CLOSED';
  if (state === 4) return 'REFUNDING';
  return `UNKNOWN (${state})`;
}

function toBigIntValue(value: unknown): bigint | undefined {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  return undefined;
}

export function useAAJoinLotteryIndex() {
  const configuredFactoryAddress = useMemo(
    () => (typeof LOTTO_FACTORY_ADDRESS === 'string' && isAddress(LOTTO_FACTORY_ADDRESS) ? (LOTTO_FACTORY_ADDRESS as Address) : undefined),
    []
  );

  const { data: lottoAddresses, isLoading: isLoadingLottoAddresses, isError: isLottoAddressesError } = useReadContract({
    address: configuredFactoryAddress ?? ZERO_ADDRESS,
    abi: lottoFactoryAbi,
    functionName: 'getAllLottos',
    chainId: targetChainId,
    query: { enabled: Boolean(configuredFactoryAddress), refetchInterval: 5000 },
  });

  const parsedLottoAddresses = useMemo(() => (lottoAddresses ? (lottoAddresses as Address[]) : []), [lottoAddresses]);

  const lottoReadContracts = useMemo(
    () =>
      parsedLottoAddresses.flatMap((lottoAddress) => [
        { address: lottoAddress, abi: lottoInstanceReadAbi, functionName: 'getPlayerCount' as const, chainId: targetChainId },
        { address: lottoAddress, abi: lottoInstanceReadAbi, functionName: 'maxPlayers' as const, chainId: targetChainId },
        { address: lottoAddress, abi: lottoInstanceReadAbi, functionName: 'entryFee' as const, chainId: targetChainId },
        { address: lottoAddress, abi: lottoInstanceReadAbi, functionName: 'lottoState' as const, chainId: targetChainId },
      ]),
    [parsedLottoAddresses]
  );

  const { data: lottoReadResults, isLoading: isLoadingLottoStats } = useReadContracts({
    contracts: lottoReadContracts,
    query: { enabled: parsedLottoAddresses.length > 0, refetchInterval: 3000 },
  });

  const lottoSummaries = useMemo(() => {
    const map = new Map<Address, { playerCount?: bigint; maxPlayers?: bigint; entryFee?: bigint; lottoState?: bigint }>();
    if (!lottoReadResults) return map;

    parsedLottoAddresses.forEach((lottoAddress, index) => {
      const base = index * 4;
      const playerCountResult = lottoReadResults[base];
      const maxPlayersResult = lottoReadResults[base + 1];
      const entryFeeResult = lottoReadResults[base + 2];
      const lottoStateResult = lottoReadResults[base + 3];

      map.set(lottoAddress, {
        playerCount: playerCountResult?.status === 'success' ? toBigIntValue(playerCountResult.result) : undefined,
        maxPlayers: maxPlayersResult?.status === 'success' ? toBigIntValue(maxPlayersResult.result) : undefined,
        entryFee: entryFeeResult?.status === 'success' ? toBigIntValue(entryFeeResult.result) : undefined,
        lottoState: lottoStateResult?.status === 'success' ? toBigIntValue(lottoStateResult.result) : undefined,
      });
    });

    return map;
  }, [lottoReadResults, parsedLottoAddresses]);

  return {
    configuredFactoryAddress,
    parsedLottoAddresses,
    isLoadingLottoAddresses,
    isLottoAddressesError,
    isLoadingLottoStats,
    lottoSummaries,
    lottoFactoryAddressText: LOTTO_FACTORY_ADDRESS ?? '(missing NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS)',
  };
}
