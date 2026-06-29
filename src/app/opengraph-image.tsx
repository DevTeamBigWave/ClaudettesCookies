import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Branded share card used for link previews (iMessage, social, etc.) across the
// whole site (pages without their own OG image inherit this). Composes the food
// photo with a maroon scrim + the brand badge, name, and tagline.
export const runtime = "nodejs"; // read brand assets from disk
export const alt = "Claudette's Cookies — No seed oils. Just butter.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MAROON = "#7A0B0B";
const CREAM = "#F4EFE4";
const PAPRIKA = "#FB4D14";

export default async function OpengraphImage() {
  const brandDir = join(process.cwd(), "public", "brand");
  const bg = `data:image/jpeg;base64,${readFileSync(join(brandDir, "og-default.jpg")).toString("base64")}`;
  const badge = `data:image/png;base64,${readFileSync(join(brandDir, "claudettes-badge.png")).toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%" }}>
        {/* Food photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bg}
          width={1200}
          height={630}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          alt=""
        />
        {/* Maroon scrim for legibility + brand color */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, rgba(122,11,11,0.20) 0%, rgba(122,11,11,0.55) 55%, rgba(122,11,11,0.92) 100%)`,
          }}
        />
        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            width: "100%",
            height: "100%",
            padding: 64,
          }}
        >
          {/* Brand lockup */}
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={badge} width={92} height={92} style={{ borderRadius: 999 }} alt="" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: CREAM, letterSpacing: -1 }}>
                Claudette&rsquo;s Cookies
              </div>
              <div style={{ display: "flex", fontSize: 19, fontWeight: 800, color: PAPRIKA, letterSpacing: 5 }}>
                EVERYBODY EATS!
              </div>
            </div>
          </div>

          {/* Tagline */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 82, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.0, letterSpacing: -2 }}>
              No seed oils. Just butter.
            </div>
            <div style={{ display: "flex", fontSize: 27, color: "rgba(244,239,228,0.92)", marginTop: 18 }}>
              Small-batch cookies · baked to order · shipped nationwide · claudettescookies.shop
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
