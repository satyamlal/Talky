interface ChatHeaderProps {
  connectionStatus: string;
  userCount: number;
  topic?: string;
}

export function ChatHeader({ connectionStatus, userCount, topic = "WebSockets" }: ChatHeaderProps) {
  const statusClass =
    connectionStatus === "Connected" && userCount > 0
      ? "bg-green-400 animate-pulse"
      : connectionStatus === "Connected"
      ? "bg-yellow-400"
      : "bg-red-400";

  return (
    <div className="relative m-2 rounded-2xl z-10 bg-gray-900 bg-opacity-90 backdrop-blur-sm border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Chat Room</h1>
          <p className="text-sm text-gray-400 pl-6">Topic : {topic}</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`h-3 w-3 rounded-full ${statusClass}`}></div>
          <span className="text-sm text-gray-300">online : {userCount}</span>
        </div>
      </div>
    </div>
  );
}
