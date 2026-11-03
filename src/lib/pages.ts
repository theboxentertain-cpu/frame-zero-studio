import type { Bi } from "./i18n";

export type World = "library" | "create" | "cast_world" | "direct" | "finish" | "utility";
export type PageStatus = "live" | "partial" | "roadmap";
export type Scope = "global" | "project" | "scene" | "shot";

export type PageDef = {
  id: string; // stable P00–P23 identifiers from the existing domain contract
  world: World;
  scope: Scope;
  /** path segment under /projects/$id (project scope), or absolute path for global */
  seg: string;
  label: Bi;
  status: PageStatus;
  summary: Bi;
};

export const WORLDS: {
  id: Exclude<World, "library" | "utility">;
  n: number;
  label: Bi;
  short: Bi;
}[] = [
  {
    id: "create",
    n: 1,
    label: { en: "Create", ar: "ابتكر" },
    short: { en: "Create", ar: "ابتكر" },
  },
  {
    id: "cast_world",
    n: 2,
    label: { en: "Cast & World", ar: "الشخصيات والعالم" },
    short: { en: "Cast", ar: "الشخصيات" },
  },
  { id: "direct", n: 3, label: { en: "Direct", ar: "أخرج" }, short: { en: "Direct", ar: "أخرج" } },
  {
    id: "finish",
    n: 4,
    label: { en: "Finish", ar: "أنهِ الفيلم" },
    short: { en: "Finish", ar: "أنهِ" },
  },
];

export const PAGES: PageDef[] = [
  {
    id: "P00",
    world: "library",
    scope: "global",
    seg: "/projects",
    status: "live",
    label: { en: "Project Library", ar: "مكتبة المشاريع" },
    summary: { en: "Your private films.", ar: "أفلامك الخاصة." },
  },
  {
    id: "P01",
    world: "library",
    scope: "global",
    seg: "/projects/new",
    status: "live",
    label: { en: "New Film", ar: "فيلم جديد" },
    summary: { en: "Start a private development project.", ar: "ابدأ مشروع تطوير خاص." },
  },
  {
    id: "P02",
    world: "create",
    scope: "project",
    seg: "brief",
    status: "live",
    label: { en: "Creative Brief", ar: "الموجز الإبداعي" },
    summary: {
      en: "Source facts, proposals and approved decisions — kept apart.",
      ar: "الحقائق والمقترحات والقرارات المعتمدة — كلٌّ في مكانه.",
    },
  },
  {
    id: "P03",
    world: "create",
    scope: "project",
    seg: "interpretations",
    status: "live",
    label: { en: "Directing Interpretations", ar: "القراءات الإخراجية" },
    summary: {
      en: "Three cinematographic directions and the reference engine.",
      ar: "ثلاثة اتجاهات سينمائية ومحرك المراجع.",
    },
  },
  {
    id: "P04",
    world: "create",
    scope: "project",
    seg: "treatment",
    status: "live",
    label: { en: "Director's Treatment", ar: "معالجة المخرج" },
    summary: { en: "Film, sequence and scene intentions.", ar: "نوايا الفيلم والمتتالية والمشهد." },
  },
  {
    id: "P05",
    world: "create",
    scope: "project",
    seg: "story",
    status: "live",
    label: { en: "Story Map", ar: "خريطة القصة" },
    summary: { en: "Scenes, purpose and turning points.", ar: "المشاهد والغاية ونقاط التحول." },
  },
  {
    id: "P06",
    world: "cast_world",
    scope: "project",
    seg: "cast",
    status: "live",
    label: { en: "Casting Room", ar: "غرفة اختيار الممثلين" },
    summary: {
      en: "Fictional cast profiles with rights metadata.",
      ar: "ملفات شخصيات خيالية مع بيانات الحقوق.",
    },
  },
  {
    id: "P07",
    world: "cast_world",
    scope: "project",
    seg: "performances",
    status: "live",
    label: { en: "Living Actors", ar: "الممثلون الأحياء" },
    summary: {
      en: "Playable performance plans per character and scene.",
      ar: "خطط أداء قابلة للتمثيل لكل شخصية ومشهد.",
    },
  },
  {
    id: "P08",
    world: "cast_world",
    scope: "project",
    seg: "locations",
    status: "live",
    label: { en: "World & Region", ar: "العالم والمنطقة" },
    summary: {
      en: "World bibles grounded in real places.",
      ar: "مراجع العالم المستندة إلى أماكن حقيقية.",
    },
  },
  {
    id: "P09",
    world: "cast_world",
    scope: "project",
    seg: "language",
    status: "live",
    label: { en: "Dialect & Voice", ar: "اللهجة والصوت" },
    summary: {
      en: "Character dialect and written dialogue.",
      ar: "لهجة الشخصيات والحوار المكتوب.",
    },
  },
  {
    id: "P10",
    world: "direct",
    scope: "project",
    seg: "scenes",
    status: "live",
    label: { en: "Scene Navigator", ar: "متصفح المشاهد" },
    summary: { en: "Enter each scene's tools.", ar: "ادخل إلى أدوات كل مشهد." },
  },
  {
    id: "P11",
    world: "direct",
    scope: "scene",
    seg: "plan",
    status: "live",
    label: { en: "Shot Lab", ar: "معمل اللقطات" },
    summary: {
      en: "Motivated shot plans with required fields.",
      ar: "خطط لقطات مبررة بحقول إلزامية.",
    },
  },
  {
    id: "P12",
    world: "direct",
    scope: "scene",
    seg: "stills",
    status: "partial",
    label: { en: "Visual Storyboard", ar: "اللوحة المصورة" },
    summary: {
      en:
        "Manual image references and shot review. AI generation not connected.",
      ar: "مراجع صور يدوية مع مراجعة اللقطات. توليد الصور غير متصل.",
    },
  },
  {
    id: "P13",
    world: "direct",
    scope: "scene",
    seg: "production",
    status: "roadmap",
    label: { en: "Production Floor", ar: "أرضية التصوير" },
    summary: {
      en: "Motion generation — not connected. Written call sheet only.",
      ar: "توليد الحركة — غير متصل. ورقة تصوير مكتوبة فقط.",
    },
  },
  {
    id: "P14",
    world: "direct",
    scope: "shot",
    seg: "retake",
    status: "partial",
    label: { en: "Retake Room", ar: "غرفة الإعادة" },
    summary: { en: "Written retake notes per shot.", ar: "ملاحظات إعادة مكتوبة لكل لقطة." },
  },
  {
    id: "P15",
    world: "direct",
    scope: "project",
    seg: "continuity",
    status: "live",
    label: { en: "Film Memory", ar: "ذاكرة الفيلم" },
    summary: { en: "Continuity notes across scenes.", ar: "ملاحظات الاستمرارية عبر المشاهد." },
  },
  {
    id: "P16",
    world: "finish",
    scope: "project",
    seg: "edit",
    status: "roadmap",
    label: { en: "Picture Edit", ar: "مونتاج الصورة" },
    summary: {
      en: "Requires generated footage (step 15+).",
      ar: "يتطلب لقطات مولّدة (المرحلة 15+).",
    },
  },
  {
    id: "P17",
    world: "finish",
    scope: "project",
    seg: "sound",
    status: "roadmap",
    label: { en: "Sound Studio", ar: "استوديو الصوت" },
    summary: { en: "Requires audio pipeline (step 15+).", ar: "يتطلب مسار صوت (المرحلة 15+)." },
  },
  {
    id: "P18",
    world: "finish",
    scope: "project",
    seg: "grade",
    status: "roadmap",
    label: { en: "Color Studio", ar: "استوديو الألوان" },
    summary: { en: "Requires footage (step 15+).", ar: "يتطلب لقطات (المرحلة 15+)." },
  },
  {
    id: "P19",
    world: "finish",
    scope: "project",
    seg: "quality",
    status: "partial",
    label: { en: "Final Cut Guardian", ar: "حارس النسخة النهائية" },
    summary: {
      en: "Six approval gates with real prerequisites.",
      ar: "ست بوابات اعتماد بشروط حقيقية.",
    },
  },
  {
    id: "P20",
    world: "finish",
    scope: "project",
    seg: "export",
    status: "partial",
    label: { en: "Final Export", ar: "التصدير النهائي" },
    summary: { en: "Export the written development package.", ar: "تصدير حزمة التطوير المكتوبة." },
  },
  {
    id: "P21",
    world: "utility",
    scope: "project",
    seg: "versions",
    status: "live",
    label: { en: "Version History", ar: "سجل النسخ" },
    summary: { en: "Every saved change, recorded.", ar: "كل تغيير محفوظ ومسجّل." },
  },
  {
    id: "P22",
    world: "utility",
    scope: "project",
    seg: "budget",
    status: "live",
    label: { en: "Budget", ar: "الميزانية" },
    summary: { en: "Manual estimates. No billing.", ar: "تقديرات يدوية. لا فوترة." },
  },
  {
    id: "P23",
    world: "utility",
    scope: "global",
    seg: "/account",
    status: "live",
    label: { en: "Account & Rights", ar: "الحساب والحقوق" },
    summary: { en: "Profile, mode, language and rights.", ar: "الملف والوضع واللغة والحقوق." },
  },
];

export const pageById = (id: string) => {
  const p = PAGES.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown page ${id}`);
  return p;
};

export const pagesInWorld = (w: World) => PAGES.filter((p) => p.world === w);

/** Which world a project sub-path belongs to, for highlighting navigation. */
export function worldForPath(pathname: string): World | null {
  const m = pathname.match(/^\/projects\/[^/]+\/([^/]+)(?:\/[^/]+\/([^/]+))?/);
  if (!m) return null;
  const [, first, nested] = m;
  if (first === "scenes" && nested) return "direct";
  if (first === "shots") return "direct";
  const p = PAGES.find((x) => x.scope === "project" && x.seg === first);
  return p?.world ?? null;
}

export const STATUS_LABEL: Record<PageStatus, Bi> = {
  live: { en: "Working", ar: "يعمل" },
  partial: { en: "Partial", ar: "جزئي" },
  roadmap: { en: "Roadmap", ar: "خارطة الطريق" },
};
