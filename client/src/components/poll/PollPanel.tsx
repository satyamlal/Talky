import { Notifications } from "../Notifications";

export interface CurrentPoll {
  question: string;
  options: { text: string; votes: number }[];
  userVote?: number;
  votersCount?: number;
  totalEligible?: number;
  ended?: boolean;
}

interface PollPanelProps {
  isAdmin: boolean;
  currentPoll: CurrentPoll | null;
  pollHistory?: {
    question: string;
    options: { text: string; votes: number }[];
    endedAt: number;
    votersCount?: number;
    totalEligible?: number;
  }[];
  pollQuestion: string;
  setPollQuestion: (v: string) => void;
  pollOptions: string[];
  setPollOptions: (opts: string[]) => void;
  onCreatePoll: () => void;
  onVote: (idx: number) => void;
  onEndPoll: () => void;
  onRestartPoll?: (historyIndex: number) => void;
  notice?: string;
}

export function PollPanel({
  isAdmin,
  currentPoll,
  pollHistory,
  pollQuestion,
  setPollQuestion,
  pollOptions,
  setPollOptions,
  onCreatePoll,
  onVote,
  onEndPoll,
  onRestartPoll,
  notice,
}: PollPanelProps) {
  const hasActivePoll = !!currentPoll && !currentPoll.ended;

  const RecentPolls = () => (
    (pollHistory && pollHistory.length > 0) ? (
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
                    <button
                      onClick={() => onRestartPoll(idx)}
                      disabled={hasActivePoll}
                      className={`px-2 py-1 rounded-md border text-xs ${hasActivePoll ? "border-gray-600 text-gray-500 cursor-not-allowed" : "border-emerald-400/60 text-emerald-200"}`}
                    >
                      Restart Poll
                    </button>
                  )}
                </div>
                {label && <div className="text-[10px] text-sky-400 mt-1">{label}</div>}
              </div>
            );
          })}
        </div>
      </div>
    ) : null
  );

  return (
    <div className="text-sky-300 space-y-4">
      <h3 className="text-lg font-semibold">Polls</h3>
      {hasActivePoll ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-sky-400">
              <span>
                Total Users: {currentPoll!.votersCount ?? 0}/{currentPoll!.totalEligible ?? 0}
              </span>
              <span>
                {(() => {
                  const a = currentPoll!.votersCount ?? 0;
                  const b = currentPoll!.totalEligible ?? 0;
                  const pct = b > 0 ? Math.round((a / b) * 100) : 0;
                  return `${pct}% users have voted!`;
                })()}
              </span>
            </div>
          </div>
          <p className="text-sky-200 font-medium">Question: {currentPoll!.question}</p>
          <div className="space-y-2">
            {currentPoll!.options.map((opt, idx) => {
              const totalVotes = (currentPoll!.options || []).reduce((sum, o) => sum + (o.votes || 0), 0);
              const voters = currentPoll!.votersCount ?? totalVotes;
              const share = voters > 0 ? Math.round(((opt.votes || 0) / voters) * 100) : 0;
              const canVote = !isAdmin && typeof currentPoll!.userVote !== "number";
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => canVote && onVote(idx)}
                  disabled={!canVote}
                  className="w-full text-left"
                >
                  <div className="relative w-full rounded-md border border-sky-500/30 bg-[#0b1220] px-3 py-2 overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-sky-500/30" style={{ width: `${share}%` }} />
                    <div className="relative flex items-center justify-between">
                      <span className="text-sky-100 text-sm">{opt.text}</span>
                      <span className="text-sky-300 text-xs">{opt.votes} ({share}%)</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {isAdmin && (
            <>
              <button onClick={onEndPoll} className="w-full px-3 py-2 rounded-md border border-rose-400/60 text-rose-200">End Poll</button>
              <Notifications message={notice} tone="error" />
            </>
          )}
          <RecentPolls />
        </div>
      ) : (
        <div className="space-y-3">
          {isAdmin ? (
            <>
              <input
                type="text"
                placeholder="Poll question"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 focus:outline-none"
              />
              <div className="space-y-2">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[idx] = e.target.value;
                        setPollOptions(next);
                      }}
                      className="flex-1 px-3 py-2 rounded-md bg-gray-800 border border-gray-700 focus:outline-none"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                        className="px-2 py-1 rounded-md border border-rose-400/60 text-rose-200"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 5 && (
                  <button
                    onClick={() => {
                      setPollOptions([...pollOptions, ""]);
                      setTimeout(() => {
                        const inputs = document.querySelectorAll<HTMLInputElement>("input[placeholder^='Option']");
                        inputs[inputs.length - 1]?.focus();
                      }, 0);
                    }}
                    className="w-full px-3 py-2 rounded-md border border-sky-400/60 text-sky-200"
                  >
                    Add Option
                  </button>
                )}
              </div>
              <button onClick={onCreatePoll} className="w-full px-3 py-2 rounded-md border border-sky-400/60 text-sky-200">Create Poll</button>
              <Notifications message={notice} tone="error" />
            </>
          ) : (
            <p className="text-xs text-sky-400/70">No active poll.</p>
          )}
          <RecentPolls />
        </div>
      )}
    </div>
  );
}
