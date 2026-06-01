import * as React from 'react';
import type { Metadata } from 'next';
import { PageClientImpl } from './PageClientImpl';

export async function generateMetadata({ params }: { params: Promise<{ roomName: string }> }): Promise<Metadata> {
	const { roomName } = await params;
	return { title: `Heads - ${decodeURIComponent(roomName)}` };
}

export default async function Page({ params }: { params: Promise<{ roomName: string }> }) {
	const { roomName } = await params;

	return <PageClientImpl roomName={roomName} />;
}
