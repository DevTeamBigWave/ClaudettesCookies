import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/data/posts";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.seo_title ?? post.title,
    description: post.seo_description ?? post.excerpt ?? undefined,
  };
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="container-prose py-14">
      <Link href="/blog" className="text-sm font-medium text-primary hover:underline">
        ← Back to the Journal
      </Link>
      <header className="mt-6">
        <h1 className="font-display text-4xl font-semibold leading-tight">{post.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {post.published_at ? formatDate(post.published_at) : ""} · {post.author_name}
        </p>
      </header>
      <div
        className="prose mt-8 max-w-none space-y-5 leading-relaxed [&_a]:text-primary [&_a]:underline [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
      />
    </article>
  );
}
