interface LandingPageProps {
  onJoinPublic: () => void;
  onOpenPrivate: () => void;
}

export function LandingPage({ onJoinPublic, onOpenPrivate }: LandingPageProps) {
  return (
    <div className="w-full max-w-3xl h-full min-h-0 grid place-items-center">
      <div className="w-full max-w-xl border border-sky-500/40 rounded-3xl bg-black/40 p-8 text-sky-300">
        <div className="flex flex-col items-center gap-6">
          <button
            onClick={onJoinPublic}
            className="w-80 px-6 py-3 rounded-xl border border-sky-400/60 hover:bg-sky-500/10"
          >
            Join a Public Room
          </button>
          <button
            onClick={onOpenPrivate}
            className="w-80 px-6 py-3 rounded-xl border border-sky-400/60 hover:bg-sky-500/10"
          >
            Join a Private Room
          </button>
        </div>
      </div>
    </div>
  );
}
