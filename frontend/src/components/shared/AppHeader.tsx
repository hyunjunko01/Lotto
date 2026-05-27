'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createWalletClient, custom, isAddress } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAASession } from '@/hooks/aa/workspace/account/useAASession';
import { connectWeb3Auth } from '@/lib/web3auth';
import { targetChain } from '@/lib/targetNetwork';

export function AppHeader() {
    const pathname = usePathname();
    const isRootRoute = pathname === '/';

    const isAaRoute = pathname.startsWith('/aa');
    const isMetamaskRoute = pathname.startsWith('/metamask');
    const aaSession = useAASession();
    const [isAAAuthLoading, setIsAAAuthLoading] = useState(false);

    const aaConnectedAddress = useMemo(() => {
        if (!isAddress(aaSession.sessionToken)) {
            return '';
        }
        return aaSession.sessionToken;
    }, [aaSession.sessionToken]);
    const hasAAProvider = Boolean(aaSession.web3Provider);
    const isAAConnected = Boolean(aaConnectedAddress) && hasAAProvider;

    const linkStyle = {
        color: '#cfe9ee',
        textDecoration: 'none',
        fontWeight: 700,
        letterSpacing: 0.2,
    } as const;

    const aaButtonStyle = {
        padding: '8px 12px',
        borderRadius: 10,
        border: '1px solid #5d7980',
        background: '#13242a',
        color: '#d9eef1',
        cursor: isAAAuthLoading ? 'not-allowed' : 'pointer',
        opacity: isAAAuthLoading ? 0.6 : 1,
        fontWeight: 700,
    } as const;

    const handleAALogin = async () => {
        try {
            setIsAAAuthLoading(true);
            const provider = await connectWeb3Auth();
            aaSession.setWeb3Provider(provider);
            const walletClient = createWalletClient({
                chain: targetChain,
                transport: custom(provider),
            });
            const addresses = await walletClient.getAddresses();
            const connectedAddress = addresses[0];
            if (!connectedAddress || !isAddress(connectedAddress)) {
                throw new Error('Failed to read wallet address from Web3Auth.');
            }
            aaSession.persistSession(connectedAddress);
            aaSession.setEmail('');
        } catch (error) {
            console.error('Web3Auth login failed from header:', error);
        } finally {
            setIsAAAuthLoading(false);
        }
    };

    const handleAALogout = () => {
        if (isAAAuthLoading) return;
        aaSession.clearSession();
    };

    if (isRootRoute) {
        return null;
    }

    return (
        <header
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 20,
                backdropFilter: 'blur(6px)',
                background: 'rgba(6, 19, 25, 0.88)',
                borderBottom: '1px solid #2c4a52',
            }}
        >
            <div
                style={{
                    maxWidth: 920,
                    margin: '0 auto',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                }}
            >
                {isAaRoute ? (
                    <>
                        <nav style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <Link href="/" style={linkStyle}>
                                Home
                            </Link>
                            <Link href="/aa" style={linkStyle}>
                                Web3Auth AA
                            </Link>
                            <Link href="/aa/create-lottery" style={linkStyle}>
                                Create
                            </Link>
                            <Link href="/aa/join-lottery" style={linkStyle}>
                                Join
                            </Link>
                        </nav>
                        {isAAConnected ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: '#b8cdcf', fontSize: '0.9rem' }}>
                                    {aaConnectedAddress.slice(0, 6)}...{aaConnectedAddress.slice(-4)}
                                </span>
                                <button type="button" onClick={handleAALogout} disabled={isAAAuthLoading} style={aaButtonStyle}>
                                    Log out
                                </button>
                            </div>
                        ) : (
                            <button type="button" onClick={() => void handleAALogin()} disabled={isAAAuthLoading} style={aaButtonStyle}>
                                {isAAAuthLoading
                                    ? 'Connecting...'
                                    : aaConnectedAddress
                                        ? 'Reconnect Web3Auth'
                                        : 'Log in with Web3Auth'}
                            </button>
                        )}
                    </>
                ) : isMetamaskRoute ? (
                    <>
                        <nav style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <Link href="/" style={linkStyle}>
                                Home
                            </Link>
                            <Link href="/metamask" style={linkStyle}>
                                MetaMask Home
                            </Link>
                            <Link href="/metamask/create-lottery" style={linkStyle}>
                                Create
                            </Link>
                            <Link href="/metamask/join-lottery" style={linkStyle}>
                                Join
                            </Link>
                        </nav>
                        <ConnectButton />
                    </>
                ) : (
                    <nav style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Link href="/" style={linkStyle}>
                            Home
                        </Link>
                        <Link href="/aa" style={linkStyle}>
                            Web3Auth AA
                        </Link>
                        <Link href="/metamask" style={linkStyle}>
                            MetaMask
                        </Link>
                    </nav>
                )}
            </div>
        </header>
    );
}