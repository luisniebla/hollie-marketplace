"use client";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await createClient().auth.signOut();
        router.refresh();
        router.push("/");
      }}
      className="rounded-full px-3 py-2 text-bark-soft hover:bg-cream-deep"
    >
      Sign out
    </button>
  );
}
