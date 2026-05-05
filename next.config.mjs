/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "https://hospital-management-system.vercel.app/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
