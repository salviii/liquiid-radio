// Cloud Sync — stores each user's library as a JSON text blob on Supabase
// Table: user_libraries (user_id uuid PK, library jsonb, updated_at timestamptz)
//
// SQL to create the table in Supabase:
// ──────────────────────────────────────
// create table public.user_libraries (
//   user_id uuid primary key references auth.users(id) on delete cascade,
//   library jsonb not null default '{}',
//   updated_at timestamptz not null default now()
// );
//
// -- Enable Row Level Security
// alter table public.user_libraries enable row level security;
//
// -- Users can only read/write their own row
// create policy "Users can read own library"
//   on public.user_libraries for select
//   using (auth.uid() = user_id);
//
// create policy "Users can insert own library"
//   on public.user_libraries for insert
//   with check (auth.uid() = user_id);
//
// create policy "Users can update own library"
//   on public.user_libraries for update
//   using (auth.uid() = user_id);
// ──────────────────────────────────────

import { supabase, isSupabaseConfigured } from './supabase'
import type { Track, Playlist } from '../types'

export interface CloudLibrary {
  tracks: Track[]
  playlists: Playlist[]
  theme: string
  accentColor?: string
  updatedAt: number
}

/**
 * Save the user's library to the cloud.
 * Upserts the entire library as a JSON blob.
 */
export async function saveLibraryToCloud(library: CloudLibrary): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('user_libraries')
    .upsert({
      user_id: user.id,
      library: library,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.error('[cloud] Save error:', error.message)
    return false
  }

  console.log('[cloud] Library saved for', user.email)
  return true
}

/**
 * Load the user's library from the cloud.
 * Returns null if not found or not logged in.
 */
export async function loadLibraryFromCloud(): Promise<CloudLibrary | null> {
  if (!isSupabaseConfigured()) return null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_libraries')
    .select('library')
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    if (error?.code !== 'PGRST116') { // PGRST116 = no rows found (first time user)
      console.error('[cloud] Load error:', error?.message)
    }
    return null
  }

  console.log('[cloud] Library loaded for', user.email)
  return data.library as CloudLibrary
}

/**
 * Delete the user's library from the cloud.
 */
export async function deleteCloudLibrary(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('user_libraries')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    console.error('[cloud] Delete error:', error.message)
    return false
  }

  return true
}
