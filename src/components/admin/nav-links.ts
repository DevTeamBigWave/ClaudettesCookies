import {
  LayoutDashboard,
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  Mail,
  Ticket,
  Gift,
  FileText,
  Plug,
  type LucideIcon,
} from "lucide-react";

/** Shared admin navigation, used by both the desktop sidebar and the mobile drawer. */
export const ADMIN_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/marketing", label: "Email Marketing", icon: Mail },
  { href: "/admin/promotions", label: "Promotions", icon: Ticket },
  { href: "/admin/gift-cards", label: "Gift Cards", icon: Gift },
  { href: "/admin/blog", label: "Journal", icon: FileText },
  { href: "/admin/integrations", label: "Integrations", icon: Plug },
];

/** Whether a nav link should render as active for the given pathname. */
export function isActiveLink(href: string, pathname: string): boolean {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}
