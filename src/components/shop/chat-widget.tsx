"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi! I'm Claudette's cookie concierge 🍪 Ask me about flavors, ingredients, allergens, or which box to pick.",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // iOS Safari doesn't shrink the layout viewport (vh/dvh) when the on-screen
  // keyboard opens, and `position: fixed` elements don't lift above it — so a
  // height set in vh stays full-size behind the keyboard. Drive the panel's
  // size + position from the VisualViewport API instead, which DOES report the
  // visible area above the keyboard.
  const [vp, setVp] = useState<{ height: number; inset: number } | null>(null);
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // How much of the layout viewport is covered at the bottom (≈ keyboard).
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setVp({ height: vv.height, inset });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [open]);

  // > 120px of bottom inset means the keyboard is up (filters out URL-bar jitter).
  const kbOpen = (vp?.inset ?? 0) > 120;
  // Panel: when the keyboard is up, sit just above it and fill the visible area;
  // otherwise use the default floating size.
  const panelStyle: CSSProperties = kbOpen
    ? { bottom: `${vp!.inset + 8}px`, height: `${vp!.height - 24}px`, maxHeight: "none" }
    : { bottom: "6rem", height: "min(70vh, 32rem)" };
  // Lift the launcher (the close button while open) above the keyboard too, so
  // it stays tappable.
  const launcherStyle: CSSProperties = kbOpen
    ? { bottom: `${vp!.inset + 12}px` }
    : { bottom: "1.25rem" };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    // Add an empty assistant message we'll stream into.
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Don't send the canned greeting to the model.
        body: JSON.stringify({ messages: next.filter((m) => m !== GREETING) }),
      });

      if (!res.ok || !res.body) {
        throw new Error("bad response");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: copy[copy.length - 1].content + chunk,
          };
          return copy;
        });
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Sorry — I couldn't reach the kitchen just now. Please try again in a moment.",
        };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Chat with us"}
        style={launcherStyle}
        className="fixed right-5 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>

      {/* Panel */}
      <div
        className={cn(
          "fixed right-5 z-50 flex w-[min(92vw,24rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        )}
        style={panelStyle}
        aria-hidden={!open}
      >
        <div className="flex items-center gap-2 border-b border-border bg-[hsl(var(--maroon))] px-4 py-3 text-[hsl(var(--pink))]">
          <span className="text-lg">🍪</span>
          <div>
            <p className="font-display text-sm font-semibold leading-tight">Claudette&rsquo;s Concierge</p>
            <p className="text-[11px] opacity-80">Usually replies instantly</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                m.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {m.content || (loading && i === messages.length - 1 ? "…" : "")}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a box, flavor, or allergen…"
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </>
  );
}
