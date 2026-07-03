import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://obazytoxsbrhfwmcvpsa.supabase.co";
const supabaseAnonKey = "sb_publishable_x15UfHZNzbxCMTAWn3bLlA_29N5LguY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
