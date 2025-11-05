interface EndPollButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function EndPollButton({ onClick, disabled }: EndPollButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full px-3 py-2 rounded-md border border-rose-400/60 text-rose-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      End Poll
    </button>
  );
}
