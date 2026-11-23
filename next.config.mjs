// This release candidate is a fictional demo in every build environment.
// Explicit empty replacements keep inherited public credentials out of its bundle.
const nextConfig = {
    distDir: process.env.NEXT_DIST_DIR || '.next',
    experimental: {
      cpus: 1,
    },
    webpack: (config) => {
      config.cache = false;
      return config;
    },
    env: {
      NEXT_PUBLIC_BRIGHTCAMP_PREVIEW_LOCK: process.env.NEXT_PUBLIC_BRIGHTCAMP_PREVIEW_LOCK || 'false',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
    },
};

export default nextConfig;
