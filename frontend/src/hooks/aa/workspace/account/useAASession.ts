'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { IProvider } from '@web3auth/base';
import { AA_SESSION_STORAGE_KEY } from '@/lib/aa/constants';
import { getWeb3Auth } from '@/lib/web3auth';

type AASessionState = {
    sessionToken: string;
    web3Provider: IProvider | null;
    email: string;
};

let sessionState: AASessionState = {
    sessionToken: '',
    web3Provider: null,
    email: '',
};

const listeners = new Set<() => void>();
let initialized = false;

function emit() {
    listeners.forEach((listener) => listener());
}

function setSessionState(next: Partial<AASessionState>) {
    sessionState = { ...sessionState, ...next };
    emit();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot() {
    return sessionState;
}

function initializeSession() {
    if (initialized || typeof window === 'undefined') {
        return;
    }
    initialized = true;
    const stored = localStorage.getItem(AA_SESSION_STORAGE_KEY);
    if (!stored) {
        return;
    }
    setSessionState({ sessionToken: stored });
    void getWeb3Auth()
        .then((web3auth) => {
            if (web3auth.provider) {
                setSessionState({ web3Provider: web3auth.provider });
            }
        })
        .catch(() => {});
}

export function useAASession() {
    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    useEffect(() => {
        initializeSession();
    }, []);

    const persistSession = useCallback((token: string) => {
        setSessionState({ sessionToken: token });
        localStorage.setItem(AA_SESSION_STORAGE_KEY, token);
    }, []);

    const setSessionToken = useCallback((token: string) => {
        setSessionState({ sessionToken: token });
    }, []);

    const setWeb3Provider = useCallback((provider: IProvider | null) => {
        setSessionState({ web3Provider: provider });
    }, []);

    const setEmail = useCallback((nextEmail: string) => {
        setSessionState({ email: nextEmail });
    }, []);

    const clearSession = useCallback(() => {
        localStorage.removeItem(AA_SESSION_STORAGE_KEY);
        void getWeb3Auth()
            .then((web3auth) => web3auth.logout())
            .catch(() => {});
        setSessionState({
            sessionToken: '',
            web3Provider: null,
            email: '',
        });
    }, []);

    return {
        sessionToken: state.sessionToken,
        setSessionToken,
        web3Provider: state.web3Provider,
        setWeb3Provider,
        email: state.email,
        setEmail,
        persistSession,
        clearSession,
    };
}
