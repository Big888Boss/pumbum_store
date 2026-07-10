/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  async redirects() {
    // Legacy (pre-2026-07-05) URL structure: brand-first catalog and
    // /product/<article> pages are indexed by search engines; map them to
    // the closest v2 equivalents instead of returning 404.
    const legacyBrands = ['valtec', 'sinikon', 'aquario', 'gidrokontrakt', 'vivaldo', 'aquatec', 'zota'];
    return [
      ...legacyBrands.flatMap((brand) => [
        { source: `/catalog/${brand}`, destination: `/search?q=${brand}`, permanent: true },
        { source: `/catalog/${brand}/:path*`, destination: `/search?q=${brand}`, permanent: true },
      ]),
      { source: '/product/:article', destination: '/search?q=:article', permanent: true },
      { source: '/changelog', destination: '/about', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'valtec.ru' },
      { protocol: 'https', hostname: 'aquario.ru' },
      { protocol: 'https', hostname: 'gidrokontrakt.ru' },
      { protocol: 'https', hostname: 'zota.ru' }
    ]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
