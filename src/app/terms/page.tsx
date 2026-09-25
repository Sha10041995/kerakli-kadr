import type { Metadata } from "next";
import { Card, Container, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Foydalanish shartlari", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <Container className="max-w-3xl py-10">
      <PageHeader title="Foydalanish shartlari" />
      <Card className="space-y-4 text-sm leading-relaxed text-slate-700">
        <p>Platformadan foydalanib, siz quyidagilarga rozilik bildirasiz:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Faqat haqqoniy maʼlumot joylash; soxta vakansiya, firibgarlik va chalgʻituvchi maosh taqiqlanadi.</li>
          <li>Ishga olish uchun nomzoddan pul talab qilish taqiqlanadi.</li>
          <li>Noqonuniy ishlar va kamsituvchi talablar (qonun talab qilmagan hollarda jins, yosh va h.k.) joylashtirilmaydi.</li>
          <li>Sharhlar faqat haqiqiy ish jarayonidan keyin yoziladi.</li>
          <li>Qoidabuzarlik aniqlanganda eʼlon yoki hisob bloklanishi mumkin.</li>
          <li>Pullik xizmatlar ixtiyoriy; narxlar “Tariflar” sahifasida koʻrsatilgan.</li>
        </ul>
      </Card>
    </Container>
  );
}
