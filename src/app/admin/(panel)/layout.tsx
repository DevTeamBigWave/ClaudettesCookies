import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { MobileAdminNav } from "@/components/admin/mobile-nav";

export const dynamic = "force-dynamic"; // admin is always live data

// Private area — never index, never follow (also auth-gated + robots-disallowed).
export const metadata = { robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <AdminSidebar />
      {/* min-w-0 lets this column shrink to the viewport so wide children (e.g.
          the orders table) scroll inside their own box instead of stretching the
          whole layout past the screen edge. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <MobileAdminNav />
            <Link
              href="/"
              className="flex items-center gap-1.5 truncate text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="size-4 shrink-0" />
              <span className="truncate">Back to website</span>
            </Link>
          </div>
          <div className="shrink-0 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{profile.email} · </span>
            <span className="font-medium capitalize">{profile.role}</span>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
