'use client';

import * as React from 'react';
import type { Track, TrackProcessor, VideoProcessorOptions } from 'livekit-client';
import ShaderPad from 'shaderpad';
import face from 'shaderpad/plugins/face';

export const SHADERPAD_FACE_DEFORMER_PROCESSOR_NAME = 'shaderpad-face-deformer';

const DEFAULT_MAX_FACES = 4;
const DEFAULT_MAX_FPS = 30;
const HISTORY_FRAMES = 1;
const TEXTURE_NAME = 'u_face';
export const SHADERPAD_FACE_DEFORMER_OUTPUT_SIZE = 512;
export const SHADERPAD_FACE_DEFORMER_VIDEO_RESOLUTION = {
  width: SHADERPAD_FACE_DEFORMER_OUTPUT_SIZE,
  height: SHADERPAD_FACE_DEFORMER_OUTPUT_SIZE,
  frameRate: DEFAULT_MAX_FPS,
  aspectRatio: 1,
} as const;
export const SHADERPAD_FACE_DEFORMER_VIDEO_ENCODING = {
  maxBitrate: 800_000,
  maxFramerate: DEFAULT_MAX_FPS,
} as const;

const CONTROL_POINTS = [
  [67, 0, 0],
  [10, 0.5, 0],
  [297, 1, 0],
  [54, 0, 0.1],
  [151, 0.5, 0.1],
  [284, 1, 0.1],
  [234, 0, 0.5],
  [4, 0.5, 0.5],
  [454, 1, 0.5],
  [136, 0, 0.9],
  [200, 0.5, 0.9],
  [365, 1, 0.9],
  [149, 0, 1],
  [152, 0.5, 1],
  [378, 1, 1],
] as const;

export type ShaderPadFaceDeformerOptions = {
  maxFaces?: number;
  maxFps?: number;
};

function normalizeMaxFaces(maxFaces: number | undefined) {
  return Math.max(1, Math.min(DEFAULT_MAX_FACES, Math.floor(maxFaces ?? DEFAULT_MAX_FACES)));
}

function createDomCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function hasWebGL2Support() {
  if (typeof document === 'undefined') {
    return false;
  }

  const canvas = document.createElement('canvas');
  return !!canvas.getContext('webgl2');
}

export function supportsShaderPadFaceDeformer() {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    'captureStream' in HTMLCanvasElement.prototype &&
    hasWebGL2Support()
  );
}

function isVideoFrameReady(video: HTMLVideoElement) {
  return video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
}

const FACE_WARP_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_face;
uniform highp sampler2DArray u_history;
uniform int u_historyFrameOffset;
uniform int u_controlIndices[15];
uniform vec2 u_controlTargets[15];

const int CONTROL_COUNT = 15;
const float CONTROL_EPSILON = 0.000001;

struct FaceTile {
    int index;
    vec2 uv;
};

mat2 outer2(vec2 column, vec2 row) {
    return mat2(
        column.x * row.x, column.y * row.x,
        column.x * row.y, column.y * row.y
    );
}

mat2 inverse2(mat2 m) {
    float a = m[0][0];
    float b = m[1][0];
    float c = m[0][1];
    float d = m[1][1];
    float det = a * d - b * c;
    return mat2(d, -c, -b, a) / det;
}

FaceTile faceTile(vec2 point, int faceCount) {
    float faces = float(faceCount);
    float rows = 1.0 + step(2.0, faces);
    float row = min(floor(point.y * rows), rows - 1.0);
    float splitRowsStart = max(0.0, 4.0 - faces);
    float split = step(splitRowsStart, row);
    float columns = 1.0 + split;
    float column = min(floor(point.x * columns), columns - 1.0);
    float index = row + split * (row - splitRowsStart + column);

    return FaceTile(int(index), point * vec2(columns, rows) - vec2(column, row));
}

vec2 sourceControlUv(int faceIndex, int controlIndex) {
    return faceLandmark(faceIndex, u_controlIndices[controlIndex]).xy;
}

vec2 movingLeastSquaresWarp(vec2 point, int faceIndex) {
    float weightSum = 0.0;
    vec2 targetWeightedCenter = vec2(0.0);
    vec2 sourceWeightedCenter = vec2(0.0);

    for (int i = 0; i < CONTROL_COUNT; ++i) {
        vec2 targetPoint = u_controlTargets[i];
        vec2 sourcePoint = sourceControlUv(faceIndex, i);
        vec2 delta = point - targetPoint;
        float dist2 = dot(delta, delta);

        if (dist2 < CONTROL_EPSILON) {
            return sourcePoint;
        }

        float weight = 1.0 / dist2;
        weightSum += weight;
        targetWeightedCenter += weight * targetPoint;
        sourceWeightedCenter += weight * sourcePoint;
    }

    vec2 targetCenter = targetWeightedCenter / weightSum;
    vec2 sourceCenter = sourceWeightedCenter / weightSum;
    mat2 targetCovariance = mat2(0.0);
    mat2 sourceFromTargetCovariance = mat2(0.0);

    for (int i = 0; i < CONTROL_COUNT; ++i) {
        vec2 targetPoint = u_controlTargets[i];
        vec2 sourcePoint = sourceControlUv(faceIndex, i);
        vec2 delta = point - targetPoint;
        float weight = 1.0 / max(dot(delta, delta), CONTROL_EPSILON);
        vec2 targetHat = targetPoint - targetCenter;
        vec2 sourceHat = sourcePoint - sourceCenter;

        targetCovariance += weight * outer2(targetHat, targetHat);
        sourceFromTargetCovariance += weight * outer2(sourceHat, targetHat);
    }

    mat2 transform = sourceFromTargetCovariance * inverse2(targetCovariance);
    return transform * (point - targetCenter) + sourceCenter;
}

void main() {
    vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
    int faceCount = min(u_nFaces, 4);

    if (faceCount < 1) {
        int historyDepth = textureSize(u_history, 0).z;
        int historyLayer = (historyDepth + u_historyFrameOffset - 1) % historyDepth;
        outColor = texture(u_history, vec3(v_uv, float(historyLayer)));
        return;
    }

    FaceTile tile = faceTile(uv, faceCount);
    vec2 srcUV = clamp(movingLeastSquaresWarp(tile.uv, tile.index), 0.0, 1.0);
    outColor = texture(u_face, srcUV);
}
`;

class ShaderPadFaceDeformerProcessor implements TrackProcessor<
  Track.Kind.Video,
  VideoProcessorOptions
> {
  readonly name = SHADERPAD_FACE_DEFORMER_PROCESSOR_NAME;

  private readonly maxFaces: number;

  private readonly maxFps: number;

  private shader?: ShaderPad;

  private glCanvas?: HTMLCanvasElement;

  private displayCanvas?: HTMLCanvasElement;

  private outputStream?: MediaStream;

  processedTrack?: MediaStreamTrack;

  constructor(options: ShaderPadFaceDeformerOptions = {}) {
    this.maxFaces = normalizeMaxFaces(options.maxFaces);
    this.maxFps = options.maxFps ?? DEFAULT_MAX_FPS;
  }

  async init(options: VideoProcessorOptions) {
    const inputVideo = options.element;
    if (!(inputVideo instanceof HTMLVideoElement)) {
      throw new TypeError('ShaderPadFaceDeformer requires a video element to process');
    }

    setLocalDeformerActive(true);

    const glCanvas = createDomCanvas(
      SHADERPAD_FACE_DEFORMER_OUTPUT_SIZE,
      SHADERPAD_FACE_DEFORMER_OUTPUT_SIZE,
    );
    this.glCanvas = glCanvas;

    const displayCanvas = createDomCanvas(
      SHADERPAD_FACE_DEFORMER_OUTPUT_SIZE,
      SHADERPAD_FACE_DEFORMER_OUTPUT_SIZE,
    );
    const displayContext = displayCanvas.getContext('2d');
    if (!displayContext) {
      throw new Error('Unable to create a 2D canvas context for the face deformer output');
    }
    this.displayCanvas = displayCanvas;

    const shader = new ShaderPad(FACE_WARP_FRAGMENT_SHADER, {
      canvas: glCanvas,
      history: HISTORY_FRAMES,
      plugins: [
        face({
          textureName: TEXTURE_NAME,
          options: { maxFaces: this.maxFaces },
        }),
      ],
    });
    shader.initializeUniform(
      'u_controlIndices',
      'int',
      CONTROL_POINTS.map(([landmark]) => landmark),
      { arrayLength: CONTROL_POINTS.length },
    );
    shader.initializeUniform(
      'u_controlTargets',
      'float',
      CONTROL_POINTS.map(([, u, v]) => [u, v]),
      { arrayLength: CONTROL_POINTS.length },
    );
    shader.initializeTexture(TEXTURE_NAME, createDomCanvas(2, 2));
    shader.on('postStep', () => {
      displayContext.drawImage(glCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
    });
    shader.on('face:result', (result: { faceLandmarks?: ArrayLike<unknown> } | null) => {
      setLocalFaceDetected(!!result?.faceLandmarks && result.faceLandmarks.length >= 1);
    });
    this.shader = shader;

    shader.play(() => {
      if (isVideoFrameReady(inputVideo)) {
        shader.updateTextures({ [TEXTURE_NAME]: inputVideo });
      }
    });

    this.outputStream = displayCanvas.captureStream(this.maxFps);
    this.processedTrack = this.outputStream.getVideoTracks()[0];
  }

  async restart(options: VideoProcessorOptions) {
    await this.destroy();
    await this.init(options);
  }

  async destroy() {
    setLocalDeformerActive(false);
    this.outputStream?.getTracks().forEach((track) => track.stop());
    this.shader?.destroy();
    this.shader = undefined;
    this.glCanvas = undefined;
    this.displayCanvas = undefined;
    this.outputStream = undefined;
    this.processedTrack = undefined;
  }
}

export function ShaderPadFaceDeformer(
  options: ShaderPadFaceDeformerOptions = {},
): TrackProcessor<Track.Kind.Video, VideoProcessorOptions> | undefined {
  if (!supportsShaderPadFaceDeformer()) {
    return undefined;
  }

  return new ShaderPadFaceDeformerProcessor(options);
}

let warmUpInstance: ShaderPad | undefined;
let faceReady = false;
const readyListeners = new Set<() => void>();

function markFaceReady() {
  if (faceReady) {
    return;
  }
  faceReady = true;
  readyListeners.forEach((listener) => listener());
}

function subscribeFaceReady(listener: () => void) {
  readyListeners.add(listener);
  return () => {
    readyListeners.delete(listener);
  };
}

export function warmUpFaceDeformer() {
  if (typeof window === 'undefined' || warmUpInstance || faceReady) {
    return;
  }

  if (!supportsShaderPadFaceDeformer()) {
    markFaceReady();
    return;
  }

  try {
    const shader = new ShaderPad(FACE_WARP_FRAGMENT_SHADER, {
      canvas: createDomCanvas(1, 1),
      history: HISTORY_FRAMES,
      plugins: [
        face({
          textureName: TEXTURE_NAME,
          options: { maxFaces: DEFAULT_MAX_FACES },
        }),
      ],
    });
    shader.on('face:ready', markFaceReady);
    warmUpInstance = shader;
  } catch (error) {
    console.error('Unable to warm up the ShaderPad face deformer', error);
    markFaceReady();
  }
}

export function isFaceDeformerReady() {
  return faceReady;
}

export function useFaceDeformerReady() {
  React.useEffect(() => {
    warmUpFaceDeformer();
  }, []);

  return React.useSyncExternalStore(subscribeFaceReady, isFaceDeformerReady, () => true);
}

let localFaceDetected = false;
let localDeformerActive = false;
const faceStateListeners = new Set<() => void>();

function emitFaceState() {
  faceStateListeners.forEach((listener) => listener());
}

function setLocalFaceDetected(detected: boolean) {
  if (localFaceDetected === detected) {
    return;
  }
  localFaceDetected = detected;
  emitFaceState();
}

function setLocalDeformerActive(active: boolean) {
  if (localDeformerActive === active) {
    return;
  }
  localDeformerActive = active;
  if (!active) {
    localFaceDetected = false;
  }
  emitFaceState();
}

function subscribeFaceState(listener: () => void) {
  faceStateListeners.add(listener);
  return () => {
    faceStateListeners.delete(listener);
  };
}

export function isLocalFaceDetected() {
  return localFaceDetected;
}

export function isLocalDeformerActive() {
  return localDeformerActive;
}

export function useLocalFaceDetected() {
  return React.useSyncExternalStore(subscribeFaceState, isLocalFaceDetected, () => false);
}

export function useLocalDeformerActive() {
  return React.useSyncExternalStore(subscribeFaceState, isLocalDeformerActive, () => false);
}
