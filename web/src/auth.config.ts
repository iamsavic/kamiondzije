import type { NextAuthConfig } from "next-auth";

// Ova konfiguracija se koristi samo u middleware-u (Edge Runtime)
// Ne sme sadrzati Node.js-only zavisnosti (bcrypt, pg, itd.)
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname.startsWith("/login");

      if (isLoginPage) {
        if (isLoggedIn)
          return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      if (nextUrl.pathname === "/") {
        if (isLoggedIn)
          return Response.redirect(new URL("/dashboard", nextUrl));
        return Response.redirect(new URL("/login", nextUrl));
      }

      if (!isLoggedIn) return false;
      return true;
    },
  },
  providers: [],
};
