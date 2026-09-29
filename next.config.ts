import type { NextConfig } from "next";

// Derive protocol/hostname/port from the actual configured URL rather than
// assuming "https" — local dev's Supabase (NEXT_PUBLIC_SUPABASE_URL =
// http://127.0.0.1:54321) serves storage over plain HTTP on a non-default
// port, and next/image's remotePatterns match on protocol+hostname+port
// together. Hardcoding "https" here meant any avatar/room-image URL coming
// from local Supabase storage was silently rejected by next/image — the
// error only ever showed up once something actually rendered a real
// uploaded image (e.g. the navbar avatar, once a profile has one), not at
// build time, so it was easy for this to go unnoticed until then.
//
// This alone isn't enough to make local avatars render, though: Next 16.3.0
// has a known regression (vercel/next.js#88873) where /_next/image rejects
// an otherwise-matching remotePattern anyway ("url parameter is not
// allowed"), reproduced locally against 127.0.0.1 specifically — smells
// like the same aggressive loopback/SSRF-style filtering the issue
// describes for other hosts. Every <Image> pointed at a Supabase Storage
// URL must pass `unoptimized` until that's fixed upstream (see
// AccountAvatar in Navbar.tsx and PhotoUpload.tsx) — this config fix is
// still correct to keep regardless, since it'll make images work
// automatically the day Next fixes the regression, with no code changes.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : undefined;

const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,
  serverExternalPackages: ["nodemailer"],
  images: {
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
            hostname: supabaseUrl.hostname,
            port: supabaseUrl.port,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
