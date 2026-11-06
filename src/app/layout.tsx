import type { Metadata, Viewport } from "next";
import { Crimson_Pro, Patrick_Hand } from "next/font/google";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import UserMenu from "@/components/UserMenu";
import ThemeProvider from "@/components/ThemeProvider";
import { Flourish, LeafMark, Sprig, WaveTop } from "@/components/Botanicals";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const crimson = Crimson_Pro({
  subsets: ["latin"],
  variable: "--font-crimson",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});
const patrick = Patrick_Hand({ subsets: ["latin"], variable: "--font-patrick", weight: "400" });

export const metadata: Metadata = {
  title: "Herb Swap · Phoenix",
  description: "Share and request herbs with neighbors in Phoenix, AZ.",
};

export const viewport: Viewport = {
  themeColor: "#f9f6ef",
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
    <html
      lang="en"
      className={cn("antialiased", crimson.variable, patrick.variable)}
      suppressHydrationWarning
    >
      <body className="relative flex min-h-screen flex-col overflow-x-clip">
        <ThemeProvider>
          <WaveTop className="top-0 right-0 h-28 w-[78%] sm:h-36 sm:w-[60%]" />
          <header className="relative z-10">
            <nav className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
              <Link href="/" className="flex items-center gap-2">
                <LeafMark />
                <span className="flex flex-col leading-none">
                  <span className="font-heading text-2xl text-pine">Herb Swap</span>
                  <span className="font-heading text-sm text-rose-deep">sprigs, seeds &amp; swaps</span>
                </span>
              </Link>
              <div className="flex items-center gap-1">
                {user ? (
                  <>
                    <Button asChild variant="ghost" className="hidden font-heading text-lg sm:inline-flex">
                      <Link href="/">Browse</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/new">Share</Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon" aria-label="Messages">
                      <Link href="/chats">
                        <MessageCircle className="size-5" />
                      </Link>
                    </Button>
                    <UserMenu displayName={displayName ?? "you"} email={user.email ?? null} />
                  </>
                ) : (
                  <Button asChild>
                    <Link href="/login">Sign in</Link>
                  </Button>
                )}
              </div>
            </nav>
          </header>
          <main className="relative z-0 mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-20">{children}</main>
          <footer className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-4 pb-10 text-center">
            <Sprig className="w-14 opacity-80" />
            <Flourish />
            <p className="font-heading text-xl text-pine">Grown &amp; shared in Phoenix, AZ</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Swaps are for kitchen and garden use. Nothing here is medical advice. Be kind, wash
              your greens.
            </p>
          </footer>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
