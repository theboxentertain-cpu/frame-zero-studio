import type { Bi } from "./i18n";

/**
 * "The Director's Second Chair" — a written, deterministic commentator.
 * He only reads facts stored in this project (counts and empty fields). He never
 * claims to have seen footage, stills, audio or a grade, because none is generated.
 * Creative authority stays with the user: remarks point to a page, they never decide.
 */
export type DirectorPresence = "on" | "quiet" | "off";
export const PRESENCE_KEY = "mz.director";

export type ProjectFacts = {
  briefHasFacts: boolean;
  briefHasDecisions: boolean;
  interpretations: number;
  scenes: number;
  shots: number;
  /** shots whose "dramatic function / what changes" is still blank */
  shotsWithoutChange: number;
  /** shots with no written reason for the cut */
  shotsWithoutCutReason: number;
  characters: number;
  locations: number;
  gatesApproved: number;
  gatesTotal: number;
};

export type Remark = { key: string; text: Bi; /** project page segment */ seg?: string };

/** Fixed scope statement shown with every set of project remarks. */
export const SCOPE_NOTE: Bi = {
  en: "I only read what is written in this project. There is no footage yet, so I won't pretend I've watched any.",
  ar: "أنا أقرأ فقط ما هو مكتوب في هذا المشروع. لا توجد لقطات مصوّرة بعد، فلن أدّعي أنني شاهدت شيئًا.",
};

export function directorRemarks(f: ProjectFacts, max = 3): Remark[] {
  const out: Remark[] = [];
  if (!f.briefHasFacts)
    out.push({
      key: "brief_empty",
      seg: "brief",
      text: {
        en: "Your brief has no source facts. I don't direct guesses — write down what is true first.",
        ar: "الموجز بلا حقائق مصدر. أنا لا أُخرج تخمينات — اكتب ما هو حقيقي أولًا.",
      },
    });
  if (f.interpretations === 0)
    out.push({
      key: "no_interpretation",
      seg: "interpretations",
      text: {
        en: "No directing interpretation yet. Pick a point of view before anyone picks up a lens.",
        ar: "لا توجد قراءة إخراجية بعد. اختر وجهة نظر قبل أن يلمس أحد العدسة.",
      },
    });
  if (f.characters === 0)
    out.push({
      key: "no_cast",
      seg: "cast",
      text: {
        en: "Nobody is cast. A scene without people is a location scout.",
        ar: "لم تختر أي شخصية. مشهد بلا بشر مجرد معاينة مكان.",
      },
    });
  if (f.scenes === 0)
    out.push({
      key: "no_scenes",
      seg: "story",
      text: {
        en: "There are no scenes on the story map. Shots come later; structure comes now.",
        ar: "لا توجد مشاهد في خريطة القصة. اللقطات لاحقًا؛ البناء الآن.",
      },
    });
  if (f.scenes > 0 && f.shots === 0)
    out.push({
      key: "no_shots",
      seg: "scenes",
      text: {
        en: `${f.scenes} scene(s), zero shots. Open the Shot Lab and give the camera a reason to exist.`,
        ar: `${f.scenes} مشهد، وصفر لقطات. افتح معمل اللقطات وأعطِ الكاميرا سببًا لوجودها.`,
      },
    });
  if (f.shotsWithoutChange > 0)
    out.push({
      key: "shots_without_change",
      seg: "scenes",
      text: {
        en: `${f.shotsWithoutChange} shot(s) don't say what changes. If nothing changes, why are we cutting to it?`,
        ar: `${f.shotsWithoutChange} لقطة لا تقول ماذا يتغيّر. إن لم يتغيّر شيء، فلماذا نقطع عليها؟`,
      },
    });
  if (f.shotsWithoutCutReason > 0)
    out.push({
      key: "shots_without_cut",
      seg: "scenes",
      text: {
        en: `${f.shotsWithoutCutReason} shot(s) have no reason for the cut. Every shot has a reason — write it.`,
        ar: `${f.shotsWithoutCutReason} لقطة بلا سبب للقطع. لكل لقطة سبب — اكتبه.`,
      },
    });
  if (f.locations === 0 && f.scenes > 0)
    out.push({
      key: "no_world",
      seg: "locations",
      text: {
        en: "Scenes with no world bible. Where are we, which year, what does the street sound like?",
        ar: "مشاهد بلا مرجع للعالم. أين نحن، وأي سنة، وكيف يبدو صوت الشارع؟",
      },
    });
  if (!f.briefHasDecisions && f.briefHasFacts)
    out.push({
      key: "no_decisions",
      seg: "brief",
      text: {
        en: "Facts are written, but you haven't approved a single decision. That part is yours, not mine.",
        ar: "الحقائق مكتوبة، لكنك لم تعتمد قرارًا واحدًا. هذا دورك أنت، لا دوري.",
      },
    });
  if (out.length === 0)
    out.push({
      key: "ready_for_gates",
      seg: "quality",
      text: {
        en: `The written plan holds together. ${f.gatesApproved} of ${f.gatesTotal} approval gates are signed — by you.`,
        ar: `الخطة المكتوبة متماسكة. ${f.gatesApproved} من ${f.gatesTotal} بوابات اعتماد موقّعة — منك أنت.`,
      },
    });
  return out.slice(0, max);
}

/** Remarks for public pages, where no project data exists. */
export const OPENING_REMARKS: Remark[] = [
  {
    key: "welcome",
    text: {
      en: "Sit down. Tell me the film in one sentence — then we'll find out if it's true.",
      ar: "اجلس. قل لي الفيلم في جملة واحدة — ثم نكتشف إن كانت صادقة.",
    },
  },
  {
    key: "authority",
    text: {
      en: "I'll question every shot. You'll make every decision. That's the arrangement.",
      ar: "سأسائل كل لقطة. وأنت تتخذ كل قرار. هذا هو الاتفاق.",
    },
  },
];
