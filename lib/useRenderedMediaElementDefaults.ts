'use client';

import React from 'react';

export const RENDERED_MEDIA_ELEMENT_SIZE = 512;

const MEDIA_ELEMENT_SELECTOR = 'video, canvas';

type RenderedMediaElement = HTMLVideoElement | HTMLCanvasElement;

export function useRenderedMediaElementDefaults<T extends HTMLElement>(rootRef: React.RefObject<T | null>) {
	React.useEffect(() => {
		const root = rootRef.current;
		if (!root) {
			return;
		}

		normalizeRenderedMediaElements(root);

		if (typeof MutationObserver === 'undefined') {
			return;
		}

		let frameId: number | undefined;
		const normalizeSoon = () => {
			if (frameId !== undefined) {
				return;
			}

			frameId = window.requestAnimationFrame(() => {
				frameId = undefined;
				normalizeRenderedMediaElements(root);
			});
		};
		const observer = new MutationObserver(normalizeSoon);

		observer.observe(root, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['width', 'height', 'style'],
		});

		return () => {
			observer.disconnect();
			if (frameId !== undefined) {
				window.cancelAnimationFrame(frameId);
			}
		};
	}, [rootRef]);
}

function normalizeRenderedMediaElements(root: HTMLElement) {
	const size = String(RENDERED_MEDIA_ELEMENT_SIZE);

	root.querySelectorAll<RenderedMediaElement>(MEDIA_ELEMENT_SELECTOR).forEach(element => {
		if (element.getAttribute('width') !== size) {
			element.setAttribute('width', size);
		}
		if (element.getAttribute('height') !== size) {
			element.setAttribute('height', size);
		}
		if (element.width !== RENDERED_MEDIA_ELEMENT_SIZE) {
			element.width = RENDERED_MEDIA_ELEMENT_SIZE;
		}
		if (element.height !== RENDERED_MEDIA_ELEMENT_SIZE) {
			element.height = RENDERED_MEDIA_ELEMENT_SIZE;
		}
		if (element.style.objectFit !== 'fill') {
			element.style.objectFit = 'fill';
		}
	});
}
