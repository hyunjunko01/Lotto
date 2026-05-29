export type MetamaskStatusTone = 'progress' | 'error';

export function getMetamaskStatusTone(message: string, forceError = false): MetamaskStatusTone {
    if (forceError) {
        return 'error';
    }

    const normalized = message.trim();
    if (!normalized) {
        return 'progress';
    }

    if (/^error:/i.test(normalized) || /failed|missing|invalid|not enough|please switch/i.test(normalized)) {
        return 'error';
    }

    return 'progress';
}

export function getMetamaskStatusStyle(tone: MetamaskStatusTone) {
    if (tone === 'error') {
        return {
            color: '#ff8f9f',
            textShadow: '0 0 6px rgba(255, 143, 159, 0.58), 0 0 12px rgba(255, 143, 159, 0.3)',
        };
    }

    return {
        color: '#ffd49a',
        textShadow:
            '0 0 8px rgba(255, 177, 85, 0.72), 0 0 16px rgba(255, 140, 50, 0.48), 0 0 24px rgba(200, 100, 30, 0.28)',
    };
}
