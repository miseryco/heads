import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
	return new ImageResponse(
		<div
			style={{
				background: '#111111',
				width: '180px',
				height: '180px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<svg width="120" height="120" viewBox="0 0 1296 1296" fill="#ffae00">
				<path d="m0 1296v-1296h612v396h72v-396h612v1296h-612v-396h-72v396z" />
			</svg>
		</div>,
		{ ...size },
	);
}
