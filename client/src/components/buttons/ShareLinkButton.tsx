interface ShareLinkButtonProps {
  shareLink: string | null;
  onClick: () => void;
}

export function ShareLinkButton({ shareLink, onClick }: ShareLinkButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-2 rounded-xl border border-sky-400/60 text-sky-200 hover:bg-sky-500/10 transition"
    >
      {shareLink ? "Share the Room Link" : "Create & Share Private Room"}
    </button>
  );
}
