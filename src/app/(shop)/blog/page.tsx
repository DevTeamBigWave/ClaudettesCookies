import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/data/posts";
import { formatDate } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Journal",
  description: "Stories from the Claudette's kitchen — flavors, ingredients, and the people behind the box.",
};

export default async function BlogIndex() {
  const posts = await getPublishedPosts();

  return (
    <div className="container py-14">
      <header className="mb-12 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold">The Journal</h1>
        <p className="mt-3 text-muted-foreground">
          Stories from the kitchen — flavors, ingredients, and the people behind the box.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet. Check back soon.</p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <div className="mb-3 flex flex-wrap gap-2">
                {post.tags.slice(0, 2).map((t) => (
                  <span key={t} className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {t}
                  </span>
                ))}
              </div>
              <h2 className="font-display text-xl font-semibold leading-snug group-hover:text-primary">
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
              )}
              <p className="mt-4 text-xs text-muted-foreground">
                {post.published_at ? formatDate(post.published_at) : ""} · {post.author_name}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
