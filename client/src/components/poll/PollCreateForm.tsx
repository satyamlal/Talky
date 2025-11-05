import { AddOptionButton } from "../buttons/poll/AddOptionButton";
import { RemoveOptionButton } from "../buttons/poll/RemoveOptionButton";
import { CreatePollButton } from "../buttons/poll/CreatePollButton";
import { Notifications } from "../Notifications";

interface PollCreateFormProps {
  pollQuestion: string;
  setPollQuestion: (v: string) => void;
  pollOptions: string[];
  setPollOptions: (opts: string[]) => void;
  onCreatePoll: () => void;
  notice?: string;
}

export function PollCreateForm({ pollQuestion, setPollQuestion, pollOptions, setPollOptions, onCreatePoll, notice }: PollCreateFormProps) {
  return (
    <div className="space-y-3">
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
              <RemoveOptionButton onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))} />
            )}
          </div>
        ))}
        {pollOptions.length < 5 && (
          <AddOptionButton
            onClick={() => {
              setPollOptions([...pollOptions, ""]);
              setTimeout(() => {
                const inputs = document.querySelectorAll<HTMLInputElement>("input[placeholder^='Option']");
                inputs[inputs.length - 1]?.focus();
              }, 0);
            }}
          />
        )}
      </div>
      <CreatePollButton onClick={onCreatePoll} />
      <Notifications message={notice} tone="error" />
    </div>
  );
}
