import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a single Supabase client instance with realtime options
export const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
        params: {
            eventsPerSecond: 10
        },
        timeout: 30000, // Increase timeout to 30 seconds
        heartbeat: {
            interval: 15000, // Send heartbeat every 15 seconds
            maxRetries: 3    // Retry 3 times before considering connection dead
        }
    },
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// Initialize realtime client
supabase.realtime.setAuth(supabaseKey);

export default supabase; 