interface Props {
  onJoinPublic: () => void;
}

export function PublicCard({ onJoinPublic }: Props) {
  return (
    <div className="rounded-2xl bg-[#0b1220]/80 border border-[#25304a] p-6">
      <div className="text-sky-200 font-semibold mb-3">Public Rooms</div>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={onJoinPublic}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-semibold hover:from-cyan-300 hover:to-emerald-300"
        >
          Join a Public Room
        </button>
        <button className="px-4 py-2 rounded-xl bg-[#0f172a] border border-[#2d3958] text-sky-200/80 hover:bg-[#141c2f]">
          View All Public Rooms
        </button>
      </div>
    </div>
  );
}
