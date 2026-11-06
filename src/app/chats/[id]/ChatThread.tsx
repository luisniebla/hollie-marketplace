"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions/messages";
import type { Message } from "@/lib/types";
import { ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export default function ChatThread({
  threadId,
  userId,
  names,
  initialMessages,
}: {
  threadId: string;
  userId: string;
  names: Record<string, string>;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);
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
    // Scroll only the message list; scrollIntoView would also scroll the page.
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: hasScrolled.current ? "smooth" : "instant" });
    hasScrolled.current = true;
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    const text = body.trim();
    setBody("");
    const result = await sendMessage({ threadId, body: text });
    setSending(false);
    if (!result.ok) {
      setBody(text);
      toast.error(result.error);
      return;
    }
    setMessages((prev) =>
      prev.some((x) => x.id === result.data.id) ? prev : [...prev, result.data],
    );
  }

  return (
    <Card className="gap-0 rounded-3xl py-0 ring-border">
      <div ref={scrollRef} className="flex h-[60vh] flex-col gap-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="m-auto text-center text-sm text-muted-foreground">
            Say hello, and figure out a good time to swing by for a snip.
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === userId;
          // Group consecutive messages: avatar sits beside the last one in a run.
          const startsRun = messages[i - 1]?.sender_id !== m.sender_id;
          const endsRun = messages[i + 1]?.sender_id !== m.sender_id;
          const name = names[m.sender_id] ?? "Neighbor";
          return (
            <div
              key={m.id}
              className={cn("flex items-end gap-2", mine && "flex-row-reverse", startsRun && i > 0 && "mt-3")}
            >
              {endsRun ? (
                <Avatar size="sm" title={name}>
                  <AvatarFallback
                    className={cn(
                      "font-heading",
                      mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div aria-hidden className="size-6 shrink-0" />
              )}
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2 leading-snug whitespace-pre-wrap",
                  mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                  endsRun && (mine ? "rounded-br-sm" : "rounded-bl-sm"),
                )}
              >
                {m.body}
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="border-t bg-muted/40 p-3">
        <InputGroup>
          <InputGroupInput
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message"
            aria-label="Message"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-xs"
              disabled={sending || !body.trim()}
              aria-label="Send"
            >
              <ArrowUp />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </Card>
  );
}
