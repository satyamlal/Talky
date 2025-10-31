type Tone = "info" | "error" | "success";

interface NotificationsProps {
  message?: string;
  tone?: Tone;
}

export function Notifications({ message, tone = "info" }: NotificationsProps) {
  if (!message) return null;
  const color =
    tone === "error" ? "text-rose-300" : tone === "success" ? "text-emerald-300" : "text-sky-300";
  return <p className={`text-xs ${color} text-center`}>{message}</p>;
}
