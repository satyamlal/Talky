import { SendIcon } from "../icons/SendIcon";

interface InputBarProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputMessage: string;
  setInputMessage: (v: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isInputFocused: boolean;
  setIsInputFocused: (v: boolean) => void;
  userColor: string;
  connectionStatus: string;
}

export function InputBar({
  inputRef,
  inputMessage,
  setInputMessage,
  onSend,
  onKeyPress,
  isInputFocused,
  setIsInputFocused,
  userColor,
  connectionStatus,
}: InputBarProps) {
  const canSend = connectionStatus === "Connected" && !!inputMessage.trim();
  return (
    <div className="relative m-2 rounded-2xl z-10 bg-gray-900 bg-opacity-90 backdrop-blur-sm border-t border-gray-700 px-4 py-4">
      <div className="max-w-4xl mx-auto rounded-3xl ">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
                onKeyPress={onKeyPress}
                placeholder="Type your message..."
                className="w-full px-4 py-3 pr-12 text-white placeholder-gray-400 bg-gray-800 bg-opacity-80 border-2 rounded-2xl focus:outline-none backdrop-blur-sm transition-all duration-200"
                style={{
                  borderColor: isInputFocused ? userColor : "#4b5563",
                  boxShadow: isInputFocused ? `0 0 0 2px ${userColor}40` : "0 0 0 2px rgba(75, 85, 99, 0.2)",
                }}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                disabled={connectionStatus !== "Connected"}
              />
            </div>
          </div>
          <button
            onClick={onSend}
            disabled={!canSend}
            className="flex items-center justify-center w-12 h-12 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-full transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-lg"
            style={{
              background:
                canSend
                  ? `linear-gradient(135deg, ${userColor}dd, ${userColor}aa)`
                  : "#4b5563",
              boxShadow:
                canSend
                  ? `0 4px 14px 0 ${userColor}40, 0 0 0 2px ${userColor}20`
                  : "0 4px 14px 0 rgba(75, 85, 99, 0.4)",
            }}
            onMouseEnter={(e) => {
              if (canSend) {
                e.currentTarget.style.background = `linear-gradient(135deg, ${userColor}, ${userColor}cc)`;
                e.currentTarget.style.boxShadow = `0 6px 20px 0 ${userColor}50, 0 0 0 2px ${userColor}30`;
              }
            }}
            onMouseLeave={(e) => {
              if (canSend) {
                e.currentTarget.style.background = `linear-gradient(135deg, ${userColor}dd, ${userColor}aa)`;
                e.currentTarget.style.boxShadow = `0 4px 14px 0 ${userColor}40, 0 0 0 2px ${userColor}20`;
              }
            }}
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
