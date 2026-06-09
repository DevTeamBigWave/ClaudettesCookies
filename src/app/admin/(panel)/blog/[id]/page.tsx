import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderMarkdown } from "@/lib/markdown";
import { PageHeader, StatusPill } from "@/components/admin/ui";
import { PostStatusToggle } from "@/components/admin/post-status-toggle";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { BlogPost } from "@/types/db";

export default async function BlogPostView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();
  const { data } = await db.from("blog_posts").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const post = data as BlogPost;

  return (
    <>
      <Link
        href="/admin/blog"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" /> All posts
      </Link>
      <PageHeader
        title={post.title}
        description={`${post.tags.join(", ") || "No tags"} · Updated ${formatDate(post.updated_at)}`}
        action={
          <div className="flex items-center gap-3">
            {post.status === "published" && (
              <Button asChild variant="outline">
                <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" /> View live
                </a>
              </Button>
            )}
            <PostStatusToggle id={post.id} status={post.status} />
            <StatusPill status={post.status} />
          </div>
        }
      />

      <article className="max-w-3xl rounded-2xl border border-border bg-card p-6 sm:p-8">
        {post.excerpt && <p className="mb-6 text-lg text-muted-foreground">{post.excerpt}</p>}
        <div
          className="prose max-w-none space-y-5 leading-relaxed [&_a]:text-primary [&_a]:underline [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_li]:pl-1"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
        />
      </article>
    </>
  );
}
