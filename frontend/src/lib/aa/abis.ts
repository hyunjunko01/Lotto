export const ETH_ACCOUNT_EXECUTE_ABI = [
    {
        type: 'function',
        name: 'execute',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'dest', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'functionData', type: 'bytes' },
        ],
        outputs: [],
    },
] as const;

export const LOTTO_CREATE_ABI = [
    {
        type: 'function',
        name: 'createLotto',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_entryFee', type: 'uint256' },
            { name: '_maxPlayers', type: 'uint256' },
            { name: '_entryToken', type: 'address' },
        ],
        outputs: [{ name: '', type: 'address' }],
    },
] as const;

export const LOTTO_JOIN_ABI = [
    {
        type: 'function',
        name: 'joinLotto',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
] as const;

export const LOTTO_REQUEST_WINNER_ABI = [
    {
        type: 'function',
        name: 'requestWinner',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
] as const;

export const LOTTO_WITHDRAW_PRIZE_ABI = [
    {
        type: 'function',
        name: 'withdrawPrize',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
] as const;

export const LOTTO_TRIGGER_REFUND_MODE_ABI = [
    {
        type: 'function',
        name: 'triggerRefundMode',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
] as const;

export const LOTTO_CLAIM_REFUND_ABI = [
    {
        type: 'function',
        name: 'claimRefund',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
] as const;

export const ENTRY_TOKEN_FAUCET_ABI = [
    {
        type: 'function',
        name: 'claimTestTokens',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
] as const;

export const LOTTO_FACTORY_VIEW_ABI = [
    {
        type: 'function',
        name: 'getAllLottos',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address[]' }],
    },
] as const;

export const LOTTO_INSTANCE_VIEW_ABI = [
    {
        type: 'function',
        name: 'getPlayerCount',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'maxPlayers',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'entryFee',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'entryToken',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        type: 'function',
        name: 'lottoState',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
    },
    {
        type: 'function',
        name: 'winner',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        type: 'function',
        name: 'isPrizeWithdrawn',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        type: 'function',
        name: 'randomnessRequestedAt',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'CALCULATING_TIMEOUT',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

export const ERC20_APPROVE_ABI = [
    {
        type: 'function',
        name: 'approve',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
] as const;

export const ERC20_BALANCE_OF_ABI = [
    {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

export const ERC20_ALLOWANCE_ABI = [
    {
        type: 'function',
        name: 'allowance',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;
