'use client';

import * as React from 'react';
import { Menu, Popover, Portal } from '@ark-ui/react';
import {
	ChatIcon,
	GearIcon,
	LeaveIcon,
	MediaDeviceSelect,
	ScreenShareIcon,
	TrackToggle,
	useMaybeLayoutContext,
	useRoomContext,
	useTrackToggle,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

function ChevronIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path
				d="M6 9l6 6 6-6"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function OverflowIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
			<circle cx="12" cy="5" r="2" />
			<circle cx="12" cy="12" r="2" />
			<circle cx="12" cy="19" r="2" />
		</svg>
	);
}

type DeviceSection = { kind: MediaDeviceKind; label: string };

function DeviceMenu({
	sections,
	label,
	onOpenChange,
}: {
	sections: DeviceSection[];
	label: string;
	onOpenChange?: (open: boolean) => void;
}) {
	return (
		<Popover.Root
			positioning={{ placement: 'top', gutter: 20 }}
			onOpenChange={details => onOpenChange?.(details.open)}
		>
			<Popover.Trigger className="cb-chevron" aria-label={label}>
				<ChevronIcon />
			</Popover.Trigger>
			<Portal>
				<Popover.Positioner>
					<Popover.Content className="cb-popover">
						{sections.map(section => (
							<div key={section.kind} className="cb-device-section">
								<div className="cb-device-title">{section.label}</div>
								<MediaDeviceSelect kind={section.kind} />
							</div>
						))}
					</Popover.Content>
				</Popover.Positioner>
			</Portal>
		</Popover.Root>
	);
}

function OverflowMenu({
	showSettings,
	onOpenChange,
}: {
	showSettings: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const layoutContext = useMaybeLayoutContext();
	const dispatch = layoutContext?.widget.dispatch;
	const room = useRoomContext();
	const screenShareSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;
	const screenShare = useTrackToggle({
		source: Track.Source.ScreenShare,
		captureOptions: { audio: true, selfBrowserSurface: 'include' },
	});

	return (
		<Menu.Root
			positioning={{ placement: 'top-end', gutter: 20 }}
			onOpenChange={details => onOpenChange?.(details.open)}
			onSelect={details => {
				switch (details.value) {
					case 'chat':
						dispatch?.({ msg: 'toggle_chat' });
						break;
					case 'screen-share':
						void screenShare.toggle();
						break;
					case 'settings':
						dispatch?.({ msg: 'toggle_settings' });
						break;
					case 'leave':
						void room.disconnect();
						break;
				}
			}}
		>
			<Menu.Trigger className="cb-round" aria-label="More options">
				<OverflowIcon />
			</Menu.Trigger>
			<Portal>
				<Menu.Positioner>
					<Menu.Content className="cb-menu">
						<Menu.Item value="chat" className="cb-menu-item">
							<ChatIcon />
							<span>Chat</span>
						</Menu.Item>
						{screenShareSupported && (
							<Menu.Item value="screen-share" className="cb-menu-item">
								<ScreenShareIcon />
								<span>{screenShare.enabled ? 'Stop screen share' : 'Share screen'}</span>
							</Menu.Item>
						)}
						{showSettings && (
							<Menu.Item value="settings" className="cb-menu-item">
								<GearIcon />
								<span>Settings</span>
							</Menu.Item>
						)}
						<Menu.Separator className="cb-menu-separator" />
						<Menu.Item value="leave" className="cb-menu-item cb-menu-item-danger">
							<LeaveIcon />
							<span>Leave call</span>
						</Menu.Item>
					</Menu.Content>
				</Menu.Positioner>
			</Portal>
		</Menu.Root>
	);
}

export interface EdgeToEdgeControlBarProps {
	showSettings?: boolean;
	visible?: boolean;
	onMenuOpenChange?: (open: boolean) => void;
}

export function EdgeToEdgeControlBar({
	showSettings = true,
	visible = true,
	onMenuOpenChange,
}: EdgeToEdgeControlBarProps) {
	const openCount = React.useRef(0);
	const handleOpenChange = React.useCallback(
		(open: boolean) => {
			openCount.current += open ? 1 : -1;
			onMenuOpenChange?.(openCount.current > 0);
		},
		[onMenuOpenChange],
	);

	return (
		<div className="lk-control-bar edge-control-bar" data-lk-visible={visible}>
			<div className="cb-group">
				<DeviceMenu
					label="Audio input and output"
					onOpenChange={handleOpenChange}
					sections={[
						{ kind: 'audioinput', label: 'Microphone' },
						{ kind: 'audiooutput', label: 'Speaker' },
					]}
				/>
				<TrackToggle className="cb-toggle" source={Track.Source.Microphone} showIcon />
			</div>

			<div className="cb-group">
				<DeviceMenu
					label="Camera"
					onOpenChange={handleOpenChange}
					sections={[{ kind: 'videoinput', label: 'Camera' }]}
				/>
				<TrackToggle className="cb-toggle" source={Track.Source.Camera} showIcon />
			</div>

			<OverflowMenu showSettings={showSettings} onOpenChange={handleOpenChange} />
		</div>
	);
}
