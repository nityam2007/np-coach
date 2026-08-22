import type { NextConfig } from "next";

// Public Directus origin (browser loads images from here) — allow it in the CSP.
const DIRECTUS = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";


// In development, React and the HMR/Turbopack runtime need `eval` and a websocket,
// and localhost is served over http — so the CSP is relaxed for dev only. Production
// keeps the strict policy (React never uses eval in production builds).
const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Allows only what the site actually uses:
//   - Stripe, Cloudflare Turnstile/Web Analytics, and consent-gated GA4
//   - Directus for images/assets · self for everything else
// frame-ancestors 'none' + X-Frame-Options block clickjacking. Tighten/remove
// 'unsafe-inline' once inline JSON-LD/styles are nonce'd.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' https://js.stripe.com https://challenges.cloudflare.com https://static.cloudflareinsights.com https://www.googletagmanager.com${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${DIRECTUS} https://www.google-analytics.com`,
  `font-src 'self' data:`,
  `connect-src 'self' ${DIRECTUS} https://api.stripe.com https://challenges.cloudflare.com https://cloudflareinsights.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com${isDev ? " ws: wss: http://localhost:*" : ""}`,
  `frame-src https://js.stripe.com https://challenges.cloudflare.com`,
  `form-action 'self' https://checkout.stripe.com`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  // Only force HTTPS in production — would break http://localhost assets in dev.
  ...(isDev ? [] : [`upgrade-insecure-requests`]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // HSTS only in production (it's meaningless/undesirable on http://localhost).
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // `standalone` keeps the production Docker image small (used at deploy / P7).
  output: "standalone",
  // Allow the dev server to be reached through a tunnel / preview host (dev only;
  // has no effect on production). Add your own hosts here as needed.
  allowedDevOrigins: ["demo3000.nsheth.in", "*.nsheth.in"],
  // Directus serves + resizes media; a custom loader points next/image at it and
  // skips Next's own optimizer (avoids Next 16's private-IP block for the local
  // Directus, and works the same in production against the real Directus host).
  images: {
    loader: "custom",
    loaderFile: "./src/lib/directus-loader.ts",
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920, 2560],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "256kb",
    },
  },
  async redirects() {
    return [
      { source: "/blogs/", destination: "/blog", permanent: true },
      { source: "/76-seat-coaches/", destination: "/72-seat-coaches", permanent: true },
      { source: "/pioneer-secondary-academy/", destination: "/home-to-school/pioneer-secondary-academy", permanent: true },
      { source: "/herschel-grammar-school/", destination: "/home-to-school/herschel-grammar-school", permanent: true },
      { source: "/header/", destination: "/", permanent: true },
      { source: "/cart/", destination: "/daily-express-service/book", permanent: true },
      { source: "/checkout/", destination: "/daily-express-service/book", permanent: true },
      { source: "/shop/", destination: "/daily-express-service/book", permanent: true },
      { source: "/home-to-school-terms-and-conditions/", destination: "/terms", permanent: true },
    ];
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
