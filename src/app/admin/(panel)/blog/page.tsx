import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, DataTable, StatusPill } from "@/components/admin/ui";
import { PostForm } from "@/components/admin/post-form";
import { PostStatusToggle } from "@/components/admin/post-status-toggle";
import { GeneratePostButton } from "@/components/admin/generate-post-button";
import { formatDate } from "@/lib/utils";
import { env } from "@/lib/env";
import type { BlogPost, BlogGenerationJob } from "@/types/db";

export default async function BlogAdmin() {
  const db = createAdminClient();
  const [{ data: posts }, { data: job }] = await Promise.all([
    db.from("blog_posts").select("*").order("created_at", { ascending: false }),
    db
      .from("blog_generation_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <>
      <PageHeader
        title="Journal"
        description="Write and publish blog posts — or let Claude draft this week's."
        action={
          <GeneratePostButton
            enabled={Boolean(env.ANTHROPIC_API_KEY)}
            initialJob={(job as BlogGenerationJob) ?? null}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,460px)]">
        <DataTable columns={["Title", "Status", "Tags", "Updated", ""]}>
          {((posts as BlogPost[]) ?? []).map((p) => (
            <tr key={p.id} className="hover:bg-secondary/40">
              <td className="min-w-[220px] px-4 py-3">
                {p.status === "published" ? (
                  // Published → open the live post; draft → admin view of the copy.
                  <a
                    href={`/blog/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:text-primary"
                  >
                    {p.title}
                  </a>
                ) : (
                  <Link href={`/admin/blog/${p.id}`} className="font-medium hover:text-primary">
                    {p.title}
                  </Link>
                )}
              </td>
              <td className="px-4 py-3"><StatusPill status={p.status} /></td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{p.tags.join(", ") || "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(p.updated_at)}</td>
              <td className="px-4 py-3 text-right"><PostStatusToggle id={p.id} status={p.status} /></td>
            </tr>
          ))}
          {(!posts || posts.length === 0) && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No posts yet.</td></tr>
          )}
        </DataTable>
        <PostForm />
      </div>
    </>
  );
}
