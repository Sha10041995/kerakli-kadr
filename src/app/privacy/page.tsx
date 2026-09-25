import type { Metadata } from "next";
import { Card, Container, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Maxfiylik siyosati", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <Container className="max-w-3xl py-10">
      <PageHeader title="Maxfiylik siyosati" description="Qisqa va tushunarli: maʼlumotlaringiz qanday himoyalanadi." />
      <Card className="space-y-4 text-sm leading-relaxed text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">1. Qanday maʼlumot yigʻamiz</h2>
        <p>Ism, familiya, email, ixtiyoriy telefon raqam, kasb, tajriba, hudud (viloyat/tuman/qishloq/mahalla) va siz yuklagan hujjatlar.</p>
        <h2 className="text-base font-semibold text-slate-900">2. Joylashuv</h2>
        <p>Aniq uy manzilingiz soʻralmaydi va saqlanmaydi. Koordinatalar ~1 km aniqlikkacha yaxlitlanadi; ommaviy profilda faqat tuman va taxminiy masofa koʻrsatiladi.</p>
        <h2 className="text-base font-semibold text-slate-900">3. Telefon va hujjatlar</h2>
        <p>Telefon raqamingiz ommaga chiqmaydi — faqat siz ariza yuborgan ish beruvchiga ochiladi. CV, sertifikat va tasdiqlash hujjatlari yopiq omborda saqlanadi.</p>
        <h2 className="text-base font-semibold text-slate-900">4. Toʻlovlar</h2>
        <p>Karta raqami, CVV va boshqa karta maʼlumotlari bizning serverlarimizda saqlanmaydi — toʻlovlar litsenziyalangan toʻlov provayderi orqali amalga oshiriladi.</p>
        <h2 className="text-base font-semibold text-slate-900">5. Huquqlaringiz</h2>
        <p>Profilingizni istalgan vaqtda yashirishingiz, tahrirlashingiz yoki oʻchirishni soʻrashingiz mumkin: support@kadrtop.uz</p>
      </Card>
    </Container>
  );
}
