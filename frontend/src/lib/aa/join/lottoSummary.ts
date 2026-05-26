import { isAddress } from 'viem';
import type { AALottoSummary } from '@/lib/aa/types';

export function findLottoSummary(instances: AALottoSummary[], joinTarget: string): AALottoSummary | undefined {
    if (!isAddress(joinTarget)) return undefined;
    return instances.find((item) => item.address.toLowerCase() === joinTarget.toLowerCase());
}

export function isRefundTimeoutElapsed(
    summary: AALottoSummary | undefined,
    nowSeconds = BigInt(Math.floor(Date.now() / 1000))
) {
    if (summary?.lottoState === undefined || Number(summary.lottoState) !== 2) return false;
    if (summary.randomnessRequestedAt === undefined || summary.calculatingTimeout === undefined) return false;
    return nowSeconds >= summary.randomnessRequestedAt + summary.calculatingTimeout;
}
