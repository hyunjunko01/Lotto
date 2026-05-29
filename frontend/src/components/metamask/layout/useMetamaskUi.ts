'use client';

import { useMemo } from 'react';
import { createMetamaskUi, type MetamaskUi } from '@/styles/metamask/uiStyles';

export function useMetamaskUi(): MetamaskUi {
    return useMemo(() => createMetamaskUi(), []);
}
