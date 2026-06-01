'use client';

import React from 'react';
import { decodePassphrase } from '@/lib/client-utils';
import { DebugMode } from '@/lib/Debug';
import { KeyboardShortcuts } from '@/lib/KeyboardShortcuts';
import { SettingsMenu } from '@/lib/SettingsMenu';
import { Spinner } from '@/lib/Spinner';
import { ConnectionDetails } from '@/lib/types';
import { formatChatMessageLinks, LocalUserChoices, PreJoinProps, RoomContext } from '@livekit/components-react';
import {
	ConnectionState,
	DeviceUnsupportedError,
	ExternalE2EEKeyProvider,
	Room,
	RoomConnectOptions,
	RoomEvent,
	RoomOptions,
	TrackPublishDefaults,
	VideoCodec,
	VideoCaptureOptions,
} from 'livekit-client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSetupE2EE } from '@/lib/useSetupE2EE';
import { useLowCPUOptimizer } from '@/lib/usePerformanceOptimiser';
import {
	ShaderPadFaceDeformer,
	SHADERPAD_FACE_DEFORMER_VIDEO_ENCODING,
	SHADERPAD_FACE_DEFORMER_VIDEO_RESOLUTION,
	useFaceDeformerReady,
} from '@/lib/ShaderPadFaceDeformer';
import { EdgeToEdgeVideoConference } from '@/lib/EdgeToEdgeVideoConference';
import { LocalNoFaceHint } from '@/lib/FaceDetectionOverlay';
import { Wordmark } from '@/lib/Wordmark';
import { useRenderedMediaElementDefaults } from '@/lib/useRenderedMediaElementDefaults';

const CONN_DETAILS_ENDPOINT = process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details';
const DEFAULT_VIDEO_CODEC: VideoCodec = 'vp9';

const ClientOnlyPreJoin = dynamic<PreJoinProps>(() => import('@livekit/components-react').then(mod => mod.PreJoin), {
	ssr: false,
});

function isMediaPermissionDeniedError(error: Error) {
	return error.name === 'NotAllowedError' || error.name === 'SecurityError';
}

export function PageClientImpl(props: { roomName: string }) {
	const [preJoinChoices, setPreJoinChoices] = React.useState<LocalUserChoices | undefined>(undefined);
	const preJoinDefaults = React.useMemo(() => {
		return {
			username: '',
			videoEnabled: true,
			audioEnabled: true,
		};
	}, []);
	const preJoinVideoProcessor = React.useMemo(() => ShaderPadFaceDeformer(), []);
	const faceReady = useFaceDeformerReady();
	const mediaRootRef = React.useRef<HTMLElement>(null);
	const [connectionDetails, setConnectionDetails] = React.useState<ConnectionDetails | undefined>(undefined);

	useRenderedMediaElementDefaults(mediaRootRef);

	const handlePreJoinSubmit = React.useCallback(
		async (values: LocalUserChoices) => {
			setPreJoinChoices(values);
			const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
			url.searchParams.append('roomName', props.roomName);
			url.searchParams.append('participantName', values.username);
			const connectionDetailsResp = await fetch(url.toString());
			const connectionDetailsData = await connectionDetailsResp.json();
			setConnectionDetails(connectionDetailsData);
		},
		[props.roomName],
	);
	const handlePreJoinError = React.useCallback((error: Error) => {
		if (isMediaPermissionDeniedError(error)) {
			return;
		}

		console.error(error);
	}, []);

	return (
		<main ref={mediaRootRef} data-lk-theme="default" style={{ height: '100%' }}>
			{connectionDetails === undefined || preJoinChoices === undefined ? (
				<div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
					<Wordmark />
					<div className="cb-prejoin-frame" style={{ position: 'relative' }}>
						<ClientOnlyPreJoin
							defaults={preJoinDefaults}
							onSubmit={handlePreJoinSubmit}
							onError={handlePreJoinError}
							videoProcessor={preJoinVideoProcessor}
							joinLabel="Join room"
						/>
						{!faceReady && <FaceFilterLoadingOverlay />}
						<LocalNoFaceHint />
					</div>
				</div>
			) : (
				<VideoConferenceComponent connectionDetails={connectionDetails} userChoices={preJoinChoices} />
			)}
		</main>
	);
}

function FaceFilterLoadingOverlay() {
	return (
		<div
			aria-live="polite"
			aria-label="Loading face filter"
			style={{
				position: 'absolute',
				inset: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: 'rgba(0, 0, 0, 0.55)',
				backdropFilter: 'blur(2px)',
				borderRadius: 'var(--lk-border-radius)',
				pointerEvents: 'none',
			}}
		>
			<Spinner />
		</div>
	);
}

function VideoConferenceComponent(props: { userChoices: LocalUserChoices; connectionDetails: ConnectionDetails }) {
	const keyProvider = React.useMemo(() => new ExternalE2EEKeyProvider(), []);
	const { worker, e2eePassphrase } = useSetupE2EE();
	const e2eeEnabled = !!(e2eePassphrase && worker);

	const [e2eeReadyPassphrase, setE2eeReadyPassphrase] = React.useState<string | undefined>(undefined);
	const e2eeSetupComplete = !e2eeEnabled || e2eeReadyPassphrase === e2eePassphrase;

	const roomOptions = React.useMemo((): RoomOptions => {
		let videoCodec: VideoCodec | undefined = DEFAULT_VIDEO_CODEC;
		if (e2eeEnabled && (videoCodec === 'av1' || videoCodec === 'vp9')) {
			videoCodec = undefined;
		}
		const videoCaptureDefaults: VideoCaptureOptions = {
			deviceId: props.userChoices.videoDeviceId ?? undefined,
			resolution: SHADERPAD_FACE_DEFORMER_VIDEO_RESOLUTION,
		};
		const faceDeformer = ShaderPadFaceDeformer();
		if (faceDeformer) {
			videoCaptureDefaults.processor = faceDeformer;
		}
		const publishDefaults: TrackPublishDefaults = {
			dtx: false,
			simulcast: false,
			videoEncoding: SHADERPAD_FACE_DEFORMER_VIDEO_ENCODING,
			red: !e2eeEnabled,
			videoCodec,
		};
		return {
			videoCaptureDefaults: videoCaptureDefaults,
			publishDefaults: publishDefaults,
			audioCaptureDefaults: {
				deviceId: props.userChoices.audioDeviceId ?? undefined,
			},
			adaptiveStream: true,
			dynacast: true,
			e2ee: keyProvider && worker && e2eeEnabled ? { keyProvider, worker } : undefined,
			singlePeerConnection: true,
		};
	}, [props.userChoices, e2eeEnabled, keyProvider, worker]);

	const room = React.useMemo(() => new Room(roomOptions), [roomOptions]);
	const [roomConnected, setRoomConnected] = React.useState(false);

	React.useEffect(() => {
		if (!e2eeEnabled || !e2eePassphrase) {
			return;
		}

		let cancelled = false;
		keyProvider
			.setKey(decodePassphrase(e2eePassphrase))
			.then(() => {
				return room.setE2EEEnabled(true).catch(e => {
					if (e instanceof DeviceUnsupportedError) {
						alert(
							`You're trying to join an encrypted meeting, but your browser does not support it. Please update it to the latest version and try again.`,
						);
						console.error(e);
					} else {
						throw e;
					}
				});
			})
			.then(() => {
				if (!cancelled) {
					setE2eeReadyPassphrase(e2eePassphrase);
				}
			})
			.catch(error => {
				console.error(error);
			});

		return () => {
			cancelled = true;
		};
	}, [e2eeEnabled, e2eePassphrase, keyProvider, room]);

	const connectOptions = React.useMemo((): RoomConnectOptions => {
		return {
			autoSubscribe: true,
		};
	}, []);

	const router = useRouter();
	const handleOnLeave = React.useCallback(() => router.push('/'), [router]);
	const handleError = React.useCallback((error: Error) => {
		console.error(error);
		alert(`Encountered an unexpected error, check the console logs for details: ${error.message}`);
	}, []);
	const handleEncryptionError = React.useCallback((error: Error) => {
		console.error(error);
		alert(`Encountered an unexpected encryption error, check the console logs for details: ${error.message}`);
	}, []);

	React.useEffect(() => {
		const handleConnected = () => {
			setRoomConnected(!!room.localParticipant.identity);
			if (props.userChoices.videoEnabled) {
				room.localParticipant.setCameraEnabled(true).catch(error => {
					handleError(error);
				});
			}
			if (props.userChoices.audioEnabled) {
				room.localParticipant.setMicrophoneEnabled(true).catch(error => {
					handleError(error);
				});
			}
		};
		const handleDisconnected = () => {
			setRoomConnected(false);
			handleOnLeave();
		};

		room.on(RoomEvent.Connected, handleConnected);
		room.on(RoomEvent.Disconnected, handleDisconnected);
		room.on(RoomEvent.EncryptionError, handleEncryptionError);
		room.on(RoomEvent.MediaDevicesError, handleError);

		if (e2eeSetupComplete) {
			if (room.state === ConnectionState.Connected) {
				handleConnected();
			} else if (room.state === ConnectionState.Disconnected) {
				room.connect(
					props.connectionDetails.serverUrl,
					props.connectionDetails.participantToken,
					connectOptions,
				).catch(error => {
					handleError(error);
				});
			}
		}
		return () => {
			room.off(RoomEvent.Connected, handleConnected);
			room.off(RoomEvent.Disconnected, handleDisconnected);
			room.off(RoomEvent.EncryptionError, handleEncryptionError);
			room.off(RoomEvent.MediaDevicesError, handleError);
		};
	}, [
		connectOptions,
		e2eeSetupComplete,
		handleEncryptionError,
		handleError,
		handleOnLeave,
		room,
		props.connectionDetails,
		props.userChoices,
	]);

	const lowPowerMode = useLowCPUOptimizer(room);

	React.useEffect(() => {
		if (lowPowerMode) {
			console.warn('Low power mode enabled');
		}
	}, [lowPowerMode]);

	return (
		<div className="lk-room-container">
			<RoomContext.Provider value={room}>
				{roomConnected ? (
					<>
						<KeyboardShortcuts />
						<EdgeToEdgeVideoConference
							chatMessageFormatter={formatChatMessageLinks}
							SettingsComponent={SettingsMenu}
						/>
						<DebugMode />
					</>
				) : (
					<div
						className="lk-video-conference lk-video-conference-inner"
						role="status"
						aria-live="polite"
						aria-label="Connecting"
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							height: '100%',
						}}
					>
						<Spinner size={48} className="cb-delayed-fade-in" />
					</div>
				)}
			</RoomContext.Provider>
		</div>
	);
}
