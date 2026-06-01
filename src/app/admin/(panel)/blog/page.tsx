import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, DataTable, StatusPill } from "@/components/admin/ui";
import { PostForm } from "@/components/admin/post-form";
import { PostStatusToggle } from "@/components/admin/post-status-toggle";
import { formatDate } from "@/lib/utils";
import type { BlogPost } from "@/types/db";

export default async function BlogAdmin() {
  const db = createAdminClient();
  const { data: posts } = await db
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Journal" description="Write and publish blog posts." />
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,460px)]">
        <DataTable columns={["Title", "Status", "Tags", "Updated", ""]}>
          {((posts as BlogPost[]) ?? []).map((p) => (
            <tr key={p.id} className="hover:bg-secondary/40">
              <td className="px-4 py-3">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground">/blog/{p.slug}</div>
              </td>
              <td className="px-4 py-3"><StatusPill status={p.status} /></td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{p.tags.join(", ") || "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(p.updated_at)}</td>
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
