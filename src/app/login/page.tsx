"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const FAKE_EMAIL_DOMAIN = "herbswap.local";

function usernameToEmail(username: string) {
  return `${username.toLowerCase()}@${FAKE_EMAIL_DOMAIN}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!USERNAME_RE.test(username)) {
      setError("Username must be 3–20 letters, numbers, or underscores.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const email = usernameToEmail(username);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: username } },
      });
      if (error) {
        setLoading(false);
        setError(
          error.message.toLowerCase().includes("registered")
            ? "That username is taken. Try another."
            : error.message
        );
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        setError("Wrong username or password.");
        return;
      }
    }

    router.refresh();
    router.push("/");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border-2 border-cream-deep bg-white p-8">
      <div>
        <h1 className="font-serif text-2xl font-bold text-forest-deep">
          {mode === "signin" ? "Welcome back 🌿" : "Join us 🌱"}
        </h1>
        <p className="mt-1 text-sm text-bark-soft">
          {mode === "signin"
            ? "Sign in with your username and password."
            : "Pick a username and password — that's it."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-full border-2 border-cream-deep bg-cream p-1">
        <button
          type="button"
          onClick={() => { setMode("signin"); setError(null); }}
          className={`rounded-full py-2 text-sm font-semibold transition ${
            mode === "signin" ? "bg-forest text-cream" : "text-bark-soft"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => { setMode("signup"); setError(null); }}
          className={`rounded-full py-2 text-sm font-semibold transition ${
            mode === "signup" ? "bg-forest text-cream" : "text-bark-soft"
          }`}
        >
          Create account
        </button>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-bark">Username</span>
        <input
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
          placeholder="rosemary_lover"
          className="w-full rounded-full border-2 border-cream-deep bg-cream px-5 py-3 text-base focus:border-forest focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-bark">Password</span>
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-full border-2 border-cream-deep bg-cream px-5 py-3 text-base focus:border-forest focus:outline-none"
        />
      </label>

      {error && <p className="text-sm text-clay-deep">{error}</p>}

      <button
        disabled={loading}
        className="w-full rounded-full bg-forest px-5 py-4 text-base font-bold text-cream shadow-sm transition hover:bg-forest-deep disabled:opacity-60"
      >
        {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
