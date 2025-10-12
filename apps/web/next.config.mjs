/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/rpc/:path*",
        destination: "http://localhost:8080/:path*",
      },
    ];
  },
};
export default nextConfig;
