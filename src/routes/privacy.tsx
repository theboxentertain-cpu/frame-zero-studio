import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/fz/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy · FRAME ZERO كادر صفر" },
      {
        name: "description",
        content: "How FRAME ZERO keeps your film projects private to your account.",
      },
      { property: "og:title", content: "Privacy · FRAME ZERO" },
      {
        property: "og:description",
        content: "Owner-only access to every project, record and file.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage
      title={{ en: "Privacy", ar: "الخصوصية" }}
      intro={{
        en: "Your films are private by default. Only the account that created a project can read, change or delete it.",
        ar: "أفلامك خاصة افتراضيًا. الحساب الذي أنشأ المشروع وحده يستطيع قراءته أو تعديله أو حذفه.",
      }}
      sections={[
        {
          h: { en: "What we store", ar: "ما نخزّنه" },
          p: {
            en: "Your email, display name, preferred mode and language; the written material you enter (briefs, treatments, cast, world, dialogue, shot plans, notes, budget lines); files you upload; and a change history of your records.",
            ar: "بريدك واسمك الظاهر ووضعك ولغتك المفضلة؛ والمواد المكتوبة التي تدخلها (الموجز والمعالجات والشخصيات والعالم والحوار وخطط اللقطات والملاحظات وبنود الميزانية)؛ والملفات التي ترفعها؛ وسجل التغييرات.",
          },
        },
        {
          h: { en: "Who can see it", ar: "من يستطيع رؤيتها" },
          p: {
            en: "Access rules in the database restrict every project, nested record and file to its owner. There is no sharing feature yet.",
            ar: "قواعد الوصول في قاعدة البيانات تقصر كل مشروع وسجل وملف على مالكه. لا توجد ميزة مشاركة بعد.",
          },
        },
        {
          h: { en: "No AI processing today", ar: "لا معالجة بالذكاء الاصطناعي حاليًا" },
          p: {
            en: "No analysis or generation provider is connected. Your material is not sent to any AI model.",
            ar: "لا يوجد مزوّد تحليل أو توليد متصل. لا تُرسل موادك إلى أي نموذج ذكاء اصطناعي.",
          },
        },
        {
          h: { en: "Deletion", ar: "الحذف" },
          p: {
            en: "Archive a project, then delete it permanently from the library. Change-history entries for deleted projects remain readable only by you.",
            ar: "أرشف المشروع ثم احذفه نهائيًا من المكتبة. تبقى سجلات التغيير للمشاريع المحذوفة مرئية لك وحدك.",
          },
        },
      ]}
    />
  ),
});
