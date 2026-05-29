export type AAStatusTone = 'progress' | 'error';

const ERROR_PREFIX = /^error:/i;
const BLOCKER_PATTERN =
    /please log in|not enough let|approve entry fee first|is required|required before|fix errors above|wait for estimation/i;

const PROGRESS_PATTERN =
    /estimating|loading|processing|preparing|requesting|sending|waiting|refreshing|sign, then send|gas estimate ready|account is ready|connection completed|state refreshed|signature completed|accepted the useroperation|included on-chain|session has been reset/i;

export function getAAStatusTone(status: string): AAStatusTone {
    const normalized = status.trim();
    if (!normalized) {
        return 'progress';
    }

    if (ERROR_PREFIX.test(normalized) || BLOCKER_PATTERN.test(normalized)) {
        return 'error';
    }

    if (PROGRESS_PATTERN.test(normalized)) {
        return 'progress';
    }

    // Default non-error copy (e.g. informational) uses progress neon.
    return 'progress';
}

export function getAAStatusStyle(tone: AAStatusTone) {
    if (tone === 'error') {
        return {
            color: '#ff8f9f',
            textShadow: '0 0 6px rgba(255, 143, 159, 0.58), 0 0 12px rgba(255, 143, 159, 0.3)',
        };
    }

    return {
        color: '#7aa8ff',
        textShadow:
            '0 0 8px rgba(58, 102, 210, 0.72), 0 0 16px rgba(36, 68, 168, 0.48), 0 0 24px rgba(24, 48, 120, 0.28)',
    };
}
