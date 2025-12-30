const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Resolve the symlinked package
    config.resolve.symlinks = true;
    config.resolve.alias = {
      ...config.resolve.alias,
      'next-markdown-middleware': path.resolve(__dirname, '../../dist'),
    };
    return config;
  },
};

module.exports = nextConfig;
