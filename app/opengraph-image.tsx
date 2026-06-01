import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Heads — Face-First Video Conferencing';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
	return new ImageResponse(
		<div
			style={{
				background: '#111111',
				width: '1200px',
				height: '630px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<svg width="1040" height="200" viewBox="0 0 6768 1296" fill="#ffae00">
				<path d="M5472,828l0,-828l1296,0l0,396l-648,0l-0,72l648,0l-0,828l-1296,0l-0,-396l648,0l-0,-72l-648,0Z" />
				<path d="M4104,1296l0,-1296l1092.35,0l203.647,203.647l0,1092.35l-1296,0Zm684,-396l0,-504l-72,0l0,504l72,0Z" />
				<path d="M2736,1296l0,-1296l1296,0l-0,1296l-612,0l-0,-396l-72,0l-0,396l-612,0Zm612,-900l-0,252l72,0l-0,-252l-72,0Z" />
				<path d="M2664,900l-0,396l-1296,0l-0,-1296l1296,0l-0,396l-648,0l-0,72l648,0l-0,360l-648,0l-0,72l648,0Z" />
				<path d="M0,1296l0,-1296l612,-0l-0,396l72,0l-0,-396l612,-0l-0,1296l-612,0l-0,-396l-72,0l-0,396l-612,0Z" />
			</svg>
		</div>,
		{ ...size },
	);
}
