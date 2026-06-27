/**
 * Where orders ship from — the return address to use when buying postage and on
 * packing slips. Edit it here (no env vars needed). Phone/email are kept because
 * carriers require them on a ship-from address.
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
