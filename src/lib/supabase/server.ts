import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * Route handler / server component icinden, oturum acmis kullanicinin
 * kimligiyle calisan Supabase client'i. RLS her zaman devrede kalir.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component icinden cagrilirsa cookie yazilamaz; middleware
            // session yenilemesini zaten yapiyor, bu durum guvenle yok sayilabilir.
          }
        },
      },
    }
  );
}

/**
 * Service-role client: yalnizca sunucu-taraf, kullanici oturumu OLMAYAN
 * arka plan islerinde (busy cache yenileme, AI analiz worker'i vb.) kullanilir.
 * RLS'i bypass eder; asla client'a veya loglara sizdirilmemeli.
 */
export function createSupabaseServiceRoleClient() {
  return createClient<Database>(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
