'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { encodePassphrase, generateRoomId } from '@/lib/client-utils';
import { warmUpFaceDeformer } from '@/lib/ShaderPadFaceDeformer';
import { Wordmark } from '@/lib/Wordmark';
import styles from '../styles/Home.module.css';

function roomPath(roomName: string, password: string) {
	const path = `/rooms/${encodeURIComponent(roomName)}`;
	return password ? `${path}#${encodePassphrase(password)}` : path;
}

function resolveJoinTarget(raw: string): string | null {
	const value = raw.trim();
	if (!value) {
		return null;
	}
	if (value.includes('/rooms/') || /^https?:\/\//.test(value)) {
		try {
			const url = new URL(value, window.location.origin);
			if (url.pathname.includes('/rooms/')) {
				return `${url.pathname}${url.hash}`;
			}
		} catch {}
	}
	const code = value
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return code ? `/rooms/${code}` : null;
}

export default function Page() {
	const router = useRouter();
	const [code, setCode] = React.useState('');
	const [showDialog, setShowDialog] = React.useState(false);

	React.useEffect(() => {
		warmUpFaceDeformer();
	}, []);

	const onJoin = (event: React.FormEvent) => {
		event.preventDefault();
		const target = resolveJoinTarget(code);
		if (target) {
			router.push(target);
		}
	};

	return (
		<>
			<Wordmark />

			<main className={styles.main}>
				<div className={styles.hero}>
					<h1 className={styles.title}>Face-First Video Conferencing</h1>
					<p className={styles.subtitle}>
						Heads uses advanced facial utilization technology to bring people closer. Our calls guarantee
						more face per face.
					</p>
					<div className={styles.actions}>
						<button type="button" className={styles.newMeeting} onClick={() => setShowDialog(true)}>
							<VideoPlusIcon />
							New meeting
						</button>

						<form className={styles.joinForm} onSubmit={onJoin}>
							<input
								className={styles.codeInput}
								value={code}
								onChange={event => setCode(event.target.value)}
								placeholder="Enter a code or link"
								aria-label="Meeting code or link"
								autoComplete="off"
							/>
							<button type="submit" className={styles.joinButton} disabled={!code.trim()}>
								Join
							</button>
						</form>
					</div>
				</div>
			</main>

			{showDialog && (
				<NewMeetingDialog
					onClose={() => setShowDialog(false)}
					onCreate={(roomName, password) => router.push(roomPath(roomName, password))}
				/>
			)}
		</>
	);
}

function NewMeetingDialog(props: { onClose: () => void; onCreate: (roomName: string, password: string) => void }) {
	const [roomName, setRoomName] = React.useState(() => generateRoomId());
	const [password, setPassword] = React.useState('');

	React.useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				props.onClose();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [props]);

	const onSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		const trimmed = roomName.trim();
		if (trimmed) {
			props.onCreate(trimmed, password.trim());
		}
	};

	return (
		<div
			className={styles.backdrop}
			role="presentation"
			onMouseDown={event => {
				if (event.target === event.currentTarget) {
					props.onClose();
				}
			}}
		>
			<form
				className={styles.dialog}
				role="dialog"
				aria-modal="true"
				aria-labelledby="new-meeting-title"
				onSubmit={onSubmit}
			>
				<h2 id="new-meeting-title" className={styles.dialogTitle}>
					New meeting
				</h2>

				<label className={styles.field}>
					<span className={styles.fieldLabel}>Meeting code</span>
					<input
						className={styles.input}
						value={roomName}
						onChange={event => setRoomName(event.target.value)}
						autoFocus
						autoComplete="off"
					/>
				</label>

				<label className={styles.field}>
					<span className={styles.fieldLabel}>
						Password <span className={styles.optional}>(optional)</span>
					</span>
					<input
						className={styles.input}
						type="password"
						value={password}
						onChange={event => setPassword(event.target.value)}
						placeholder="End-to-end encrypt this meeting"
						autoComplete="new-password"
					/>
				</label>

				<div className={styles.dialogActions}>
					<button type="button" className={styles.cancelButton} onClick={props.onClose}>
						Cancel
					</button>
					<button type="submit" className={styles.createButton} disabled={!roomName.trim()}>
						Start meeting
					</button>
				</div>
			</form>
		</div>
	);
}

function VideoPlusIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				d="M3 7.5A1.5 1.5 0 0 1 4.5 6h9A1.5 1.5 0 0 1 15 7.5v9A1.5 1.5 0 0 1 13.5 18h-9A1.5 1.5 0 0 1 3 16.5v-9Z"
				stroke="currentColor"
				strokeWidth="1.6"
			/>
			<path
				d="m15 10 4.2-2.8a.6.6 0 0 1 .93.5v8.6a.6.6 0 0 1-.93.5L15 14.5"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinejoin="round"
			/>
			<path d="M9 9.5v5M6.5 12h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
		</svg>
	);
}
