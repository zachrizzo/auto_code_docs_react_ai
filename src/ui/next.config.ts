/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure public directory is properly served
  // and that the docs-data folder is accessible
  async rewrites() {
    return [
      {
        source: "/docs-data/:path*",
        destination: "/docs-data/:path*",
      },
    ];
  },
};

export default nextConfig;
