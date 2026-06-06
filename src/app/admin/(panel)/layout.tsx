import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { MobileAdminNav } from "@/components/admin/mobile-nav";

export const dynamic = "force-dynamic"; // admin is always live data

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <MobileAdminNav />
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="size-4" /> Back to website
            </Link>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="hidden sm:inline">{profile.email} · </span>
            <span className="font-medium capitalize">{profile.role}</span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
