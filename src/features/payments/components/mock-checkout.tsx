"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { completeMockPaymentAction } from "@/features/payments/actions";
import { useI18n } from "@/lib/i18n/client";

export function MockCheckout({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const { t, tr } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const finish = (outcome: "paid" | "cancelled") =>
    start(async () => {
      const res = await completeMockPaymentAction(paymentId, outcome);
      if (!res.ok) return setError(tr(res.error));
      router.push(`/dashboard/billing?payment=${paymentId}&result=${outcome}`);
      router.refresh();
    });
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button disabled={pending} onClick={() => finish("paid")}>
          {t("billing.markPaid")}
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => finish("cancelled")}>
          {t("common.cancel")}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
