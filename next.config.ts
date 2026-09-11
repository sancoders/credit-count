import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Pin the workspace root. Without it Turbopack walks up looking for a lockfile
  // and can find an unrelated one outside the repository, which changes how
  // modules resolve between a local build and Vercel's.
  turbopack: { root: __dirname },
}

export default nextConfig
