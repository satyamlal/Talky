interface CreatePollButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function CreatePollButton({ onClick, disabled }: CreatePollButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full px-3 py-2 rounded-md border border-sky-400/60 text-sky-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Create Poll
    </button>
  );
}
