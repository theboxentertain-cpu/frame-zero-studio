import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/fz/LegalPage";

export const Route = createFileRoute("/rights")({
  head: () => ({
    meta: [
      { title: "Rights & likeness · FRAME ZERO كادر صفر" },
      { name: "description", content: "FRAME ZERO's rules on likeness, voice, references and original work." },
      { property: "og:title", content: "Rights & likeness · FRAME ZERO" },
      { property: "og:description", content: "Fictional characters, written consent, and original constraints from references." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage
      title={{ en: "Rights & likeness", ar: "الحقوق والملامح" }}
      intro={{
        en: "FRAME ZERO is built for original work. It does not copy films, celebrities or real people.",
        ar: "كادر صفر مصمم للأعمال الأصلية. لا ينسخ أفلامًا أو مشاهير أو أشخاصًا حقيقيين.",
      }}
      sections={[
        {
          h: { en: "Fictional cast by default", ar: "شخصيات خيالية افتراضيًا" },
          p: {
            en: "Cast profiles describe fictional characters. Any real person's likeness requires recorded written consent; the app stores your note of that consent but does not verify it.",
            ar: "ملفات الشخصيات تصف شخصيات خيالية. أي ملامح لشخص حقيقي تتطلب موافقة كتابية مسجلة؛ يخزن التطبيق ملاحظتك عنها ولا يتحقق منها.",
          },
        },
        {
          h: { en: "Region is not a face", ar: "المنطقة ليست وجهًا" },
          p: {
            en: "Regional background is recorded separately from appearance. Facial attributes are never inferred from origin.",
            ar: "تُسجّل الخلفية الإقليمية منفصلة عن المظهر. لا تُستنتج ملامح الوجه من الأصل أبدًا.",
          },
        },
        {
          h: { en: "References become original constraints", ar: "المراجع تتحول إلى قيود أصلية" },
          p: {
            en: "You may note films, directors or music you admire. The Reference Engine asks you to restate them as original artistic constraints, never as copies.",
            ar: "يمكنك تدوين أفلام أو مخرجين أو موسيقى تعجبك. يطلب محرك المراجع إعادة صياغتها كقيود فنية أصلية، لا كنسخ.",
          },
        },
        {
          h: { en: "Voice", ar: "الصوت" },
          p: {
            en: "No speech is generated. Voice permission fields record consent status for future production work.",
            ar: "لا يتم توليد كلام. حقول إذن الصوت تسجل حالة الموافقة لأعمال الإنتاج المستقبلية.",
          },
        },
        {
          h: { en: "Locks and approvals are written", ar: "الأقفال والاعتمادات مكتوبة" },
          p: {
            en: "Locking a character or approving a gate records your decision. It does not lock images or produce media.",
            ar: "قفل شخصية أو اعتماد بوابة يسجل قرارك. لا يثبّت صورًا ولا ينتج وسائط.",
          },
        },
      ]}
    />
  ),
});
