import styles from './LottoWordmark.module.css';

type LottoWordmarkProps = {
  showSubline?: boolean;
  className?: string;
};

export function LottoWordmark({ showSubline = true, className }: LottoWordmarkProps) {
  return (
    <div className={className}>
      <h1 className={styles.wordmark}>Lotto</h1>
      {showSubline ? <p className={styles.subline}>on-chain lottery</p> : null}
    </div>
  );
}
