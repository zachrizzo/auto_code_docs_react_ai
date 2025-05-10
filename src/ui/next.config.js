/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable static exports to ensure CSS works properly in dev mode
  // output: 'export', 
  // Configure CSS bundling
  transpilePackages: [],
  // Ensure CSS is properly bundled
  webpack: (config) => {
    return config;
  },
  // Ensure public directory is properly served
  // and that the docs-data folder is accessible
  async rewrites() {
    return [
      {
        source: "/docs-data/:path*",
        destination: "http://localhost:4000/docs-data/:path*",
      },
    ];
  },
  // Prevent Next.js from processing API routes as its own internal routes
  async headers() {
    return [
      {
        source: '/docs-data/:path*',
        headers: [
          { key: 'Content-Type', value: 'application/json' }
        ],
      },
    ];
  }
};

module.exports = nextConfig;
