import { Notifications } from "../Notifications";

export interface CurrentPoll {
  question: string;
  options: { text: string; votes: number }[];
  userVote?: number;
}

interface PollPanelProps {
  isAdmin: boolean;
  currentPoll: CurrentPoll | null;
  pollQuestion: string;
  setPollQuestion: (v: string) => void;
  pollOptions: string[];
  setPollOptions: (opts: string[]) => void;
  onCreatePoll: () => void;
  onVote: (idx: number) => void;
  onEndPoll: () => void;
  notice?: string;
}

export function PollPanel({
  isAdmin,
  currentPoll,
  pollQuestion,
  setPollQuestion,
  pollOptions,
  setPollOptions,
  onCreatePoll,
  onVote,
  onEndPoll,
  notice,
}: PollPanelProps) {
  return (
    <div className="text-sky-300 space-y-4">
      <h3 className="text-lg font-semibold">Polls</h3>
      {currentPoll ? (
        <div className="space-y-3">
          <p className="text-sky-200 font-medium">{currentPoll.question}</p>
          <div className="space-y-2">
            {currentPoll.options.map((opt, idx) => (
              <label key={idx} className="flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="checkbox"
                    checked={currentPoll.userVote === idx}
                    onChange={() => onVote(idx)}
                    disabled={typeof currentPoll.userVote === "number"}
                    className="h-4 w-4 accent-sky-400"
                  />
                  <span className="text-sky-200 text-sm">{opt.text}</span>
                </div>
                <div className="text-sky-400 text-xs min-w-[2rem] text-right">{opt.votes}</div>
              </label>
            ))}
          </div>
          {isAdmin && (
            <>
              <button onClick={onEndPoll} className="w-full px-3 py-2 rounded-md border border-rose-400/60 text-rose-200">End Poll</button>
              <Notifications message={notice} tone="error" />
            </>
          )}
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
                    onClick={() => setPollOptions([...pollOptions, ""]) }
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
        </div>
      )}
    </div>
  );
}
