'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createWalletClient, custom, formatEther, isAddress } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
    refreshAAHeaderStatus,
    resetAAHeaderStatus,
    useAAHeaderStatus,
} from '@/hooks/aa/workspace/account/aaHeaderStatus';
import { useAASession } from '@/hooks/aa/workspace/account/useAASession';
import { connectWeb3Auth } from '@/lib/web3auth';
import { targetChain } from '@/lib/targetNetwork';

export function AppHeader() {
    const pathname = usePathname();
    const isRootRoute = pathname === '/';

    const isAaRoute = pathname.startsWith('/aa');
    const isMetamaskRoute = pathname.startsWith('/metamask');
    const aaSession = useAASession();
    const aaHeader = useAAHeaderStatus();
    const [isAAAuthLoading, setIsAAAuthLoading] = useState(false);

    const ownerAddress = useMemo(() => {
        if (!isAddress(aaSession.sessionToken)) {
            return '';
        }
        return aaSession.sessionToken;
    }, [aaSession.sessionToken]);
    const hasAAProvider = Boolean(aaSession.web3Provider);
    const isAAConnected = Boolean(ownerAddress) && hasAAProvider;

    const aaButtonStyle = {
        padding: '8px 12px',
        borderRadius: 10,
        border: '1px solid #5d7980',
        background: '#13242a',
        color: '#d9eef1',
        cursor: isAAAuthLoading || aaHeader.isRefreshing ? 'not-allowed' : 'pointer',
        opacity: isAAAuthLoading || aaHeader.isRefreshing ? 0.6 : 1,
        fontWeight: 700,
    } as const;

    useEffect(() => {
        if (!isAaRoute || !isAAConnected || !ownerAddress) {
            resetAAHeaderStatus();
            return;
        }

        void refreshAAHeaderStatus(ownerAddress);
    }, [isAaRoute, isAAConnected, ownerAddress]);

    const letBalanceLabel =
        aaHeader.letBalance !== null ? `${formatEther(aaHeader.letBalance)} LET` : aaHeader.isRefreshing ? '...' : '-';

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
            await refreshAAHeaderStatus(connectedAddress);
        } catch (error) {
            console.error('Web3Auth login failed from header:', error);
        } finally {
            setIsAAAuthLoading(false);
        }
    };

    const handleAARefresh = () => {
        if (!ownerAddress || aaHeader.isRefreshing) {
            return;
        }
        void refreshAAHeaderStatus(ownerAddress);
    };

    const handleAALogout = () => {
        if (isAAAuthLoading) return;
        aaSession.clearSession();
        resetAAHeaderStatus();
    };

    if (isRootRoute) {
        return null;
    }

    const headerContent = isAaRoute ? (
        isAAConnected ? (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ color: '#8aa5a9', fontSize: '0.72rem', letterSpacing: 0.3 }}>AA Account</span>
                    <span style={{ color: '#d4eaee', fontSize: '0.9rem' }}>
                        {aaHeader.accountAddress
                            ? `${aaHeader.accountAddress.slice(0, 6)}...${aaHeader.accountAddress.slice(-4)}`
                            : aaHeader.isRefreshing
                              ? 'Loading...'
                              : '-'}
                    </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ color: '#8aa5a9', fontSize: '0.72rem', letterSpacing: 0.3 }}>Balance</span>
                    <span style={{ color: '#b8cdcf', fontSize: '0.9rem' }}>{letBalanceLabel}</span>
                </div>
                <button
                    type="button"
                    onClick={handleAARefresh}
                    disabled={isAAAuthLoading || aaHeader.isRefreshing}
                    style={aaButtonStyle}
                >
                    {aaHeader.isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button type="button" onClick={handleAALogout} disabled={isAAAuthLoading} style={aaButtonStyle}>
                    Log out
                </button>
            </div>
        ) : (
            <button type="button" onClick={() => void handleAALogin()} disabled={isAAAuthLoading} style={aaButtonStyle}>
                {isAAAuthLoading ? 'Connecting...' : ownerAddress ? 'Reconnect Web3Auth' : 'Log in with Web3Auth'}
            </button>
        )
    ) : isMetamaskRoute ? (
        <ConnectButton />
    ) : null;

    if (!headerContent) {
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
                    justifyContent: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                }}
            >
                {headerContent}
            </div>
            {isAaRoute && aaHeader.error ? (
                <p style={{ margin: 0, padding: '0 16px 10px', textAlign: 'center', color: '#f3b2b2', fontSize: '0.82rem' }}>
                    {aaHeader.error}
                </p>
            ) : null}
        </header>
    );
}
