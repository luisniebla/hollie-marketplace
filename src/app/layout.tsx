import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Herb Swap · Phoenix",
  description: "Share and request herbs with neighbors in Phoenix, AZ.",
};

export const viewport: Viewport = {
  themeColor: "#faf5e6",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let displayName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    displayName = profile?.display_name ?? user.email?.split("@")[0] ?? null;
  }

  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable}`}>
      <body className="min-h-screen">
        <header className="sticky top-0 z-10 border-b border-cream-deep bg-cream/95 backdrop-blur">
          <nav className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-serif text-2xl font-bold text-forest-deep">
              <span aria-hidden>🌿</span>
              <span>Herb Swap</span>
            </Link>
            <div className="flex items-center gap-2 text-sm">
              {user ? (
                <>
                  <Link
                    href="/chats"
                    className="rounded-full px-3 py-2 font-semibold text-forest-deep hover:bg-cream-deep"
                    aria-label="Chats"
                  >
                    💬
                  </Link>
                  <span
                    className="rounded-full bg-leaf/30 px-3 py-1.5 text-sm font-bold text-forest-deep"
                    title="Signed in"
                  >
                    @{displayName}
                  </span>
                  <SignOutButton />
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-full bg-forest px-4 py-2 font-semibold text-cream shadow-sm transition hover:bg-forest-deep"
                >
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-xl px-4 pb-28 pt-5">{children}</main>
        {user && (
          <Link
            href="/new"
            className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-clay px-6 py-4 text-base font-bold text-cream shadow-lg shadow-clay/30 transition hover:bg-clay-deep"
          >
            <span aria-hidden className="text-xl leading-none">+</span>
            New post
          </Link>
        )}
        <footer className="mx-auto max-w-xl px-4 pb-6 text-center text-xs text-bark-soft">
          🌵 Phoenix, AZ · be kind, share herbs
        </footer>
      </body>
    </html>
  );
}
