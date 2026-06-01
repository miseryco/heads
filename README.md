# Heads

**Face-first video conferencing.** Heads uses advanced facial utilization technology to bring people closer. Our calls guarantee more face per face.

Heads is a video conferencing app built on [LiveKit Components](https://github.com/livekit/components-js),
[LiveKit Cloud](https://cloud.livekit.io/), [ShaderPad](https://www.npmjs.com/package/shaderpad), and
Next.js. Each participant’s camera runs through a real-time WebGL face-stretch filter powered by
MediaPipe face landmarks.

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router)
- [@livekit/components-react](https://github.com/livekit/components-js/) for the realtime UI
- [ShaderPad](https://www.npmjs.com/package/shaderpad) + its `face` plugin for the on-device face filter

## Dev Setup

1. Run `pnpm install` to install all dependencies.
2. Copy `.env.example` in the project root and rename it to `.env.local`.
3. Update the missing environment variables in the newly created `.env.local` file.
4. Run `pnpm dev` to start the development server and visit [http://localhost:3000](http://localhost:3000).
5. Start development 🎉
