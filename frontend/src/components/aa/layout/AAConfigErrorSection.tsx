'use client';

import { AASection } from '@/components/aa/layout/AASection';
import type { AAUi } from '@/styles/aa/uiStyles';

type Props = {
    ui: AAUi;
    message: string;
};

export function AAConfigErrorSection({ ui, message }: Props) {
    return (
        <AASection ui={ui} style={ui.errorBox}>
            {message}
        </AASection>
    );
}
