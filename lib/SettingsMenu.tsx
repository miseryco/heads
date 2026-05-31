'use client';
import * as React from 'react';
import { useMaybeLayoutContext } from '@livekit/components-react';
import styles from '../styles/SettingsMenu.module.css';
import { AudioSettings } from './AudioSettings';
import { CameraSettings } from './CameraSettings';

/**
 * @alpha
 */
export interface SettingsMenuProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * @alpha
 */
export function SettingsMenu(props: SettingsMenuProps) {
  const layoutContext = useMaybeLayoutContext();

  return (
    <div className={styles.settingsMenu} {...props}>
      <header className={styles.header}>
        <h2 className={styles.title}>Settings</h2>
      </header>

      <div className={styles.body}>
        <section className={styles.section}>
          <h3 className={styles.heading}>Audio</h3>
          <AudioSettings />
        </section>

        <section className={styles.section}>
          <h3 className={styles.heading}>Video</h3>
          <CameraSettings />
        </section>
      </div>

      <footer className={styles.footer}>
        <button
          className="lk-button edge-settings-close"
          onClick={() => layoutContext?.widget.dispatch?.({ msg: 'toggle_settings' })}
        >
          Close
        </button>
      </footer>
    </div>
  );
}
