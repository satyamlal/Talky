import { useState } from "react";

interface Props {
  onCreatePrivate: () => void;
  onJoinWithLink: (value: string) => void;
}

export function PrivateCard({ onCreatePrivate, onJoinWithLink }: Props) {
  const [value, setValue] = useState("");

  return (
    <div className="rounded-2xl bg-[#0b1220]/80 border border-[#25304a] p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Create Private */}
        <div className="flex flex-col gap-3">
          <div className="text-sky-200 font-semibold">Private Rooms</div>
          <button
            onClick={onCreatePrivate}
            className="px-5 py-3 rounded-xl bg-[#5b47ff] text-white font-semibold hover:bg-[#6a57ff]"
          >
            Create Private Room
          </button>
        </div>

        {/* Join with link or code */}
        <div className="flex flex-col gap-3">
          <div className="text-sky-200 font-semibold">Join with a Link or Code</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter link or code..."
              className="flex-1 px-3 py-3 rounded-xl bg-[#0f172a] border border-[#2d3958] text-sky-100 placeholder:text-sky-400/50 focus:outline-none"
            />
            <button
              onClick={() => onJoinWithLink(value)}
              className="px-4 py-3 rounded-xl bg-[#2bb0ff] text-black font-semibold hover:bg-[#52c3ff]"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
