/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.8.118"],

  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "https://hospital-managemnt-system.vercel.app/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
