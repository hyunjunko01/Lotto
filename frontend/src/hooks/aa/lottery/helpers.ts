import { isAddress, keccak256, parseEther, toHex } from 'viem';
import type { AAJoinAction, AALottoSummary } from './types';

export function parseEtherOrZero(value: string): bigint {
    try {
        return parseEther(value || '0');
    } catch {
        return BigInt(0);
    }
}

export function parseBigIntOrZero(value: string): bigint {
    try {
        return BigInt(value || '0');
    } catch {
        return BigInt(0);
    }
}

export function toBigIntValue(value: unknown): bigint | undefined {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return undefined;
}

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

export function packAccountGasLimits(verificationGasLimit: bigint, callGasLimit: bigint): `0x${string}` {
    const packed = (verificationGasLimit << BigInt(128)) | callGasLimit;
    return `0x${packed.toString(16).padStart(64, '0')}`;
}

export function deriveSaltFromOwnerAddress(ownerAddress: `0x${string}`): string {
    const digest = keccak256(toHex(ownerAddress.toLowerCase()));
    return BigInt(digest).toString();
}

/** Join actions: requestWinner hits VRF via factory and needs much higher callGas than approve/join. */
export function accountGasLimitsForJoinAction(action: AAJoinAction): `0x${string}` {
    if (action === 'requestWinner') {
        return packAccountGasLimits(BigInt(300000), BigInt(1200000));
    }
    return packAccountGasLimits(BigInt(150000), BigInt(200000));
}

/** Matches MetaMask lotto page: OPEN=approve/join, FULL=requestWinner, CLOSED+winner+AA=withdraw */
export function joinActionAllowedByState(
    action: AAJoinAction,
    summary: AALottoSummary | undefined,
    aaAccountAddress: string
): { ok: true } | { ok: false; message: string } {
    const st =
        summary?.lottoState !== undefined && summary.lottoState !== null ? Number(summary.lottoState) : undefined;

    if (action === 'approveEntryFee' || action === 'joinLotto') {
        if (st !== 0) {
            return {
                ok: false,
                message:
                    st === undefined
                        ? 'Lottery state could not be read. Use Refresh Account State or reload instances, then try again.'
                        : 'approve and join are only available while lottery status is OPEN.',
            };
        }
        return { ok: true };
    }

    if (action === 'requestWinner') {
        if (st !== 1) {
            return {
                ok: false,
                message:
                    st === undefined
                        ? 'Lottery state could not be read. Use Refresh Account State or reload instances, then try again.'
                        : 'requestWinner is only available while lottery status is FULL.',
            };
        }
        return { ok: true };
    }

    if (action === 'triggerRefundMode') {
        if (st !== 2) {
            return {
                ok: false,
                message:
                    st === undefined
                        ? 'Lottery state could not be read. Use Refresh Account State or reload instances, then try again.'
                        : 'triggerRefundMode is only available while lottery status is CALCULATING.',
            };
        }
        if (!isRefundTimeoutElapsed(summary)) {
            return {
                ok: false,
                message: 'triggerRefundMode is only available after the CALCULATING timeout has elapsed.',
            };
        }
        return { ok: true };
    }

    if (action === 'claimRefund') {
        if (st !== 4) {
            return {
                ok: false,
                message:
                    st === undefined
                        ? 'Lottery state could not be read. Use Refresh Account State or reload instances, then try again.'
                        : 'claimRefund is only available while lottery status is REFUNDING.',
            };
        }
        return { ok: true };
    }

    const winnerAddr = summary?.winner;
    const isAaWinner =
        Boolean(aaAccountAddress && winnerAddr) && aaAccountAddress.toLowerCase() === winnerAddr!.toLowerCase();
    if (st !== 3 || summary?.isPrizeWithdrawn || !isAaWinner) {
        return {
            ok: false,
            message:
                'withdrawPrize is only available when status is CLOSED, the prize was not withdrawn yet, and your AA account is the recorded winner.',
        };
    }
    return { ok: true };
}

export function encodePaymasterAndData(
    paymasterAddress: `0x${string}`,
    paymasterVerificationGasLimit: bigint,
    paymasterPostOpGasLimit: bigint
): `0x${string}` {
    const addressPart = paymasterAddress.slice(2);
    const verificationGasPart = paymasterVerificationGasLimit.toString(16).padStart(32, '0');
    const postOpGasPart = paymasterPostOpGasLimit.toString(16).padStart(32, '0');
    return `0x${addressPart}${verificationGasPart}${postOpGasPart}` as `0x${string}`;
}
