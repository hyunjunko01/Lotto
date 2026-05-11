'use client';

import { useMemo } from 'react';
import { createAAUi, type AAUi } from '@/styles/aa/uiStyles';

export function useAAUi(): AAUi {
  return useMemo(() => createAAUi(), []);
}
