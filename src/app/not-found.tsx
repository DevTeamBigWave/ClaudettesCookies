import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="text-6xl">🍪</p>
      <h1 className="mt-4 font-display text-4xl font-semibold">This crumb doesn&rsquo;t exist</h1>
      <p className="mt-2 text-muted-foreground">The page you&rsquo;re after has been eaten.</p>
      <Button asChild className="mt-6">
        <Link href="/">Back to the shop</Link>
      </Button>
    </div>
  );
}
