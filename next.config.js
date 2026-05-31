const missingSourceMapPackages = [
  /node_modules[\\/]@mediapipe[\\/]tasks-vision[\\/]/,
  /node_modules[\\/]\\.pnpm[\\/]@mediapipe\+tasks-vision@[^\\/]+[\\/]node_modules[\\/]@mediapipe[\\/]tasks-vision[\\/]/,
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  productionBrowserSourceMaps: true,
  images: {
    formats: ['image/webp'],
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    config.module.rules.push({
      test: /\.svg$/,
      issuer: /\.[jt]sx?$/,
      resourceQuery: { not: [/__next_metadata__/] },
      use: ['@svgr/webpack'],
    });

    // Important: return the modified config
    config.module.rules.push({
      test: /\.mjs$/,
      enforce: 'pre',
      use: [
        {
          loader: 'source-map-loader',
          options: {
            filterSourceMappingUrl: (_url, resourcePath) => {
              if (missingSourceMapPackages.some((pattern) => pattern.test(resourcePath))) {
                return false;
              }

              return true;
            },
          },
        },
      ],
    });

    return config;
  },
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
