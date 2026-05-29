'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createWalletClient, custom, formatEther, isAddress } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import {
    refreshAAHeaderStatus,
    resetAAHeaderStatus,
    useAAHeaderStatus,
} from '@/hooks/aa/workspace/account/aaHeaderStatus';
import {
    refreshMetamaskHeaderLetBalance,
    refreshMetamaskHeaderStatus,
    resetMetamaskHeaderStatus,
    useMetamaskHeaderStatus,
} from '@/hooks/metamask/header/metamaskHeaderStatus';
import { useAASession } from '@/hooks/aa/workspace/account/useAASession';
import { connectWeb3Auth } from '@/lib/web3auth';
import { targetChain } from '@/lib/targetNetwork';
import styles from './AppHeader.module.css';

export function AppHeader() {
    const pathname = usePathname();
    const isRootRoute = pathname === '/';

    const isAaRoute = pathname.startsWith('/aa');
    const isMetamaskRoute = pathname.startsWith('/metamask');
    const aaSession = useAASession();
    const aaHeader = useAAHeaderStatus();
    const metamaskHeader = useMetamaskHeaderStatus();
    const { address: metamaskAddress, isConnected: isMetamaskConnected } = useAccount();
    const [isAAAuthLoading, setIsAAAuthLoading] = useState(false);

    const ownerAddress = useMemo(() => {
        if (!isAddress(aaSession.sessionToken)) {
            return '';
        }
        return aaSession.sessionToken;
    }, [aaSession.sessionToken]);
    const hasAAProvider = Boolean(aaSession.web3Provider);
    const isAAConnected = Boolean(ownerAddress) && hasAAProvider;

    useEffect(() => {
        if (!isAaRoute || !isAAConnected || !ownerAddress) {
            resetAAHeaderStatus();
            return;
        }

        void refreshAAHeaderStatus(ownerAddress);
    }, [isAaRoute, isAAConnected, ownerAddress]);

    useEffect(() => {
        if (!isMetamaskRoute) {
            resetMetamaskHeaderStatus();
            return;
        }
        if (!isMetamaskConnected || !metamaskAddress) {
            resetMetamaskHeaderStatus();
            return;
        }

        void refreshMetamaskHeaderStatus(metamaskAddress);
    }, [isMetamaskRoute, isMetamaskConnected, metamaskAddress]);

    const aaLetBalanceLabel =
        aaHeader.letBalance !== null ? `${formatEther(aaHeader.letBalance)} LET` : aaHeader.isRefreshing ? '...' : '-';

    const metamaskLetBalanceLabel =
        metamaskHeader.letBalance !== null
            ? `${formatEther(metamaskHeader.letBalance)} LET`
            : metamaskHeader.isRefreshing
              ? '...'
              : '-';

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

    const handleMetamaskRefresh = () => {
        if (metamaskHeader.isRefreshing) {
            return;
        }
        void refreshMetamaskHeaderLetBalance();
    };

    if (isRootRoute) {
        return null;
    }

    const modeLabel = isAaRoute ? 'AA Mode' : isMetamaskRoute ? 'MetaMask Mode' : '';
    const toneClass = isAaRoute ? styles.toneAa : isMetamaskRoute ? styles.toneMetamask : '';

    const headerContent = isAaRoute ? (
        isAAConnected ? (
            <div className={styles.controls}>
                <div className={styles.card}>
                    <p className={styles.label}>AA Account</p>
                    <p className={styles.value}>
                        {aaHeader.accountAddress
                            ? `${aaHeader.accountAddress.slice(0, 6)}...${aaHeader.accountAddress.slice(-4)}`
                            : aaHeader.isRefreshing
                              ? 'Loading...'
                              : '-'}
                    </p>
                </div>
                <div className={styles.card}>
                    <p className={styles.label}>Balance</p>
                    <p className={styles.value}>{aaLetBalanceLabel}</p>
                </div>
                <button
                    type="button"
                    onClick={handleAARefresh}
                    disabled={isAAAuthLoading || aaHeader.isRefreshing}
                    className={styles.actionButton}
                >
                    {aaHeader.isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button type="button" onClick={handleAALogout} disabled={isAAAuthLoading} className={styles.actionButton}>
                    Log out
                </button>
            </div>
        ) : (
            <button type="button" onClick={() => void handleAALogin()} disabled={isAAAuthLoading} className={styles.actionButton}>
                {isAAAuthLoading ? 'Connecting...' : ownerAddress ? 'Reconnect Web3Auth' : 'Log in with Web3Auth'}
            </button>
        )
    ) : isMetamaskRoute ? (
        <ConnectButton.Custom>
            {({ account, chain, mounted, authenticationStatus, openConnectModal, openChainModal, openAccountModal }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected =
                    ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');

                if (!ready) {
                    return (
                        <div className={styles.controls}>
                            <button type="button" className={styles.metamaskButton} disabled>
                                Loading...
                            </button>
                        </div>
                    );
                }

                if (!connected) {
                    return (
                        <div className={styles.controls}>
                            <button type="button" onClick={openConnectModal} className={styles.metamaskButton}>
                                Connect MetaMask
                            </button>
                        </div>
                    );
                }

                if (chain.unsupported) {
                    return (
                        <div className={styles.controls}>
                            <button
                                type="button"
                                onClick={openChainModal}
                                className={`${styles.metamaskButton} ${styles.metamaskWarn}`}
                            >
                                Wrong Network
                            </button>
                        </div>
                    );
                }

                return (
                    <div className={styles.controls}>
                        <div className={styles.card}>
                            <p className={styles.label}>Balance</p>
                            <p className={styles.value}>{metamaskLetBalanceLabel}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleMetamaskRefresh}
                            disabled={metamaskHeader.isRefreshing}
                            className={styles.actionButton}
                        >
                            {metamaskHeader.isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                        <button type="button" onClick={openAccountModal} className={styles.metamaskButton}>
                            {account.displayName}
                        </button>
                    </div>
                );
            }}
        </ConnectButton.Custom>
    ) : null;

    if (!headerContent) {
        return null;
    }

    return (
        <header className={`${styles.header} ${toneClass}`}>
            <div className={styles.inner}>
                <div className={styles.brand}>
                    <Link href="/" className={styles.brandLink}>
                        Lotto
                    </Link>
                    <span className={styles.modeTag}>{modeLabel}</span>
                </div>
                {headerContent}
            </div>
            {isAaRoute && aaHeader.error ? <p className={styles.error}>{aaHeader.error}</p> : null}
            {isMetamaskRoute && metamaskHeader.error ? <p className={styles.error}>{metamaskHeader.error}</p> : null}
        </header>
    );
}
