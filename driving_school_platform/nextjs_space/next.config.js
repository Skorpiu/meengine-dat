/** @type {import('next').NextConfig} */
const nextConfig = {
  // Usa os defaults do Next/Vercel
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
