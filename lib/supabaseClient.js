// lib/supabaseClient.js
"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export const supabase = createClientComponentClient();
