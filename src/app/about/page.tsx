import type { Metadata } from "next";
import { Card, Container, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Biz haqimizda", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <Container className="max-w-3xl py-10">
      <PageHeader title="Biz haqimizda" />
      <Card className="space-y-4 text-slate-700">
        <p className="text-lg font-semibold text-slate-900">“Katta shaharda emas, oʻz hududingda ham imkoniyat bor.”</p>
        <p>KADR TOP UZ — ish beruvchi, kadr va hududni birlashtiradigan platforma. Oddiy ish saytlari faqat kasb boʻyicha qidiradi; biz esa <strong>kasb + hudud + masofa + tajriba + mavjudlik</strong> boʻyicha qidiramiz.</p>
        <p>Qidiruv natijalari avval mahallangiz, keyin qishloq yoki shaharingiz, tumaningiz va qoʻshni hududlar boʻyicha tartiblanadi. Shunday qilib, Kitob tumanidagi fermer oʻziga yaqin traktorchini, Urganchdagi doʻkon egasi esa oʻsha shahardagi sotuvchini tez topadi.</p>
        <p>Sunʼiy intellekt kelajakda faqat tavsiya va moslashtirish vositasi boʻladi — ishga qabul qilish boʻyicha yakuniy qarorni doim inson qabul qiladi.</p>
      </Card>
    </Container>
  );
}
