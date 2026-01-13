import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // External packages that should not be bundled
  serverExternalPackages: ["unpdf", "pdfkit", "mammoth"],

  // Turbopack configuration
  turbopack: {},

  // Image configuration - restricted to known trusted domains
  images: {
    remotePatterns: [
      // Supabase storage
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      // Job board company logos
      {
        protocol: "https",
        hostname: "remotive.com",
      },
      {
        protocol: "https",
        hostname: "*.remotive.com",
      },
      {
        protocol: "https",
        hostname: "remoteok.com",
      },
      {
        protocol: "https",
        hostname: "*.remoteok.com",
      },
      {
        protocol: "https",
        hostname: "www.themuse.com",
      },
      {
        protocol: "https",
        hostname: "*.themuse.com",
      },
      // Common CDN for company logos
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
      },
    ],
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // Content Security Policy - prevents XSS and data injection
            // Adjust as needed for your specific requirements
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
              "style-src 'self' 'unsafe-inline'", // Required for styled components
              "img-src 'self' data: https://*.supabase.co https://remotive.com https://*.remotive.com https://remoteok.com https://*.remoteok.com https://*.themuse.com https://logo.clearbit.com",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://openrouter.ai https://remotive.com https://remoteok.com https://www.themuse.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ]
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
}

export default nextConfig
