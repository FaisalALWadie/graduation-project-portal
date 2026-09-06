import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/register"];

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

  // Soft UX-layer role routing. This is NOT the security boundary — RLS
  // enforces data access, and each Server Component re-checks the role
  // itself via requireRole() (see lib/auth/require-role.ts and the Next
  // 16 proxy.md guidance against relying on Proxy alone for authz).
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const roleHome = profile
      ? profile.role === "admin"
        ? "/admin"
        : profile.role === "advisor"
          ? "/advisor"
          : "/student"
      : "/login";

    if (isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }

    const roleAreas = ["/admin", "/advisor", "/student"];
    const inWrongRoleArea = roleAreas.some(
      (area) =>
        request.nextUrl.pathname.startsWith(area) &&
        !request.nextUrl.pathname.startsWith(roleHome),
    );
    if (inWrongRoleArea) {
      const url = request.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
