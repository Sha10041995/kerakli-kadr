"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { checkoutAction } from "@/features/payments/actions";
import { useI18n } from "@/lib/i18n/client";

export function CheckoutButton({
  purpose,
  code,
  vacancyId,
  label,
  variant = "primary",
}: {
  purpose: "subscription" | "service";
  code: string;
  vacancyId?: string;
  label: string;
  variant?: "primary" | "outline" | "accent";
}) {
  const router = useRouter();
  const { tr } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant={variant}
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await checkoutAction({ purpose, code, vacancyId });
            if (res.ok && res.data) router.push(res.data.redirectUrl);
            else if (!res.ok) setError(tr(res.error));
          })
        }
      >
        {pending ? "…" : label}
      </Button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
