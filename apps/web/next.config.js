/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@loyalty/shared'],
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;
