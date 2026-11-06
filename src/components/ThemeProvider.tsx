"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// The parchment palette is light-only; this mainly keeps sonner's theme in sync.
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" forcedTheme="light" disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
