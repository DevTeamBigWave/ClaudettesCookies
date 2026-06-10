/**
 * Local pickup configuration. Edit these to your real pickup address + hours;
 * they appear at checkout, on the confirmation page, and in the order emails.
 */
export const PICKUP = {
  /** Shown as the shipping method on the order. */
  label: "Local pickup",
  /** Street address customers pick up from. */
  address: "Rockaway Park, NY",
  /** When/how pickup works — keep it short. */
  instructions: "We'll contact you within 4 hours with pickup details.",
} as const;
