interface RemoveOptionButtonProps {
  onClick: () => void;
}

export function RemoveOptionButton({ onClick }: RemoveOptionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 rounded-md border border-rose-400/60 text-rose-200"
    >
      Remove
    </button>
  );
}
