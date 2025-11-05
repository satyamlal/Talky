interface AddOptionButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function AddOptionButton({ onClick, disabled }: AddOptionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full px-3 py-2 rounded-md border border-sky-400/60 text-sky-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Add Option
    </button>
  );
}
