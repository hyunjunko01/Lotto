'use client';

import { useState } from 'react';
import { shortenAddress } from '@/hooks/shared/lib/shortenAddress';
import styles from './aaHeroContent.module.css';

const MISSING_LABEL = '(missing NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS)';

type Props = {
  address?: string;
};

export function AAHeroLotteryAddress({ address }: Props) {
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
    return <p className={styles.addressMissing}>Lottery Address: {MISSING_LABEL}</p>;
  }

  return (
    <div className={styles.addressRow}>
      <span className={styles.addressLabel}>Lottery Address:</span>
      <span className={styles.addressValue} title={address}>
        {shortenAddress(address)}
      </span>
      <button type="button" onClick={() => void handleCopyAddress()} className={styles.copyButton}>
        {copyFeedback || 'COPY'}
      </button>
    </div>
  );
}
