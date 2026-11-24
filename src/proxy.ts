import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/faculty/login") return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("placeholder")) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .single();
  if (error || !profile || profile.account_status !== "ACTIVE") {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=profile", request.url));
  }

  const path = request.nextUrl.pathname;
  const authorized =
    path.startsWith("/admin/")
      ? profile.role === "SUPER_ADMIN"
      : path.startsWith("/faculty/")
        ? profile.role === "FACULTY" || profile.role === "SUPER_ADMIN"
        : profile.role === "STUDENT";
  if (!authorized) {
    const destination = profile.role === "SUPER_ADMIN" ? "/admin/dashboard" : profile.role === "FACULTY" ? "/faculty/dashboard" : "/student/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/faculty/:path*"],
};
