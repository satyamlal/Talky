import { RestartPollButton } from "../buttons/poll/RestartPollButton";

export interface PollHistoryItem {
  question: string;
  options: { text: string; votes: number }[];
  endedAt: number;
  votersCount?: number;
  totalEligible?: number;
}

interface RecentPollsProps {
  pollHistory: PollHistoryItem[];
  isAdmin: boolean;
  hasActivePoll: boolean;
  onRestartPoll?: (historyIndex: number) => void;
}

export function RecentPolls({ pollHistory, isAdmin, hasActivePoll, onRestartPoll }: RecentPollsProps) {
  if (!pollHistory || pollHistory.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm text-sky-400">Recent Polls</p>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {pollHistory.map((p, idx) => {
          const pct = (p.totalEligible && p.totalEligible > 0)
            ? Math.round(((p.votersCount || 0) / p.totalEligible) * 100)
            : undefined;
          const label = typeof pct === "number" ? `${pct}% users participated` : undefined;
          return (
            <div key={idx} className="p-2 rounded-md border border-sky-500/30 bg-[#0b1220]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-sky-200 line-clamp-2">Poll: {pollHistory.length - idx}<br />{p.question}</span>
                {isAdmin && onRestartPoll && (
                  <RestartPollButton onClick={() => onRestartPoll(idx)} disabled={hasActivePoll} />
                )}
              </div>
              {label && <div className="text-[10px] text-sky-400 mt-1">{label}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
