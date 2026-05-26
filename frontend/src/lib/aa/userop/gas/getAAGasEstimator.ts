import type { UserOpGasEstimator } from '@/lib/aa/userop/gas/types';
import { staticUserOpGasEstimator } from '@/lib/aa/userop/gas/staticEstimator';

/** Swap implementation here when AA SDK gas estimation is ready. */
export function getAAGasEstimator(): UserOpGasEstimator {
    return staticUserOpGasEstimator;
}
