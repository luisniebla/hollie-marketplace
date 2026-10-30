"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions/messages";
import type { Message } from "@/lib/types";

export default function ChatThread({
  threadId,
  userId,
  initialMessages,
}: {
  threadId: string;
  userId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`thread:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          setMessages((prev) => {
            const m = payload.new as Message;
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    const text = body.trim();
    setBody("");
    const result = await sendMessage({ threadId, body: text });
    setSending(false);
    if (!result.ok) {
      setBody(text);
      setError(result.error);
      return;
    }
    setMessages((prev) =>
      prev.some((x) => x.id === result.data.id) ? prev : [...prev, result.data],
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-[60vh] flex-col gap-2 overflow-y-auto rounded-3xl border-2 border-cream-deep bg-white p-4">
        {messages.length === 0 && (
          <p className="m-auto text-center text-sm text-bark-soft">
            👋 Say hello to coordinate a pickup.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-3xl px-4 py-2.5 text-base leading-snug ${
                  mine
                    ? "rounded-br-md bg-forest text-cream"
                    : "rounded-bl-md bg-cream-deep text-bark"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {error && <p className="text-center text-sm text-clay-deep">{error}</p>}
      <form onSubmit={send} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full border-2 border-cream-deep bg-white px-5 py-3 text-base focus:border-forest focus:outline-none"
        />
        <button
          disabled={sending || !body.trim()}
          className="rounded-full bg-clay px-5 py-3 font-bold text-cream transition hover:bg-clay-deep disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
