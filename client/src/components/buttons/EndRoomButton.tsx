interface EndRoomButtonProps {
  isAdmin: boolean;
  onClick: () => void;
}

export function EndRoomButton({ isAdmin, onClick }: EndRoomButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={!isAdmin}
      className="w-full px-4 py-2 rounded-xl border border-rose-400/60 text-rose-200 disabled:opacity-40"
      title={isAdmin ? "Only admin can end the room" : "Create a room first to enable"}
    >
      End this room
    </button>
  );
}
