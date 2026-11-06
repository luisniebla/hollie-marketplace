"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { startThread } from "@/app/actions/threads";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function StartChatButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    const result = await startThread({ postId });
    if (!result.ok) {
      if (result.error === "Not signed in.") {
        router.push("/login");
        return;
      }
      toast.error(result.error);
      setLoading(false);
      return;
    }
    router.push(`/chats/${result.data.threadId}`);
  }

  return (
    <Button size="lg" className="w-full" onClick={start} disabled={loading}>
      {loading ? <Spinner data-icon="inline-start" /> : <MessageCircle data-icon="inline-start" />}
      Message
    </Button>
  );
}
