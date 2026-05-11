import { CHAIN_NAMESPACES, type IProvider } from '@web3auth/base';
import { Web3Auth } from '@web3auth/modal';

let web3AuthInstance: Web3Auth | null = null;

export async function getWeb3Auth(): Promise<Web3Auth> {
    const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;
    if (!clientId) {
        throw new Error('NEXT_PUBLIC_WEB3AUTH_CLIENT_ID is required.');
    }

    if (!web3AuthInstance) {
        web3AuthInstance = new Web3Auth({
            clientId,
            web3AuthNetwork: 'sapphire_devnet',
            chainConfig: {
                chainNamespace: CHAIN_NAMESPACES.EIP155,
                chainId: '0x7a69',
                rpcTarget: process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545',
                displayName: 'Anvil Local',
                tickerName: 'ETH',
                ticker: 'ETH',
            },
        });
        await web3AuthInstance.init();
    }

    return web3AuthInstance;
}

export async function connectWeb3Auth(): Promise<IProvider> {
    const web3auth = await getWeb3Auth();
    const provider = await web3auth.connect();
    if (!provider) {
        throw new Error('Web3Auth connection failed.');
    }
    return provider;
}
