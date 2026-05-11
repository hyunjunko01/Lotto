'use client';

import { useMemo } from 'react';
import type { MetamaskVisualVariant } from '@/styles/metamask/tokens';
import { createMetamaskUi, type MetamaskUi } from '@/styles/metamask/uiStyles';

export function useMetamaskUi(variant: MetamaskVisualVariant): MetamaskUi {
    return useMemo(() => createMetamaskUi(variant), [variant]);
}
