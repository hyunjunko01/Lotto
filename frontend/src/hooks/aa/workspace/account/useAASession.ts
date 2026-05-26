'use client';

import { useCallback, useEffect, useState } from 'react';
import type { IProvider } from '@web3auth/base';
import { AA_SESSION_STORAGE_KEY } from '@/lib/aa/constants';
import { getWeb3Auth } from '@/lib/web3auth';

export function useAASession() {
    const [sessionToken, setSessionToken] = useState('');
    const [web3Provider, setWeb3Provider] = useState<IProvider | null>(null);
    const [email, setEmail] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem(AA_SESSION_STORAGE_KEY);
        if (stored) {
            setSessionToken(stored);
            void getWeb3Auth()
                .then((web3auth) => {
                    if (web3auth.provider) {
                        setWeb3Provider(web3auth.provider);
                    }
                })
                .catch(() => {});
        }
    }, []);

    const persistSession = useCallback((token: string) => {
        setSessionToken(token);
        localStorage.setItem(AA_SESSION_STORAGE_KEY, token);
    }, []);

    const clearSession = useCallback(() => {
        localStorage.removeItem(AA_SESSION_STORAGE_KEY);
        void getWeb3Auth()
            .then((web3auth) => web3auth.logout())
            .catch(() => {});
        setSessionToken('');
        setWeb3Provider(null);
        setEmail('');
    }, []);

    return {
        sessionToken,
        setSessionToken,
        web3Provider,
        setWeb3Provider,
        email,
        setEmail,
        persistSession,
        clearSession,
    };
}
