import Link from 'next/link';
import HeadsWordmark from '@/lib/heads.svg';
import styles from '@/styles/Home.module.css';

export function Wordmark() {
  return (
    <header className={styles.topbar}>
      <Link href="/" className={styles.wordmarkLink} aria-label="Heads home">
        <HeadsWordmark className={styles.wordmark} aria-hidden="true" focusable="false" />
      </Link>
    </header>
  );
}
