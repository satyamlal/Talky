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

  interface RoomCreatedMessage {
    type: "roomCreated";
    roomId: string;
    isPrivate: boolean;
    link: string; // path part, e.g., ?room=abc&token=xyz
  }

  interface NeedVerificationMessage {
    type: "needVerification";
    roomId: string;
  }

  interface VerifiedMessage {
    type: "verified";
    roomId: string;
  }

  type Message =
    | ChatMessage
    | SystemMessage
    | UserCountMessage
    | UserColorMessage
    | RoomCreatedMessage
    | NeedVerificationMessage
    | VerifiedMessage;

  function App() {
    const [messages, setMessages] = useState<(ChatMessage | SystemMessage)[]>([]);
    const [inputMessage, setInputMessage] = useState<string>("");
    const [userCount, setUserCount] = useState<number>(0);
    const [userColor, setUserColor] = useState<string>("#6b7280");
    const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] =
      useState<string>("Connecting...");
    const [currentRoomId, setCurrentRoomId] = useState<string>("red");
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const joinTokenRef = useRef<string | null>(null);

    const scrollToBottom = (): void => {
      const el = messagesContainerRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    };

    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    useEffect(() => {
      if (connectionStatus === "Connected" && inputRef.current) {
        inputRef.current.focus();
      }
    }, [connectionStatus]);

    useEffect(() => {
      const wsUrl: string =
        import.meta.env.VITE_WS_URL ||
        (import.meta.env.DEV
          ? "ws://localhost:8080"
          : "wss://talky-1ftp.onrender.com");
      // Parse link params for room & token
      let initialRoomId = "red";
      let initialToken: string | null = null;
      try {
        const url = new URL(window.location.href);
        const roomParam = url.searchParams.get("room");
        const tokenParam = url.searchParams.get("token");
        if (roomParam) initialRoomId = roomParam;
        if (tokenParam) initialToken = tokenParam;
      } catch (err) {
        // ignore URL parse errors
        void err;
      }
      setCurrentRoomId(initialRoomId);
      joinTokenRef.current = initialToken;

      const ws: WebSocket = new WebSocket(wsUrl);

      ws.onmessage = (event: MessageEvent) => {
        try {
          const parsedMessage: Message = JSON.parse(event.data);

          if (parsedMessage.type === "userCount") {
            setUserCount(parsedMessage.count);
          } else if (parsedMessage.type === "userColor") {
            setUserColor(parsedMessage.color);
          } else if (parsedMessage.type === "roomCreated") {
            setIsAdmin(true);
            setCurrentRoomId(parsedMessage.roomId);
            const full = `${window.location.origin}/${
              parsedMessage.link.startsWith("?")
                ? parsedMessage.link
                : `?room=${parsedMessage.roomId}`
            }`;
            setShareLink(full);
            // also show in chat as system message
            setMessages((prev) => [
              ...prev,
              {
                type: "system",
                message: `Room created. Share this link: ${full}`,
              } as SystemMessage,
            ]);
          } else if (
            parsedMessage.type === "system" ||
            parsedMessage.type === "chat"
          ) {
            setMessages((prevMessages) => [
              ...prevMessages,
              parsedMessage as ChatMessage | SystemMessage,
            ]);
          } else if (parsedMessage.type === "needVerification") {
            setShowVerifyModal(true);
            setPendingRoomId(parsedMessage.roomId);
          } else if (parsedMessage.type === "verified") {
            // auto-join after verification
            setShowVerifyModal(false);
            const r = parsedMessage.roomId;
            wsRef.current?.send(
              JSON.stringify({
                type: "join",
                payload: { roomId: r, token: joinTokenRef.current || undefined },
              })
            );
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
              roomId: initialRoomId,
              token: initialToken || undefined,
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

      if (inputMessage.trim().startsWith("/create")) {
        const name = inputMessage.trim().slice(7).trim() || undefined;
        wsRef.current?.send(
          JSON.stringify({
            type: "createRoom",
            payload: { name },
          })
        );
      } else {
        wsRef.current?.send(
          JSON.stringify({
            type: "chat",
            payload: {
              message: inputMessage,
            },
          })
        );
      }
      setInputMessage("");
    };

  const handleCreateOrCopyLink = (): void => {
      if (!wsRef.current) return;
      if (shareLink) {
        navigator.clipboard.writeText(shareLink).then(() => {
          alert("Room link copied to clipboard.");
        });
        return;
      }

      wsRef.current.send(
        JSON.stringify({
          type: "createRoom",
          payload: { name: undefined },
        })
      );
    };

    // --- Email OTP modal state & handlers ---
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyEmail, setVerifyEmail] = useState("");
    const [verifyOtp, setVerifyOtp] = useState("");
    const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
    const [verifyInfo, setVerifyInfo] = useState<string>("");

    const handleRequestOtp = (): void => {
      if (!wsRef.current || !pendingRoomId || !verifyEmail) return;
      setVerifyInfo("Sending OTP...");
      wsRef.current.send(
        JSON.stringify({
          type: "requestOtp",
          payload: { roomId: pendingRoomId, email: verifyEmail },
        })
      );
    };

    const handleVerifyOtp = (): void => {
      if (!wsRef.current || !pendingRoomId || !verifyEmail || !verifyOtp) return;
      setVerifyInfo("Verifying...");
      wsRef.current.send(
        JSON.stringify({
          type: "verifyOtp",
          payload: { roomId: pendingRoomId, email: verifyEmail, otp: verifyOtp },
        })
      );
    };

    const handleEndRoom = (): void => {
      if (!wsRef.current || !isAdmin || !currentRoomId) return;
      wsRef.current.send(
        JSON.stringify({
          type: "endRoom",
          payload: { roomId: currentRoomId },
        })
      );
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
        className="h-screen w-screen flex flex-col bg-black relative overflow-hidden items-center justify-start p-4"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      >
    <div className="w-full max-w-7xl h-full min-h-0 grid grid-cols-12 gap-4">
          {/* Left panel */}
          <div className="col-span-12 sm:col-span-3 border border-sky-500/40 rounded-3xl p-4 bg-black/40">
            <div className="space-y-6 text-sky-300">
              <div>
                <h3 className="text-lg font-semibold text-sky-300">Join a Public Room</h3>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-sky-300">Join a Private Room</h3>
                <p className="text-xs text-sky-400/70 pl-4">Verify your email to join a Private Room</p>
              </div>

              <div className="pt-8">
                <button
                  onClick={handleCreateOrCopyLink}
                  className="w-full px-4 py-2 rounded-xl border border-sky-400/60 text-sky-200 hover:bg-sky-500/10 transition"
                >
                  {shareLink ? "Share the Room Link" : "Create & Share Private Room"}
                </button>
              </div>
              <div>
                <button
                  onClick={handleEndRoom}
                  disabled={!isAdmin}
                  className="w-full px-4 py-2 rounded-xl border border-rose-400/60 text-rose-200 disabled:opacity-40"
                  title={isAdmin ? "Only admin can end the room" : "Create a room first to enable"}
                >
                  End this room
                </button>
              </div>
            </div>
          </div>

          {/* Center (original chat window, unchanged) */}
          <div className="col-span-12 sm:col-span-6 flex items-stretch min-h-0">
            <div className="w-full max-w-4xl mx-auto h-full min-h-0 flex flex-col bg-black border border-[#25304a] rounded-3xl overflow-hidden">
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

                    <span className="text-sm text-gray-300">online : {userCount}</span>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div ref={messagesContainerRef} className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4">
                <div className="mx-auto space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-gray-500 text-4xl mb-4 ">💬</div>
                      <p className="text-gray-400 text-lg">No messages yet</p>
                      <p className="text-gray-500 text-sm">Start the conversation!</p>

                      {userCount > 0 && (
                        <p className="text-gray-500 text-xs mt-2">
                          {userCount} {userCount === 1 ? "person is" : "people are"} in this room
                        </p>
                      )}
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div key={index} className="flex justify-start">
                        <div className="max-w-xs lg:max-w-md xl:max-w-lg w-full">
                          <div
                            className={`chat-message backdrop-blur-sm rounded-2xl rounded-tl-md shadow-lg px-4 py-3 break-words ${
                              message.type === "system" ? "bg-gray-800 bg-opacity-90" : "bg-gray-800 bg-opacity-70"
                            }`}
                            style={getMessageStyle(message)}
                          >
                            {message.type === "chat" && (
                              <p className="text-xs font-semibold mb-1 break-words" style={{ color: message.color }}>
                                {message.username}
                              </p>
                            )}
                            <p className="text-gray-100 text-sm leading-relaxed break-words overflow-wrap-anywhere">
                              {message.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {message.type === "chat"
                                ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {/* sentinel removed; container scroll is controlled programmatically */}
                </div>
              </div>

              {/* Input Area */}
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
                          onKeyPress={handleKeyPress}
                          placeholder="Type your message..."
                          className="w-full px-4 py-3 pr-12 text-white placeholder-gray-400 bg-gray-800 bg-opacity-80 border-2 rounded-2xl focus:outline-none backdrop-blur-sm transition-all duration-200"
                          style={{
                            borderColor: isInputFocused ? userColor : "#4b5563",
                            boxShadow: isInputFocused ? `0 0 0 2px ${userColor}40` : "0 0 0 2px rgba(75, 85, 99, 0.2)",
                          }}
                          onFocus={() => {
                            setIsInputFocused(true);
                          }}
                          onBlur={() => {
                            setIsInputFocused(false);
                          }}
                          disabled={connectionStatus !== "Connected"}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || connectionStatus !== "Connected"}
                      className="flex items-center justify-center w-12 h-12 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-full transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-lg"
                      style={{
                        background:
                          connectionStatus === "Connected" && (inputMessage.trim() || isInputFocused)
                            ? `linear-gradient(135deg, ${userColor}dd, ${userColor}aa)`
                            : "#4b5563",
                        boxShadow:
                          connectionStatus === "Connected" && (inputMessage.trim() || isInputFocused)
                            ? `0 4px 14px 0 ${userColor}40, 0 0 0 2px ${userColor}20`
                            : "0 4px 14px 0 rgba(75, 85, 99, 0.4)",
                      }}
                      onMouseEnter={(e) => {
                        if (connectionStatus === "Connected" && (inputMessage.trim() || isInputFocused)) {
                          e.currentTarget.style.background = `linear-gradient(135deg, ${userColor}, ${userColor}cc)`;
                          e.currentTarget.style.boxShadow = `0 6px 20px 0 ${userColor}50, 0 0 0 2px ${userColor}30`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (connectionStatus === "Connected" && (inputMessage.trim() || isInputFocused)) {
                          e.currentTarget.style.background = `linear-gradient(135deg, ${userColor}dd, ${userColor}aa)`;
                          e.currentTarget.style.boxShadow = `0 4px 14px 0 ${userColor}40, 0 0 0 2px ${userColor}20`;
                        }
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel placeholder for future (polls, allowed domains) */}
          <div className="col-span-12 sm:col-span-3 border border-sky-500/40 rounded-3xl p-4 bg-black/40">
            <div className="text-sky-300">
              <h3 className="text-lg font-semibold mb-2">Create a Poll</h3>
              <p className="text-xs text-sky-400/70">(Coming next. Chat window stays unchanged.)</p>
            </div>
          </div>
        </div>
        {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl border border-sky-500/40 bg-gray-900 p-6 text-sky-100">
            <h3 className="text-lg font-semibold mb-4">Verify your email to join</h3>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="your@email"
                value={verifyEmail}
                onChange={(e) => setVerifyEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button onClick={handleRequestOtp} className="px-3 py-2 rounded-md border border-sky-400/60">Send OTP</button>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={verifyOtp}
                  onChange={(e) => setVerifyOtp(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md bg-gray-800 border border-gray-700 focus:outline-none"
                />
                <button onClick={handleVerifyOtp} className="px-3 py-2 rounded-md border border-emerald-400/60">Verify</button>
              </div>
              {verifyInfo && <p className="text-xs text-sky-300">{verifyInfo}</p>}
            </div>
          </div>
        </div>
        )}
      </div>
    );
  }

  export default App;
