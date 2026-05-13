import type { UserOpFields } from '@/components/aa/types';

export const SESSION_STORAGE_KEY = 'aaSessionToken';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const EMPTY_USER_OP: UserOpFields = {
    sender: '',
    nonce: '0',
    initCode: '0x',
    callData: '0x',
    accountGasLimits: '0x0000000000000000000000000000000000000000000000000000000000000000',
    preVerificationGas: '0',
    gasFees: '0x0000000000000000000000000000000000000000000000000000000000000000',
    paymasterAndData: '0x',
    signature: '0x',
};
