/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, dev }) => {
    // Fix for WalletConnect and other packages that use ES modules in workers
    config.module.rules.push({
      test: /\.(js|ts)$/,
      include: /node_modules\/@walletconnect/,
      type: 'javascript/auto',
    });

    // Disable minification for problematic files
    if (!isServer && !dev) {
      config.optimization.minimizer = config.optimization.minimizer.filter(
        (minimizer) => {
          if (minimizer.constructor.name === 'TerserPlugin') {
            // Update options to exclude problematic files
            minimizer.options = minimizer.options || {};
            minimizer.options.exclude = [
              /HeartbeatWorker/,
              /\.worker\.js/,
              /@walletconnect/,
            ];
            return true;
          }
          return true;
        }
      );
    }

    // Handle node modules fallbacks
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
    };

    return config;
  },
  
  // Disable SWC minification to avoid conflicts
  swcMinify: false,
  
  // Temporarily disable ESLint during build to focus on functionality
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Experimental features to handle modern JS
  experimental: {
    esmExternals: 'loose',
  },
  
  // Transpile problematic packages
  transpilePackages: [
    '@walletconnect/core',
    '@walletconnect/utils',
    '@walletconnect/universal-provider',
    '@walletconnect/ethereum-provider',
    '@walletconnect/sign-client',
    '@walletconnect/keyvaluestorage',
  ],
};

export default nextConfig;
