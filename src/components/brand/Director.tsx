import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import portraitOn from "@/assets/director-portrait-on.webp";
import portraitQuiet from "@/assets/director-portrait-quiet.webp";
import { useI18n } from "@/lib/i18n";
import { PRESENCE_KEY, SCOPE_NOTE, type DirectorPresence, type Remark } from "@/lib/director";
import { cn } from "@/lib/utils";

export function useDirectorPresence() {
  const [presence, setPresence] = useState<DirectorPresence>("on");
  useEffect(() => {
    const v = window.localStorage.getItem(PRESENCE_KEY);
    if (v === "on" || v === "quiet" || v === "off") setPresence(v);
  }, []);
  const set = (p: DirectorPresence) => {
    setPresence(p);
    window.localStorage.setItem(PRESENCE_KEY, p);
  };
  return [presence, set] as const;
}

const NAME = { en: "The Director's Second Chair", ar: "الكرسي الثاني للمخرج" };

function PresenceSwitch({
  value,
  onChange,
}: {
  value: DirectorPresence;
  onChange: (p: DirectorPresence) => void;
}) {
  const { tx } = useI18n();
  const opts: { v: DirectorPresence; l: { en: string; ar: string } }[] = [
    { v: "on", l: { en: "On", ar: "حاضر" } },
    { v: "quiet", l: { en: "Quiet", ar: "هادئ" } },
    { v: "off", l: { en: "Off", ar: "غائب" } },
  ];
  return (
    <div
      role="group"
      aria-label={tx({ en: "Director presence", ar: "حضور المخرج" })}
      className="inline-flex rounded-md border border-border bg-background/60 p-0.5"
    >
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "tap rounded px-3 text-xs transition-colors",
            value === o.v
              ? "bg-brass-dim text-brass"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tx(o.l)}
        </button>
      ))}
    </div>
  );
}

/**
 * Reusable Director character. Remarks must come from real project state
 * (see directorRemarks) or fixed opening lines — never invented media commentary.
 */
export function Director({
  remarks,
  projectId,
  showScope = true,
  className,
}: {
  remarks: Remark[];
  projectId?: string;
  showScope?: boolean;
  className?: string;
}) {
  const { tx } = useI18n();
  const [presence, setPresence] = useDirectorPresence();

  if (presence === "off") {
    return (
      <div className={cn("flex items-center justify-between gap-3", className)}>
        <p className="text-xs text-muted-foreground">
          {tx({
            en: "The Director is off. Call him back any time.",
            ar: "المخرج غائب. استدعِه متى شئت.",
          })}
        </p>
        <PresenceSwitch value={presence} onChange={setPresence} />
      </div>
    );
  }

  const quiet = presence === "quiet";
  return (
    <aside
      aria-label={tx(NAME)}
      className={cn(
        "shadow-frame relative overflow-hidden rounded-lg border border-border bg-walnut",
        className,
      )}
    >
      <div className="flex items-start gap-4 p-4">
        <img
          src={quiet ? portraitQuiet : portraitOn}
          alt={tx({
            en: "The Director: curly greying hair, black rectangular glasses, red pencil behind his ear",
            ar: "المخرج: شعر مجعد يغزوه الشيب، نظارة سوداء مستطيلة، قلم أحمر خلف أذنه",
          })}
          width={384}
          height={384}
          loading="lazy"
          className={cn(
            "motion-lamp shrink-0 rounded-md border border-brass/30 object-cover",
            quiet ? "size-14 opacity-80" : "size-20 md:size-24",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="eyebrow">{tx(NAME)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {tx({ en: "Written notes · you decide", ar: "ملاحظات مكتوبة · القرار لك" })}
              </p>
            </div>
            <PresenceSwitch value={presence} onChange={setPresence} />
          </div>
          {quiet ? (
            <p className="mt-2 text-sm text-ivory/80">
              {tx({
                en: `He's reading. ${remarks.length} note(s) when you want them.`,
                ar: `إنه يقرأ. لديه ${remarks.length} ملاحظة حين تريدها.`,
              })}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {remarks.map((r) => (
                <li
                  key={r.key}
                  className="border-s-2 border-crimson/70 ps-3 text-sm leading-relaxed text-ivory/90"
                >
                  <span className="font-display text-base italic">“{tx(r.text)}”</span>
                  {r.seg && projectId && (
                    <Link
                      to={`/projects/$id/${r.seg}` as "/projects/$id/brief"}
                      params={{ id: projectId }}
                      className="tap ms-2 inline-flex items-center text-xs text-brass underline-offset-4 hover:underline"
                    >
                      {tx({ en: "Go there", ar: "اذهب إليها" })}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          {showScope && !quiet && (
            <p className="mt-3 text-[11px] text-muted-foreground">{tx(SCOPE_NOTE)}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
