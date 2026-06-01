"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createPost } from "@/app/admin/(panel)/actions";

export function PostForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        start(async () => {
          setError(null);
          const res = await createPost(fd);
          if (res?.error) setError(res.error);
          else formRef.current?.reset();
        })
      }
      className="rounded-2xl border border-border bg-card p-5"
    >
      <h2 className="font-display text-lg font-semibold">New post</h2>
      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="excerpt">Excerpt</Label>
          <Input id="excerpt" name="excerpt" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="body">Body (Markdown)</Label>
          <Textarea id="body" name="body" required rows={10} className="mt-1.5 font-mono text-sm" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input id="tags" name="tags" placeholder="story, flavors" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Publish now</option>
            </select>
          </div>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" className="mt-4" disabled={pending}>
        {pending ? "Saving…" : "Save post"}
      </Button>
    </form>
  );
}
