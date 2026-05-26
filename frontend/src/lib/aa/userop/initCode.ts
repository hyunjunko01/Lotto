import { encodeFunctionData } from 'viem';
import accountFactoryAbi from '@/contracts/AccountFactory.json';

export function computeInitCode(params: {
    accountDeployed: boolean;
    ownerAddress: string;
    salt: string;
    accountFactoryAddress: string;
}): `0x${string}` {
    const { accountDeployed, ownerAddress, salt, accountFactoryAddress } = params;

    if (accountDeployed || !ownerAddress || !salt) {
        return '0x';
    }

    const createAccountData = encodeFunctionData({
        abi: accountFactoryAbi,
        functionName: 'createAccount',
        args: [ownerAddress as `0x${string}`, BigInt(salt)],
    });

    return `${accountFactoryAddress}${createAccountData.slice(2)}` as `0x${string}`;
}
