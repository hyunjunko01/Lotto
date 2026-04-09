'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string;
                        callback: (response: { credential?: string }) => void;
                    }) => void;
                    renderButton: (
                        parent: HTMLElement,
                        options?: {
                            theme?: 'outline' | 'filled_blue' | 'filled_black';
                            size?: 'small' | 'medium' | 'large';
                            width?: number;
                            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
                            shape?: 'rectangular' | 'pill' | 'circle' | 'square';
                        }
                    ) => void;
                };
            };
        };
    }
}

type AccountResponse = {
    ok: boolean;
    account?: {
        ownerAddress: string;
        accountAddress: string;
        salt: string;
    };
    error?: string;
};

const SESSION_STORAGE_KEY = 'aaSessionToken';

export function GoogleAaPanel() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const buttonRef = useRef<HTMLDivElement | null>(null);

    const [sessionToken, setSessionToken] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [ownerAddress, setOwnerAddress] = useState<string>('');
    const [accountAddress, setAccountAddress] = useState<string>('');
    const [salt, setSalt] = useState<string>('');
    const [status, setStatus] = useState<string>('Google 로그인 후 AA 계정을 생성/조회할 수 있습니다.');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
            setSessionToken(stored);
            setStatus('기존 세션이 있습니다. 계정 조회 버튼으로 상태를 확인하세요.');
        }
    }, []);

    const fetchAaAccount = useCallback(
        async (token: string, createIfMissing = false) => {
            const query = createIfMissing ? '?createIfMissing=true' : '';
            const response = await fetch(`/api/aa/account${query}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const json = (await response.json()) as AccountResponse;
            if (!response.ok || !json.ok || !json.account) {
                throw new Error(json.error ?? 'AA account request failed.');
            }

            setOwnerAddress(json.account.ownerAddress);
            setAccountAddress(json.account.accountAddress);
            setSalt(json.account.salt);
        },
        []
    );

    const onGoogleCredential = useCallback(
        async (credential?: string) => {
            if (!credential) {
                setStatus('Google credential을 받지 못했습니다.');
                return;
            }

            try {
                setIsLoading(true);
                setStatus('Google 인증을 처리하는 중입니다...');

                const authResponse = await fetch('/api/auth/google', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ idToken: credential }),
                });

                const authJson = (await authResponse.json()) as {
                    ok?: boolean;
                    sessionToken?: string;
                    user?: { email?: string };
                    error?: string;
                };

                if (!authResponse.ok || !authJson.ok || !authJson.sessionToken) {
                    throw new Error(authJson.error ?? 'Google auth API failed.');
                }

                setSessionToken(authJson.sessionToken);
                localStorage.setItem(SESSION_STORAGE_KEY, authJson.sessionToken);
                setEmail(authJson.user?.email ?? '');

                setStatus('AA 계정을 생성/조회하는 중입니다...');
                await fetchAaAccount(authJson.sessionToken, true);
                setStatus('Google 로그인 및 AA 계정 연결이 완료되었습니다.');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Google AA login failed.';
                setStatus(`오류: ${message}`);
            } finally {
                setIsLoading(false);
            }
        },
        [fetchAaAccount]
    );

    useEffect(() => {
        if (!clientId || !buttonRef.current) {
            return;
        }

        const existingScript = document.querySelector('script[data-google-identity]');
        const setup = () => {
            if (!window.google || !buttonRef.current) return;
            buttonRef.current.innerHTML = '';
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: (response) => {
                    void onGoogleCredential(response.credential);
                },
            });
            window.google.accounts.id.renderButton(buttonRef.current, {
                theme: 'outline',
                size: 'large',
                width: 280,
                text: 'continue_with',
                shape: 'pill',
            });
        };

        if (window.google) {
            setup();
            return;
        }

        if (!existingScript) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.dataset.googleIdentity = 'true';
            script.onload = setup;
            document.head.appendChild(script);
            return;
        }

        (existingScript as HTMLScriptElement).addEventListener('load', setup);
        return () => {
            (existingScript as HTMLScriptElement).removeEventListener('load', setup);
        };
    }, [clientId, onGoogleCredential]);

    const isReady = useMemo(() => Boolean(clientId), [clientId]);

    const handleRefresh = async () => {
        if (!sessionToken) {
            setStatus('먼저 Google 로그인을 진행하세요.');
            return;
        }

        try {
            setIsLoading(true);
            setStatus('AA 계정 상태를 갱신하는 중입니다...');
            await fetchAaAccount(sessionToken, false);
            setStatus('AA 계정 상태를 갱신했습니다.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to refresh account.';
            setStatus(`오류: ${message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setSessionToken('');
        setEmail('');
        setOwnerAddress('');
        setAccountAddress('');
        setSalt('');
        setStatus('Google AA 세션을 초기화했습니다.');
    };

    return (
        <section
            style={{
                marginTop: 16,
                padding: 20,
                border: '1px solid #2d3f45',
                borderRadius: 14,
                background: 'rgba(7, 19, 24, 0.72)',
            }}
        >
            <h2 style={{ margin: '0 0 10px' }}>Google + AA 연결</h2>
            <p style={{ marginTop: 0, color: '#c6dfe2', lineHeight: 1.5 }}>
                Google 로그인 후 서버 API를 통해 세션을 받고, 사용자용 AA 계정을 조회/생성합니다.
            </p>

            {!isReady ? (
                <p style={{ color: '#ffd3cb' }}>
                    NEXT_PUBLIC_GOOGLE_CLIENT_ID 환경변수가 없습니다.
                </p>
            ) : (
                <div ref={buttonRef} style={{ minHeight: 44 }} />
            )}

            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    style={{
                        padding: '9px 12px',
                        borderRadius: 10,
                        border: '1px solid #5d7980',
                        background: '#13242a',
                        color: '#d9eef1',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                    }}
                >
                    계정 상태 갱신
                </button>
                <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    style={{
                        padding: '9px 12px',
                        borderRadius: 10,
                        border: '1px solid #7f4b4b',
                        background: '#2a1313',
                        color: '#ffd9d9',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                    }}
                >
                    세션 초기화
                </button>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gap: 6, color: '#d4eaee' }}>
                <p style={{ margin: 0, wordBreak: 'break-all' }}>status: {status}</p>
                <p style={{ margin: 0, wordBreak: 'break-all' }}>email: {email || '-'}</p>
                <p style={{ margin: 0, wordBreak: 'break-all' }}>
                    session: {sessionToken ? `${sessionToken.slice(0, 24)}...` : '-'}
                </p>
                <p style={{ margin: 0, wordBreak: 'break-all' }}>owner: {ownerAddress || '-'}</p>
                <p style={{ margin: 0, wordBreak: 'break-all' }}>smart account: {accountAddress || '-'}</p>
                <p style={{ margin: 0, wordBreak: 'break-all' }}>salt: {salt || '-'}</p>
            </div>
        </section>
    );
}
