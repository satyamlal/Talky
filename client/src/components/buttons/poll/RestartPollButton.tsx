interface RestartPollButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function RestartPollButton({ onClick, disabled }: RestartPollButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-1 rounded-md border text-xs ${disabled ? 'border-gray-600 text-gray-500 cursor-not-allowed' : 'border-emerald-400/60 text-emerald-200'}`}
    >
      Restart Poll
    </button>
  );
}
