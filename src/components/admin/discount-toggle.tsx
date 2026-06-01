"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleDiscount } from "@/app/admin/(panel)/actions";

export function DiscountToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={active ? "ghost" : "secondary"}
      disabled={pending}
      onClick={() => start(() => toggleDiscount(id, !active))}
    >
      {active ? "Disable" : "Enable"}
    </Button>
  );
}
