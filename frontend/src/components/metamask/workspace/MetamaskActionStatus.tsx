'use client';

import { getMetamaskStatusStyle, getMetamaskStatusTone } from '@/lib/metamask/statusTone';

type Props = {
    status: string;
    forceError?: boolean;
};

export function MetamaskActionStatus({ status, forceError = false }: Props) {
    const tone = getMetamaskStatusTone(status, forceError);
    const statusStyle = getMetamaskStatusStyle(tone);

    return (
        <p
            style={{
                margin: '12px 0 0',
                wordBreak: 'break-word',
                fontSize: '1.02rem',
                lineHeight: 1.45,
                color: statusStyle.color,
                textShadow: statusStyle.textShadow,
            }}
        >
            <strong>status:</strong> {status}
        </p>
    );
}
