// Reads the website's public settings. When the database isn't connected yet,
// the shop runs in DEMO MODE using the placeholder catalog in src/data/seed.ts.
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
export const IS_DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY
export const MEDIA_BUCKET = 'media'
