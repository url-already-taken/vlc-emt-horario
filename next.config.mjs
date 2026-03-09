import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js"

let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

export default function createConfig(phase) {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next/dev" : ".next/build",
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    images: {
      unoptimized: true,
    },
  }

  mergeConfig(nextConfig, userConfig)

  return nextConfig
}

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}
