import { Notifications } from "../Notifications";
import { EndPollButton } from "../buttons/poll/EndPollButton";
import { RecentPolls } from "./RecentPolls";
import { PollCreateForm } from "./PollCreateForm";

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

  const recent = (
    <RecentPolls
      pollHistory={pollHistory || []}
      isAdmin={isAdmin}
      hasActivePoll={hasActivePoll}
      onRestartPoll={onRestartPoll}
    />
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
              <EndPollButton onClick={onEndPoll} />
              <Notifications message={notice} tone="error" />
            </>
          )}
          {recent}
        </div>
      ) : (
        <div className="space-y-3">
          {isAdmin ? (
            <PollCreateForm
              pollQuestion={pollQuestion}
              setPollQuestion={setPollQuestion}
              pollOptions={pollOptions}
              setPollOptions={setPollOptions}
              onCreatePoll={onCreatePoll}
              notice={notice}
            />
          ) : (
            <p className="text-xs text-sky-400/70">No active poll.</p>
          )}
          {recent}
        </div>
      )}
    </div>
  );
}
