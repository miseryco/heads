import React from 'react';

/**
 * Indeterminate loading spinner. Animation comes from LiveKit's `.lk-spinner`
 * class (the `lk-rotate` keyframes in @livekit/components-styles).
 *
 * Decorative by default (`aria-hidden`); give the surrounding container a
 * `role="status"` and an `aria-label` to announce the loading state.
 */
export function Spinner({ size = 32, className }: { size?: number; className?: string }) {
	return (
		<svg
			className={className ? `lk-spinner ${className}` : 'lk-spinner'}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
			<path d="M21 12a9 9 0 0 0-9-9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
		</svg>
	);
}
