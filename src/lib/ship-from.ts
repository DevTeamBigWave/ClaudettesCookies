/**
 * Where orders ship from — the return address on every label and the origin for
 * live rate quotes. Edit it here (no env vars needed). Phone/email are required
 * by carriers (Shippo rejects a ship-from without them).
 */
export const SHIP_FROM = {
  name: "Claudette's Cookies",
  phone: "9179351266",
  email: "hello@claudettescookies.shop",
  street: "108-16 Rockaway Beach Blvd",
  city: "Rockaway Park",
  state: "NY",
  zip: "11694",
} as const;
