"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setPostStatus } from "@/app/admin/(panel)/actions";

export function PostStatusToggle({ id, status }: { id: string; status: "draft" | "published" }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={status === "published" ? "ghost" : "secondary"}
      disabled={pending}
      onClick={() => start(() => setPostStatus(id, status === "published" ? "draft" : "published"))}
    >
      {status === "published" ? "Unpublish" : "Publish"}
    </Button>
  );
}
