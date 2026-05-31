'use client';

import React from 'react';
import type {
  MessageDecoder,
  MessageEncoder,
  MessageFormatter,
  TrackReferenceOrPlaceholder,
  WidgetState,
} from '@livekit/components-react';
import {
  Chat,
  ConnectionStateToast,
  LayoutContextProvider,
  ParticipantTile,
  RoomAudioRenderer,
  useCreateLayoutContext,
  useTracks,
} from '@livekit/components-react';
import { RoomEvent, Track } from 'livekit-client';
import { useIdle } from '@uidotdev/usehooks';
import { EdgeToEdgeControlBar } from './EdgeToEdgeControlBar';
import { FaceStatusOverlay, LocalFaceAttributePublisher } from './FaceDetectionOverlay';
import { useRenderedMediaElementDefaults } from './useRenderedMediaElementDefaults';

type ElementSize = {
  width: number;
  height: number;
};

type PartitionItem = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const IDEAL_ASPECT = 1;

export interface EdgeToEdgeVideoConferenceProps extends React.HTMLAttributes<HTMLDivElement> {
  chatMessageFormatter?: MessageFormatter;
  chatMessageEncoder?: MessageEncoder;
  chatMessageDecoder?: MessageDecoder;
  SettingsComponent?: React.ComponentType;
}

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

export function EdgeToEdgeVideoConference({
  chatMessageFormatter,
  chatMessageDecoder,
  chatMessageEncoder,
  SettingsComponent,
  className,
  ...props
}: EdgeToEdgeVideoConferenceProps) {
  const [widgetState, setWidgetState] = React.useState<WidgetState>({
    showChat: false,
    unreadMessages: 0,
    showSettings: false,
  });
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );
  const layoutContext = useCreateLayoutContext();
  const isBrowser = typeof document !== 'undefined';
  const rootRef = React.useRef<HTMLDivElement>(null);
  const rootClassName = ['edge-video-conference', 'lk-video-conference', className]
    .filter(Boolean)
    .join(' ');

  useRenderedMediaElementDefaults(rootRef);

  const idle = useIdle(5000);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const controlsVisible = !idle || menuOpen || widgetState.showChat || widgetState.showSettings;

  return (
    <div ref={rootRef} className={rootClassName} {...props}>
      {isBrowser && (
        <LayoutContextProvider value={layoutContext} onWidgetChange={setWidgetState}>
          <div className="edge-video-conference-inner lk-video-conference-inner">
            <EdgeToEdgeTrackLayout tracks={tracks} />
            <EdgeToEdgeControlBar
              showSettings={!!SettingsComponent}
              visible={controlsVisible}
              onMenuOpenChange={setMenuOpen}
            />
          </div>
          <LocalFaceAttributePublisher />
          <Chat
            style={{ display: widgetState.showChat ? 'grid' : 'none' }}
            messageFormatter={chatMessageFormatter}
            messageEncoder={chatMessageEncoder}
            messageDecoder={chatMessageDecoder}
          />
          {SettingsComponent && widgetState.showSettings && (
            <div
              className="edge-settings-backdrop"
              onClick={() => layoutContext.widget.dispatch?.({ msg: 'toggle_settings' })}
            >
              <div className="lk-settings-menu-modal" onClick={(e) => e.stopPropagation()}>
                <SettingsComponent />
              </div>
            </div>
          )}
        </LayoutContextProvider>
      )}
      <RoomAudioRenderer />
      <ConnectionStateToast />
    </div>
  );
}

function EdgeToEdgeTrackLayout({ tracks }: { tracks: TrackReferenceOrPlaceholder[] }) {
  const [stageRef, stageSize] = useElementSize<HTMLDivElement>();
  const items = React.useMemo(
    () => partitionSpace(0, 0, stageSize.width, stageSize.height, tracks.length),
    [stageSize.height, stageSize.width, tracks.length],
  );

  return (
    <div ref={stageRef} className="edge-video-stage">
      {tracks.map((track, index) => {
        const tileKey = getTrackKey(track, index);
        const tileStyle = getTileStyle(items[index]);

        return (
          <React.Fragment key={tileKey}>
            <ParticipantTile className="edge-video-tile" style={tileStyle} trackRef={track} />
            <FaceStatusOverlay trackRef={track} style={tileStyle} />
          </React.Fragment>
        );
      })}
    </div>
  );
}

function useElementSize<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [size, setSize] = React.useState<ElementSize>({ width: 0, height: 0 });

  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const updateSize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setSize({ width, height });
      }
    };
    const resizeObserver = new ResizeObserver(updateSize);

    updateSize();
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  return [ref, size] as const;
}

function getTileStyle(item: PartitionItem | undefined): React.CSSProperties {
  if (!item) {
    return { display: 'none' };
  }

  return {
    left: `${item.x}px`,
    top: `${item.y}px`,
    width: `${item.w}px`,
    height: `${item.h}px`,
  };
}

function splitEvenly(n: number, d: number) {
  const base = Math.floor(n / d);
  const remainder = n % d;

  return Array.from({ length: d }, (_, index) => {
    const extra = index >= d - remainder ? 1 : 0;
    return base + extra;
  });
}

function aspectError(w: number, h: number) {
  return Math.abs(Math.log(w / h / IDEAL_ASPECT));
}

function sumErrors(items: PartitionItem[]) {
  return items.reduce((sum, item) => {
    return sum + aspectError(item.w, item.h);
  }, 0);
}

function partitionSpace(x: number, y: number, w: number, h: number, n: number): PartitionItem[] {
  if (n <= 0 || w <= 0 || h <= 0) {
    return [];
  }
  if (n === 1) {
    return [{ x, y, w, h }];
  }

  return Array.from({ length: n - 1 }, (_, index) => index + 2).reduce(
    (best, divisor) => {
      const vertical = w >= h;
      const splitW = vertical ? w / divisor : w;
      const splitH = vertical ? h : h / divisor;
      const groups = splitEvenly(n, divisor);
      let offsetX = x;
      let offsetY = y;

      const items = groups.flatMap((groupSize) => {
        const result = partitionSpace(offsetX, offsetY, splitW, splitH, groupSize);

        if (vertical) {
          offsetX += splitW;
        } else {
          offsetY += splitH;
        }

        return result;
      });
      const error = sumErrors(items);

      return error < best.error ? { error, items } : best;
    },
    {
      error: Infinity,
      items: [] as PartitionItem[],
    },
  ).items;
}

function getTrackKey(track: TrackReferenceOrPlaceholder, index: number) {
  const trackSid = track.publication?.trackSid ?? 'placeholder';

  return `${track.participant.identity}-${track.source}-${trackSid}-${index}`;
}
