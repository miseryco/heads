import React from 'react';
import {
	MediaDeviceMenu,
	TrackReference,
	TrackToggle,
	useLocalParticipant,
	VideoTrack,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { RENDERED_MEDIA_ELEMENT_SIZE } from './useRenderedMediaElementDefaults';
import { LocalNoFaceHint } from './FaceDetectionOverlay';

export function CameraSettings() {
	const { cameraTrack, localParticipant } = useLocalParticipant();

	const camTrackRef: TrackReference | undefined = React.useMemo(() => {
		return cameraTrack
			? { participant: localParticipant, publication: cameraTrack, source: Track.Source.Camera }
			: undefined;
	}, [localParticipant, cameraTrack]);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
			{camTrackRef && (
				<div style={{ position: 'relative' }}>
					<VideoTrack
						width={RENDERED_MEDIA_ELEMENT_SIZE}
						height={RENDERED_MEDIA_ELEMENT_SIZE}
						style={{
							width: '100%',
							aspectRatio: '1 / 1',
							maxHeight: '280px',
							objectFit: 'fill',
							objectPosition: 'center',
							transform: 'scaleX(-1)',
						}}
						trackRef={camTrackRef}
					/>
					<LocalNoFaceHint />
				</div>
			)}

			<section className="lk-button-group">
				<TrackToggle source={Track.Source.Camera}>Camera</TrackToggle>
				<div className="lk-button-group-menu">
					<MediaDeviceMenu kind="videoinput" />
				</div>
			</section>
		</div>
	);
}
