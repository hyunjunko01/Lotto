import type { UserOpGasEstimator } from '@/lib/aa/userop/gas/types';
import { bundlerUserOpGasEstimator } from '@/lib/aa/userop/gas/bundlerEstimator';
import { staticUserOpGasEstimator } from '@/lib/aa/userop/gas/staticEstimator';

/**
 * Bundler gas estimation via server `eth_estimateUserOperationGas` (viem/account-abstraction).
 * Set NEXT_PUBLIC_AA_GAS_ESTIMATOR=static to force legacy fixed limits.
 */
export function isStaticGasEstimator(): boolean {
    return process.env.NEXT_PUBLIC_AA_GAS_ESTIMATOR === 'static';
}

export function getAAGasEstimator(): UserOpGasEstimator {
    if (isStaticGasEstimator()) {
        return staticUserOpGasEstimator;
    }
    return bundlerUserOpGasEstimator;
}
