import React from 'react';
import { Switch } from '@ark-ui/react';
import { useKrispNoiseFilter } from '@livekit/components-react/krisp';
import { TrackToggle } from '@livekit/components-react';
import { MediaDeviceMenu } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { isLowPowerDevice } from './client-utils';

function SpeakerIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				d="M11 5 6 9H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l5 4a1 1 0 0 0 1.6-.78V5.78A1 1 0 0 0 11 5Z"
				fill="currentColor"
			/>
			<path
				d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
		</svg>
	);
}

export function AudioSettings() {
	const { isNoiseFilterEnabled, setNoiseFilterEnabled, isNoiseFilterPending } = useKrispNoiseFilter({
		filterOptions: {
			bufferOverflowMs: 100,
			bufferDropMs: 200,
			quality: isLowPowerDevice() ? 'low' : 'medium',
			onBufferDrop: () => {
				console.warn(
					'krisp buffer dropped, noise filter versions >= 0.3.2 will automatically disable the filter',
				);
			},
		},
	});

	React.useEffect(() => {
		// enable Krisp by default on non-low power devices
		setNoiseFilterEnabled(!isLowPowerDevice());
	}, []);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
			<div className="edge-audio-devices">
				<section className="lk-button-group">
					<TrackToggle source={Track.Source.Microphone}>Microphone</TrackToggle>
					<div className="lk-button-group-menu">
						<MediaDeviceMenu kind="audioinput" />
					</div>
				</section>

				<MediaDeviceMenu kind="audiooutput">
					<SpeakerIcon />
					Speaker
				</MediaDeviceMenu>
			</div>

			<Switch.Root
				className="edge-switch"
				checked={isNoiseFilterEnabled}
				disabled={isNoiseFilterPending}
				onCheckedChange={details => setNoiseFilterEnabled(details.checked)}
			>
				<Switch.Control className="edge-switch-control">
					<Switch.Thumb className="edge-switch-thumb" />
				</Switch.Control>
				<Switch.Label className="edge-switch-label">Enhanced Noise Cancellation</Switch.Label>
				<Switch.HiddenInput />
			</Switch.Root>
		</div>
	);
}
