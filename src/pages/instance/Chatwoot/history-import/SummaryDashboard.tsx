import { ChatwootHistoryJobSummary } from "@/lib/queries/chatwoot/types";
import { cn } from "@/lib/utils";

type SummaryDashboardProps = {
  summary: ChatwootHistoryJobSummary | null | undefined;
  classificationFilter: string;
  onFilterChange: (filter: string) => void;
};

const cards = [
  { key: "all", label: "Total", color: "bg-blue-500", getValue: (s: ChatwootHistoryJobSummary) => s.totalContacts },
  { key: "eligible", label: "Prontos", color: "bg-green-500", getValue: (s: ChatwootHistoryJobSummary) => s.eligible },
  { key: "requires_rebuild", label: "Rebuild", color: "bg-amber-500", getValue: (s: ChatwootHistoryJobSummary) => s.requiresRebuild },
  { key: "needs_review", label: "Conflitos", color: "bg-orange-500", getValue: (s: ChatwootHistoryJobSummary) => (s.needsReview || 0) + (s.lidAlias || 0) },
] as const;

export function SummaryDashboard({ summary, classificationFilter, onFilterChange }: SummaryDashboardProps) {
  if (!summary) return null;

  const total = summary.totalContacts || 1;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const value = card.getValue(summary);
        const isActive = classificationFilter === card.key;
        const pct = Math.round((value / total) * 100);

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onFilterChange(isActive ? "all" : card.key)}
            className={cn(
              "relative overflow-hidden rounded-lg border p-4 text-left transition-all hover:bg-accent",
              isActive && "ring-2 ring-primary",
            )}
          >
            <div className="text-sm text-muted-foreground">{card.label}</div>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-all", card.color)} style={{ width: `${pct}%` }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
