/** @type {import('next').NextConfig} */
const nextConfig = {
  // Usa os defaults do Next/Vercel
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;