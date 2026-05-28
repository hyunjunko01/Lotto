'use client';

import { useState } from 'react';
import { shortenAddress } from '@/hooks/shared/lib/shortenAddress';
import styles from './aaHeroContent.module.css';

const DEFAULT_LABEL = 'Lottery Address';
const DEFAULT_MISSING_LABEL = '(missing NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS)';

type Props = {
  address?: string;
  label?: string;
  missingLabel?: string;
};

export function AAHeroLotteryAddress({
  address,
  label = DEFAULT_LABEL,
  missingLabel = DEFAULT_MISSING_LABEL,
}: Props) {
  const [copyFeedback, setCopyFeedback] = useState('');

  const handleCopyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopyFeedback('COPIED');
      setTimeout(() => setCopyFeedback(''), 1200);
    } catch {
      setCopyFeedback('FAILED');
      setTimeout(() => setCopyFeedback(''), 1200);
    }
  };

  if (!address) {
    return (
      <p className={styles.addressMissing}>
        {label}: {missingLabel}
      </p>
    );
  }

  return (
    <div className={styles.addressRow}>
      <span className={styles.addressLabel}>{label}:</span>
      <span className={styles.addressValue} title={address}>
        {shortenAddress(address)}
      </span>
      <button type="button" onClick={() => void handleCopyAddress()} className={styles.copyButton}>
        {copyFeedback || 'COPY'}
      </button>
    </div>
  );
}
