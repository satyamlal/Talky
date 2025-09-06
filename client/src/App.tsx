import { useEffect, useState, useRef } from "react";
import "./App.css";

interface ChatMessage {
  type: "chat";
  message: string;
  userId: string;
  username: string;
  color: string;
  timestamp: string;
}

interface SystemMessage {
  type: "system";
  message: string;
  userId?: string;
  color?: string;
}

interface UserCountMessage {
  type: "userCount";
  count: number;
}

interface UserColorMessage {
  type: "userColor";
  color: string;
  username: string;
}

type Message = ChatMessage | SystemMessage | UserCountMessage | UserColorMessage;

function App() {
  const [messages, setMessages] = useState<(ChatMessage | SystemMessage)[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [userCount, setUserCount] = useState<number>(0);
  const [userColor, setUserColor] = useState<string>("#6b7280"); // Default gray color
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Connecting...");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const wsUrl: string =
      import.meta.env.VITE_WS_URL ||
      (import.meta.env.DEV
        ? "ws://localhost:8080"
        : "wss://talky-1ftp.onrender.com");

    const ws: WebSocket = new WebSocket(wsUrl);

    ws.onmessage = (event: MessageEvent) => {
      try {
        const parsedMessage: Message = JSON.parse(event.data);

        if (parsedMessage.type === "userCount") {
          setUserCount(parsedMessage.count);
        } else if (parsedMessage.type === "userColor") {
          setUserColor(parsedMessage.color);
        } else if (
          parsedMessage.type === "system" ||
          parsedMessage.type === "chat"
        ) {
          setMessages((prevMessages) => [
            ...prevMessages,
            parsedMessage as ChatMessage | SystemMessage,
          ]);
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
        const systemMessage: SystemMessage = {
          type: "system",
          message: event.data,
        };
        setMessages((prevMessages) => [...prevMessages, systemMessage]);
      }
    };

    ws.onopen = (): void => {
      setConnectionStatus("Connected");

      ws.send(
        JSON.stringify({
          type: "join",
          payload: {
            roomId: "red",
          },
        })
      );
    };

    ws.onerror = (error: Event): void => {
      console.error("WebSocket error:", error);
      setConnectionStatus("Connection Error");
    };

    ws.onclose = (): void => {
      setConnectionStatus("Disconnected");
      setUserCount(0);
    };

    wsRef.current = ws;

    return (): void => {
      ws.close();
    };
  }, []);

  const handleSendMessage = (): void => {
    if (!inputMessage.trim()) return;

    wsRef.current?.send(
      JSON.stringify({
        type: "chat",
        payload: {
          message: inputMessage,
        },
      })
    );
    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const getMessageStyle = (
    message: ChatMessage | SystemMessage
  ): React.CSSProperties => {
    if (message.type === "chat" && message.color) {
      return {
        borderLeft: `4px solid ${message.color}`,
      };
    }
    return {};
  };

  return (
    <div
      className="h-screen w-screen flex flex-col bg-black relative overflow-hidden items-center justify-center p-4"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: "20px 20px",
      }}
    >
      <div className="w-full max-w-4xl h-full flex flex-col bg-black border border-[#25304a] rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="relative m-2 rounded-2xl z-10 bg-gray-900 bg-opacity-90 backdrop-blur-sm border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">Chat Room</h1>
              <p className="text-sm text-gray-400 pl-6">Topic : WebSockets</p>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  connectionStatus === "Connected" && userCount > 0
                    ? "bg-green-400 animate-pulse"
                    : connectionStatus === "Connected"
                    ? "bg-yellow-400"
                    : "bg-red-400"
                }`}
              ></div>

              <span className="text-sm text-gray-300">
                online : {userCount}
              </span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4">
          <div className="mx-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 text-4xl mb-4 ">💬</div>
                <p className="text-gray-400 text-lg">No messages yet</p>
                <p className="text-gray-500 text-sm">Start the conversation!</p>

                {userCount > 0 && (
                  <p className="text-gray-500 text-xs mt-2">
                    {userCount} {userCount === 1 ? "person is" : "people are"}{" "}
                    in this room
                  </p>
                )}
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className="flex justify-start">
                  <div className="max-w-xs lg:max-w-md xl:max-w-lg w-full">
                    <div
                      className={`chat-message backdrop-blur-sm rounded-2xl rounded-tl-md shadow-lg px-4 py-3 break-words ${
                        message.type === "system"
                          ? "bg-gray-800 bg-opacity-90"
                          : "bg-gray-800 bg-opacity-70"
                      }`}
                      style={getMessageStyle(message)}
                    >
                      {message.type === "chat" && (
                        <p
                          className="text-xs font-semibold mb-1 break-words"
                          style={{ color: message.color }}
                        >
                          {message.username}
                        </p>
                      )}
                      <p className="text-gray-100 text-sm leading-relaxed break-words overflow-wrap-anywhere">
                        {message.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {message.type === "chat"
                          ? new Date(message.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : new Date().toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="relative m-2 rounded-2xl z-10 bg-gray-900 bg-opacity-90 backdrop-blur-sm border-t border-gray-700 px-4 py-4">
          <div className="max-w-4xl mx-auto rounded-3xl ">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setInputMessage(e.target.value)
                    }
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="w-full px-4 py-3 pr-12 text-white placeholder-gray-400 bg-gray-800 bg-opacity-80 border-2 rounded-2xl focus:outline-none backdrop-blur-sm transition-all duration-200"
                    style={{
                      borderColor: userColor,
                      boxShadow: `0 0 0 2px ${userColor}20`, // 20 is for transparency
                    }}
                    onFocus={(e) => {
                      e.target.style.boxShadow = `0 0 0 2px ${userColor}60`;
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = `0 0 0 2px ${userColor}20`;
                    }}
                    disabled={connectionStatus !== "Connected"}
                  />
                </div>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={
                  !inputMessage.trim() || connectionStatus !== "Connected"
                }
                className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-full transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-lg"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
