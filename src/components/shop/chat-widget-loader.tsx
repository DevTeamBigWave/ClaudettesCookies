"use client";

import dynamic from "next/dynamic";

// The chat panel is hidden until the user opens it, so keep its JS (and the
// lucide icons + streaming-fetch logic) out of every page's first load and
// fetch it on the client after hydration instead.
const ChatWidget = dynamic(
  () => import("./chat-widget").then((m) => m.ChatWidget),
  { ssr: false },
);

export function ChatWidgetLoader() {
  return <ChatWidget />;
}
