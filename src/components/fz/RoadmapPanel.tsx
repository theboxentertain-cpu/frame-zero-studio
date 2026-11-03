import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n, type Bi } from "@/lib/i18n";

/** Honest placeholder for a stage that is part of the roadmap (step 15+), not an operational tool. */
export function RoadmapPanel({
  requires,
  plan,
  children,
}: {
  requires: Bi;
  plan: Bi[];
  children?: ReactNode;
}) {
  const { tx, t } = useI18n();
  return (
    <div className="mx-4 rounded-md border border-roadmap/30 bg-surface/60 p-5 md:mx-8">
      <div className="flex items-center gap-2 text-roadmap">
        <Lock className="size-4" />
        <span className="text-sm font-medium">{t("notOperational")}</span>
      </div>
      <p className="mt-3 text-sm text-ivory/85">{tx(requires)}</p>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {plan.map((p, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-mono text-[11px] text-roadmap">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{tx(p)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        {tx({
          en: "No controls here pretend to work. No footage, stills, audio or billing is produced by this app today.",
          ar: "لا توجد هنا أزرار توهم بالعمل. لا ينتج التطبيق اليوم لقطات أو صورًا أو صوتًا أو فواتير.",
        })}
      </p>
      {children}
    </div>
  );
}
