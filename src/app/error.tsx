"use client";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Xatolik yuz berdi</h1>
      <p className="mt-2 text-slate-600">Iltimos, sahifani qayta yuklang. Muammo takrorlansa, bizga xabar bering.</p>
      <Button className="mt-6" onClick={reset}>Qayta urinish</Button>
    </Container>
  );
}
