/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.replicate.delivery', pathname: '/**' },
      { protocol: 'https', hostname: 'replicate.delivery', pathname: '/**' },
      { protocol: 'https', hostname: 'gateway.pinata.cloud', pathname: '/ipfs/**' },
    ],
  },
  webpack: (config) => {
    // wagmi optional connectors that may not be installed
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'porto/internal': false,
      'porto': false,
      '@metamask/sdk': false,
    };
    return config;
  },
};

module.exports = nextConfig;
