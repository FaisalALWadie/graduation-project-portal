import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/register"];

// This used to also fetch the caller's profile/role on every single
// authenticated request, purely to redirect wrong-role visitors and
// bounce already-logged-in users away from /login. That was a fully
// redundant database round trip: every dashboard page already does
// its own hard requireRole()/requireProfile() check (Next 16's own
// proxy.md explicitly warns against relying on Proxy alone for
// authorization), and /login and /register now do their own light
// redirectIfAuthenticated() check directly. Removing it here cuts one
// full round trip (real cost, given the database is in a different
// region from the app server) from every single navigation, without
// weakening any actual security boundary - the hard checks are
// unchanged.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
