'use client';

import * as React from 'react';
import type { CSSProperties } from 'react';
import {
	useLocalParticipant,
	useParticipantAttributes,
	type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useFaceDeformerReady, useLocalDeformerActive, useLocalFaceDetected } from './ShaderPadFaceDeformer';

export const FACE_DETECTED_ATTRIBUTE = 'faceDetected';
const DETECTED = '1';
const UNDETECTED = '0';

export function LocalFaceAttributePublisher() {
	const { localParticipant } = useLocalParticipant();
	const active = useLocalDeformerActive();
	const detected = useLocalFaceDetected();

	React.useEffect(() => {
		if (!localParticipant) {
			return;
		}
		const value = active && detected ? DETECTED : UNDETECTED;
		if (localParticipant.attributes?.[FACE_DETECTED_ATTRIBUTE] === value) {
			return;
		}
		localParticipant.setAttributes({ [FACE_DETECTED_ATTRIBUTE]: value }).catch(console.warn);
	}, [localParticipant, active, detected]);

	return null;
}

function WarningIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0Z"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function NoFaceBadge() {
	return (
		<span className="cb-face-badge cb-delayed-fade-in" role="status">
			<WarningIcon />
			No face detected
		</span>
	);
}

function SearchingSpinner() {
	return (
		<svg
			className="lk-spinner cb-face-spinner"
			width="28"
			height="28"
			viewBox="0 0 24 24"
			fill="none"
			role="status"
			aria-label="Looking for a face"
		>
			<circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
			<path d="M21 12a9 9 0 0 0-9-9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
		</svg>
	);
}

export function FaceStatusOverlay({
	trackRef,
	style,
}: {
	trackRef: TrackReferenceOrPlaceholder;
	style?: CSSProperties;
}) {
	const participant = trackRef.participant;
	const faceReady = useFaceDeformerReady();
	const localActive = useLocalDeformerActive();
	const localDetected = useLocalFaceDetected();
	const { attributes } = useParticipantAttributes({ participant });

	const isCamera = trackRef.source === Track.Source.Camera;
	const cameraOn = !!trackRef.publication && !trackRef.publication.isMuted;
	if (!isCamera || !cameraOn) {
		return null;
	}

	let content: React.ReactNode = null;
	if (participant.isLocal) {
		if (!faceReady) {
			content = <SearchingSpinner />;
		} else if (localActive && !localDetected) {
			content = <NoFaceBadge />;
		}
	} else if (attributes?.[FACE_DETECTED_ATTRIBUTE] === UNDETECTED) {
		content = <SearchingSpinner />;
	}

	if (!content) {
		return null;
	}
	return (
		<div className="cb-face-overlay" style={style}>
			{content}
		</div>
	);
}

export function LocalNoFaceHint() {
	const faceReady = useFaceDeformerReady();
	const active = useLocalDeformerActive();
	const detected = useLocalFaceDetected();

	if (!faceReady || !active || detected) {
		return null;
	}
	return (
		<div className="cb-face-hint">
			<NoFaceBadge />
		</div>
	);
}
