import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Table name for songs
export const SONGS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_SONGS_TABLE || "music_archive";

// Table name for listening sessions
export const LISTENING_TABLE = "listening_sessions";

export const startListeningSession = async (sessionId) => {
  return supabase.from(LISTENING_TABLE).insert({ session_id: sessionId });
};

export const endListeningSession = async (sessionId) => {
  return supabase.from(LISTENING_TABLE).delete().eq("session_id", sessionId);
};

export const subscribeToListenerCount = (callback) => {
  return supabase
    .channel("listening_count")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: LISTENING_TABLE },
      callback
    )
    .subscribe();
};
