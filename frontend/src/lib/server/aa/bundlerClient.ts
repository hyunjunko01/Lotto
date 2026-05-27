/** Bundler client for `eth_estimateUserOperationGas` / `eth_sendUserOperation` (viem/account-abstraction). */
import { createBundlerClient } from 'viem/account-abstraction';
import { http } from 'viem';
import { targetChain } from '@/lib/targetNetwork';
import { getAaBundlerUrl } from '@/lib/server/aa/config';

export function createAaBundlerClient() {
    return createBundlerClient({
        chain: targetChain,
        transport: http(getAaBundlerUrl()),
    });
}
