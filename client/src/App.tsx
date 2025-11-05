import { useEffect, useState, useRef } from "react";
import { LandingPage } from "./components/LandingPage";
import { ChatHeader } from "./components/ChatHeader";
import { PollPanel, type CurrentPoll } from "./components/poll/PollPanel";
import { InputBar } from "./components/chat/InputBar";
import { ShareLinkButton } from "./components/buttons/ShareLinkButton";
import { EndRoomButton } from "./components/buttons/EndRoomButton";
import { Notifications } from "./components/Notifications";
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

  interface PollUpdatedMessage {
    type: "pollUpdated";
    roomId: string;
    poll: null | {
      question: string;
      options: { text: string; votes: number }[];
      userVote?: number;
      votersCount?: number;
      totalEligible?: number;
      ended?: boolean;
    };
    pollHistory?: { question: string; options: { text: string; votes: number }[]; endedAt: number }[];
  }

  type Message =
    | ChatMessage
    | SystemMessage
    | UserCountMessage
    | UserColorMessage
    | RoomCreatedMessage
    | NeedVerificationMessage
    | VerifiedMessage
    | PollUpdatedMessage;

  function App() {
    // Only keep real chat messages in the center pane; route system messages to left-side notifications
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState<string>("");
    const [userCount, setUserCount] = useState<number>(0);
    const [userColor, setUserColor] = useState<string>("#6b7280");
    const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] =
      useState<string>("Connecting...");
    const [currentRoomId, setCurrentRoomId] = useState<string>("red");
    const [readyToJoin, setReadyToJoin] = useState<boolean>(false);
    const [showLanding, setShowLanding] = useState<boolean>(true);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const joinTokenRef = useRef<string | null>(null);
  const [currentPoll, setCurrentPoll] = useState<CurrentPoll | null>(null);
  const [pollHistory, setPollHistory] = useState<{ question: string; options: { text: string; votes: number }[]; endedAt: number }[]>([]);
  const [pollQuestion, setPollQuestion] = useState<string>("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]); // up to 5
  const [pollNotice, setPollNotice] = useState<string>("");
  const showPollNotice = (msg: string): void => {
    setPollNotice(msg);
    setTimeout(() => setPollNotice(""), 4500);
  };

  const [leftNoticeMsg, setLeftNoticeMsg] = useState<string>("");
  const [leftNoticeTone, setLeftNoticeTone] = useState<"info" | "error" | "success">("info");
  const showLeftNotice = (msg: string): void => {
    const lower = msg.toLowerCase();
    const tone: "info" | "error" | "success" = lower.includes("denied") || lower.includes("invalid") || lower.includes("failed")
      ? "error"
      : lower.includes("welcome") || lower.includes("connected")
      ? "success"
      : "info";
    setLeftNoticeTone(tone);
    setLeftNoticeMsg(msg);
    window.setTimeout(() => setLeftNoticeMsg(""), 4500);
  };

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
      
      let initialRoomId = "red";
      let initialToken: string | null = null;
      let hasRoomParam = false;
      try {
        const url = new URL(window.location.href);
        const roomParam = url.searchParams.get("room");
        const tokenParam = url.searchParams.get("token");
        if (roomParam) { initialRoomId = roomParam; hasRoomParam = true; }
        if (tokenParam) initialToken = tokenParam;
      } catch (err) {
        // ignore URL parse errors
        void err;
      }
      setCurrentRoomId(initialRoomId);
      joinTokenRef.current = initialToken;
      setShowLanding(!hasRoomParam);
      setReadyToJoin(hasRoomParam);

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
                // Build full share URL and extract the token so auto-join uses it
                const full = `${window.location.origin}/${
                  parsedMessage.link.startsWith("?")
                    ? parsedMessage.link
                    : `?room=${parsedMessage.roomId}`
                }`;
                let tokenFromLink: string | null = null;
                try {
                  const u = new URL(full);
                  tokenFromLink = u.searchParams.get("token");
                } catch {
                  tokenFromLink = null;
                }
                if (tokenFromLink) {
                  joinTokenRef.current = tokenFromLink;
                }
                setCurrentRoomId(parsedMessage.roomId);
                setShareLink(full);
                // optional: reflect the new room + token in browser URL for consistency
                try {
                  const linkOnly = parsedMessage.link.startsWith("?")
                    ? parsedMessage.link
                    : `?room=${parsedMessage.roomId}${tokenFromLink ? `&token=${tokenFromLink}` : ""}`;
                  window.history.pushState({}, "", linkOnly);
    } catch {/* no-op */}
    // Show this as a transient left notification only, not in the chat feed
    showLeftNotice(`Room created. Share this link: ${full}`);
          } else if (
            parsedMessage.type === "system" ||
            parsedMessage.type === "chat"
          ) {
            if (parsedMessage.type === "chat") {
              setMessages((prevMessages) => [
                ...prevMessages,
                parsedMessage as ChatMessage,
              ]);
            } else {
              const sys = parsedMessage as SystemMessage;
              if (sys.message) showLeftNotice(sys.message);
            }
          } else if (parsedMessage.type === "pollUpdated") {
            setCurrentPoll(parsedMessage.poll);
            setPollHistory(parsedMessage.pollHistory || []);
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
          console.error("Failed to parse message:", error, event.data);
          try {
            if (typeof event.data === "string" && event.data.trim()) {
              showLeftNotice(event.data);
            }
          } catch {
            // ignore
          }
        }
      };

      ws.onopen = (): void => {
        setConnectionStatus("Connected");
        if (hasRoomParam) {
          ws.send(
            JSON.stringify({
              type: "join",
              payload: {
                roomId: initialRoomId,
                token: initialToken || undefined,
              },
            })
          );
        }
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

    // --- Landing interactions ---
    const [showPrivateLinkModal, setShowPrivateLinkModal] = useState(false);
    const [privateLinkInput, setPrivateLinkInput] = useState("");

    const joinPublic = (): void => {
      setShowLanding(false);
      setReadyToJoin(true);
      joinTokenRef.current = null;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "join", payload: { roomId: "red" } })
        );
      }
    };

    // Legacy modal join flow not used on the new landing page
  // Legacy modal join flow removed in favor of on-page join with link

    const handleJoinWithLink = (value: string): void => {
      let roomParam: string | null = null;
      let tokenParam: string | null = null;
      const raw = (value || "").trim();
      if (!raw) return;
      try {
        // Support full URLs (preferred)
        const url = raw.startsWith("http") ? new URL(raw) : new URL(window.location.origin + "/" + (raw.startsWith("?") ? raw : `?${raw}`));
        roomParam = url.searchParams.get("room");
        tokenParam = url.searchParams.get("token");
      } catch {
        // Fallback: support "roomId:token" pattern
        if (raw.includes(":")) {
          const [r, t] = raw.split(":");
          roomParam = r || null;
          tokenParam = t || null;
        }
      }
      if (!roomParam || !tokenParam) return;
      setCurrentRoomId(roomParam);
      joinTokenRef.current = tokenParam;
      const newSearch = `?room=${roomParam}&token=${tokenParam}`;
  try { window.history.pushState({}, "", newSearch); } catch { /* no-op */ }
      setShowPrivateLinkModal(false);
      setShowLanding(false);
      setReadyToJoin(true);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "join", payload: { roomId: roomParam, token: tokenParam } })
        );
      }
    };

    useEffect(() => {
      if (
        readyToJoin &&
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN
      ) {
        wsRef.current.send(
          JSON.stringify({
            type: "join",
            payload: {
              roomId: currentRoomId || "red",
              token: joinTokenRef.current || undefined,
            },
          })
        );
      }
    }, [readyToJoin, currentRoomId]);

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

    // --- Poll actions ---
    const handleCreatePoll = (): void => {
      if (!wsRef.current || !isAdmin) return;
      const options = pollOptions.map((s) => s.trim()).filter((s) => s);
      if (!pollQuestion.trim() || options.length < 2) {
        showPollNotice("Provide a question and at least 2 options.");
        return;
      }
      if (options.length > 5) {
        showPollNotice("Maximum 5 options allowed.");
        return;
      }
      wsRef.current.send(
        JSON.stringify({
          type: "createPoll",
          payload: { roomId: currentRoomId, question: pollQuestion.trim(), options },
        })
      );
      setPollQuestion("");
      setPollOptions(["", ""]);
    };

    const handleVotePoll = (index: number): void => {
      if (!wsRef.current) return;
      // prevent voting again on client side once voted
      if (currentPoll && typeof currentPoll.userVote === "number") return;
      wsRef.current.send(
        JSON.stringify({ type: "votePoll", payload: { roomId: currentRoomId, optionIndex: index } })
      );
    };

    const handleEndPoll = (): void => {
      if (!wsRef.current || !isAdmin) return;
      wsRef.current.send(
        JSON.stringify({ type: "endPoll", payload: { roomId: currentRoomId } })
      );
    };

    const handleRestartPoll = (historyIndex: number): void => {
      if (!wsRef.current || !isAdmin) return;
      wsRef.current.send(
        JSON.stringify({ type: "restartPoll", payload: { roomId: currentRoomId, historyIndex } })
      );
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter") {
        handleSendMessage();
      }
    };

    const getMessageStyle = (
      message: ChatMessage
    ): React.CSSProperties => {
      if (message.color) {
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
    {showLanding ? (
      <LandingPage
        onJoinPublic={joinPublic}
        onCreatePrivate={() => handleCreateOrCopyLink()}
        onJoinWithLink={(val) => handleJoinWithLink(val)}
      />
    ) : (
    <div className="w-full max-w-7xl h-full min-h-0 grid grid-cols-12 gap-4">
          {/* Left panel */}
          <div className="col-span-12 sm:col-span-3 border border-sky-500/40 rounded-3xl p-4 bg-black/40">
            <div className="text-sky-300 h-full flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-sky-300">Join a Public Room</h3>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-sky-300">Join a Private Room</h3>
                </div>
              </div>
              <div className="mt-8 space-y-3">
                <Notifications message={leftNoticeMsg} tone={leftNoticeTone} />
                <ShareLinkButton shareLink={shareLink} onClick={handleCreateOrCopyLink} />
                <EndRoomButton isAdmin={isAdmin} onClick={handleEndRoom} />
              </div>
            </div>
          </div>

          {/* Center (original chat window */}
          <div className="col-span-12 sm:col-span-6 flex items-stretch min-h-0">
            <div className="w-full max-w-4xl mx-auto h-full min-h-0 flex flex-col bg-black border border-[#25304a] rounded-3xl overflow-hidden">
              {/* Header */}
              <ChatHeader connectionStatus={connectionStatus} userCount={userCount} topic="WebSockets" />

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
                            className={`chat-message backdrop-blur-sm rounded-2xl rounded-tl-md shadow-lg px-4 py-3 break-words bg-gray-800 bg-opacity-70`}
                            style={getMessageStyle(message)}
                          >
                            <p className="text-xs font-semibold mb-1 break-words" style={{ color: message.color }}>
                              {message.username}
                            </p>
                            <p className="text-gray-100 text-sm leading-relaxed break-words overflow-wrap-anywhere">
                              {message.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Input Area */}
              <InputBar
                inputRef={inputRef}
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                onSend={handleSendMessage}
                onKeyPress={handleKeyPress}
                isInputFocused={isInputFocused}
                setIsInputFocused={setIsInputFocused}
                userColor={userColor}
                connectionStatus={connectionStatus}
              />
            </div>
          </div>

          {/* Right panel: Polls */}
          <div className="col-span-12 sm:col-span-3 border border-sky-500/40 rounded-3xl p-4 bg-black/40">
            <PollPanel
              isAdmin={isAdmin}
              currentPoll={currentPoll}
              pollHistory={pollHistory}
              pollQuestion={pollQuestion}
              setPollQuestion={setPollQuestion}
              pollOptions={pollOptions}
              setPollOptions={setPollOptions}
              onCreatePoll={handleCreatePoll}
              onVote={handleVotePoll}
              onEndPoll={handleEndPoll}
              onRestartPoll={handleRestartPoll}
              notice={pollNotice}
            />
          </div>
        </div>
    )}
    {showPrivateLinkModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="w-full max-w-md rounded-2xl border border-sky-500/40 bg-gray-900 p-6 text-sky-100">
          <h3 className="text-lg font-semibold mb-4">Enter the private room link</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Paste the link here"
              value={privateLinkInput}
              onChange={(e) => setPrivateLinkInput(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 focus:outline-none"
            />
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setShowPrivateLinkModal(false)} className="px-3 py-2 rounded-md border border-gray-500/60">Cancel</button>
              <button onClick={() => handleJoinWithLink(privateLinkInput)} className="px-3 py-2 rounded-md border border-sky-400/60">Continue</button>
            </div>
          </div>
        </div>
      </div>
    )}
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
