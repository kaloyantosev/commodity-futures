/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // In Next.js 15, serverExternalPackages is stable (no longer under experimental)
  serverExternalPackages: ['yahoo-finance2'],
};

export default nextConfig;
