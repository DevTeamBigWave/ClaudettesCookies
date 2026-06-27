import { SiteHeader } from "@/components/shop/site-header";
import { SiteFooter } from "@/components/shop/site-footer";
import { ChatWidgetLoader } from "@/components/shop/chat-widget-loader";
import { WelcomePopup } from "@/components/shop/welcome-popup";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationSchema, websiteSchema, localBusinessSchema } from "@/lib/seo";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={[organizationSchema(), websiteSchema(), localBusinessSchema()]} />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <ChatWidgetLoader />
      <WelcomePopup />
    </div>
  );
}
