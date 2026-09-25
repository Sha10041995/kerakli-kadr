import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Sahifa topilmadi</h1>
      <p className="mt-2 text-slate-600">Bu sahifa mavjud emas yoki oʻchirilgan.</p>
      <div className="mt-6 flex gap-3">
        <ButtonLink href="/">Bosh sahifa</ButtonLink>
        <ButtonLink href="/jobs" variant="outline">Ishlar</ButtonLink>
      </div>
    </Container>
  );
}
