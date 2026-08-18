export function getPublicStorageUrl(bucket: string, path: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

// Fixed design assets (not user data) that only exist in the cloud project's
// storage — e.g. the auth pages' hero image. Points there regardless of
// which Supabase instance (local or cloud) NEXT_PUBLIC_SUPABASE_URL is
// currently set to, so it always resolves without needing the file synced
// into every local dev instance too.
const CLOUD_SUPABASE_URL = "https://rhmfozmfmhrhswfzrkua.supabase.co";

export function getCloudAssetUrl(bucket: string, path: string): string {
  return `${CLOUD_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
