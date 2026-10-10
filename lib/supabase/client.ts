import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xaqbisnaetgsjiortzgi.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhcWJpc25hZXRnc2ppb3J0emdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MjM3MTQsImV4cCI6MjEwNzE5OTcxNH0.3lpphpqY2QkMu5k6RMqa7GYU25n4FxY_0ugnETB7Zww";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


    