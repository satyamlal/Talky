import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { request as httpsRequest } from "https";
import { networkInterfaces } from "os";

const server = createServer();
const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ server });

const generateUniqueColor = (roomId: string): string => {
  const usersInRoom = allSockets.filter((user) => user.room === roomId);
  const usedColors = usersInRoom.map((user) => user.color);

  let newColor: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    const hue = Math.floor(Math.random() * 360);
    const saturation = Math.floor(Math.random() * 21) + 70;
    const lightness = Math.floor(Math.random() * 31) + 45;

    newColor = hslToHex(hue, saturation, lightness);
    attempts++;

    if (attempts >= maxAttempts) break;
  } while (usedColors.includes(newColor));

  return newColor;
};

// Converting HSL to HEX color
const hslToHex = (h: number, s: number, l: number): string => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

interface User {
  socket: WebSocket;
  room: string;
  userId: string;
  username: string;
  color: string;
}

interface ChatMessage {
  type: "chat";
  payload: {
    message: string;
    userId: string;
    color: string;
    timestamp: string;
  };
}

interface JoinMessage {
  type: "join";
  payload: {
    roomId: string;
    token?: string;
  };
}

interface PingMessage {
  type: "ping";
  payload: {
    roomId: string;
  };
}

type MessageType = ChatMessage | JoinMessage | PingMessage;

let allSockets: User[] = [];

// ----- Rooms (in-memory, ephemeral) -----
interface Room {
  id: string;
  name?: string;
  adminUserId: string;
  isPrivate: boolean;
  joinToken: string;
  allowedDomains: Set<string>;
  poll?: {
    question: string;
    options: { text: string; votes: number }[];
    votesByUserId: Map<string, number>;
    ended?: boolean;
  };
  pollHistory?: Array<{
    question: string;
    options: { text: string; votes: number }[];
    endedAt: number;
    votersCount?: number;
    totalEligible?: number;
  }>;
}

const rooms = new Map<string, Room>();

interface CreateRoomMessage {
  type: "createRoom";
  payload: {
    name?: string;
    isPrivate?: boolean;
  };
}

interface EndRoomMessage {
  type: "endRoom";
  payload: {
    roomId: string;
  };
}

interface RequestOtpMessage {
  type: "requestOtp";
  payload: {
    roomId: string;
    email: string;
  };
}

interface VerifyOtpMessage {
  type: "verifyOtp";
  payload: {
    roomId: string;
    email: string;
    otp: string;
  };
}

type ExtendedMessageType =
  | MessageType
  | CreateRoomMessage
  | EndRoomMessage
  | RequestOtpMessage
  | VerifyOtpMessage
  | CreatePollMessage
  | VotePollMessage
  | EndPollMessage
  | RestartPollMessage
  | RestartCurrentPollMessage;

interface CreatePollMessage {
  type: "createPoll";
  payload: {
    roomId: string;
    question: string;
    options: string[];
  };
}

interface VotePollMessage {
  type: "votePoll";
  payload: {
    roomId: string;
    optionIndex: number;
  };
}

interface EndPollMessage {
  type: "endPoll";
  payload: {
    roomId: string;
  };
}

interface RestartPollMessage {
  type: "restartPoll";
  payload: {
    roomId: string;
    historyIndex: number; // index based on latest-first ordering
  };
}

interface RestartCurrentPollMessage {
  type: "restartCurrentPoll";
  payload: {
    roomId: string;
  };
}

const generateUserId = (): string =>
  `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

const getNextAvailableUsername = (): string => {
  const existingNumbers = allSockets
    .map((user) => {
      const match = user.username.match(/^User-(\d+)$/);
      return match && match[1] ? parseInt(match[1]) : 0;
    })
    .filter((num) => num > 0)
    .sort((a, b) => a - b);

  let nextNumber = 1;
  for (const num of existingNumbers) {
    if (num === nextNumber) {
      nextNumber++;
    } else {
      break;
    }
  }

  return `User-${nextNumber}`;
};

const getNextAvailableColor = (roomId: string): string => {
  return generateUniqueColor(roomId);
};

const broadcastUserCount = (roomId: string) => {
  const usersInRoom = allSockets.filter((user) => user.room === roomId);
  const roomUserCount = usersInRoom.length;

  usersInRoom.forEach((user) => {
    try {
      const countMessage = JSON.stringify({
        type: "userCount",
        count: roomUserCount,
      });

      if (user.socket.readyState === WebSocket.OPEN) {
        user.socket.send(countMessage);
      }
    } catch (error) {
      console.error(`Failed to send userCount to user ${user.userId}:`, error);
    }
  });
};

// ---- Poll helpers ----
const sendPollToUser = (socket: WebSocket, room: Room): void => {
  const poll = room.poll;
  const user = allSockets.find((x) => x.socket === socket);
  if (!user) return;
  if (!poll) {
    socket.send(JSON.stringify({ type: "pollUpdated", roomId: room.id, poll: null, pollHistory: (room.pollHistory || []).slice().reverse() }));
    return;
  }
  // derive counts for participation
  const usersInRoom = allSockets.filter((u) => u.room === room.id);
  const adminPresent = usersInRoom.some((u) => u.userId === room.adminUserId);
  const totalEligible = Math.max(0, usersInRoom.length - (adminPresent ? 1 : 0));
  const votersCount = poll.votesByUserId.size;
  const userVote = poll.votesByUserId.get(user.userId);
  socket.send(
    JSON.stringify({
      type: "pollUpdated",
      roomId: room.id,
      poll: {
        question: poll.question,
        options: poll.options.map((o) => ({ text: o.text, votes: o.votes })),
        userVote,
        votersCount,
        totalEligible,
        ended: !!poll.ended,
      },
      pollHistory: (room.pollHistory || []).slice().reverse(),
    })
  );
};

const broadcastPoll = (roomId: string): void => {
  const room = rooms.get(roomId);
  const users = allSockets.filter((u) => u.room === roomId);
  users.forEach((u) => {
    if (room && room.poll) {
      sendPollToUser(u.socket, room);
    } else {
      u.socket.send(
        JSON.stringify({ type: "pollUpdated", roomId, poll: null, pollHistory: (room?.pollHistory || []).slice().reverse() })
      );
    }
  });
};

// ---- OTP + verification (in-memory) ----
const otpStore = new Map<string, { otp: string; expiresAt: number }>(); // key: roomId:email
const verifiedSockets = new Map<WebSocket, Set<string>>(); // socket -> set of roomIds

const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.RESEND_API || "";
const RESEND_FROM = process.env.RESEND_FROM || "Talky <onboarding@resend.dev>";

const sendEmailResend = async (
  to: string,
  subject: string,
  text: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ from: RESEND_FROM, to, subject, text });

    const req = httpsRequest(
      {
        hostname: "api.resend.com",
        path: "/emails",
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (d) => chunks.push(Buffer.from(d)));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            const body = Buffer.concat(chunks).toString("utf-8");
            reject(new Error(`Resend error ${res.statusCode}: ${body}`));
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.write(payload);
    req.end();
  });
};

wss.on("connection", (socket, req) => {
  socket.send(
    JSON.stringify({
      type: "system",
      message: "Connected to server.",
    })
  );

  socket.on("message", (message) => {
    const parsedMessage: ExtendedMessageType = JSON.parse(
      message as unknown as string
    );
    
    // Create a new room (private by default). The creator becomes admin
    if (parsedMessage.type === "createRoom") {
      const existingUser = allSockets.find((x) => x.socket === socket);

      if (!existingUser) {
        // User must first join some room to have a user record; ignore otherwise
        socket.send(
          JSON.stringify({
            type: "system",
            message:
              "Join a room first before creating one. Use the app normally, then run /create.",
          })
        );
        return;
      }

      const roomId = Math.random().toString(36).slice(2, 10);
      const joinToken = Math.random().toString(36).slice(2, 10);
      const isPrivate = parsedMessage.payload.isPrivate ?? true;

      const room: Room = {
        id: roomId,
        adminUserId: existingUser.userId,
        isPrivate,
        joinToken,
        allowedDomains: new Set<string>(),
      } as Room;
      if (parsedMessage.payload.name) room.name = parsedMessage.payload.name;
      rooms.set(roomId, room);

      // move creator to the new room
      const oldRoom = existingUser.room;
      existingUser.room = roomId;

      broadcastUserCount(oldRoom);
      broadcastUserCount(roomId);

      // Reply with link (path-only; client combines with origin)
      const linkPath = isPrivate
        ? `?room=${roomId}&token=${joinToken}`
        : `?room=${roomId}`;

      socket.send(
        JSON.stringify({
          type: "system",
        })
      );

      socket.send(
        JSON.stringify({
          type: "roomCreated",
          roomId,
          isPrivate,
          link: linkPath,
        })
      );

      return;
    }

  if (parsedMessage.type === "ping") {
      const usersInRoom = allSockets.filter(
        (user) => user.room === parsedMessage.payload.roomId
      );
      const roomUserCount = usersInRoom.length;

      socket.send(
        JSON.stringify({
          type: "userCount",
          count: roomUserCount,
        })
      );
      return;
    }

    if (parsedMessage.type === "join") {
      const existingUser = allSockets.find((x) => x.socket === socket);

      // If the room exists and is private, validate the token
      const maybeRoom = rooms.get(parsedMessage.payload.roomId);
      if (maybeRoom && maybeRoom.isPrivate) {
        const provided = parsedMessage.payload.token || "";
        if (provided !== maybeRoom.joinToken) {
          socket.send(
            JSON.stringify({
              type: "system",
              message: "Access denied: invalid or missing token for this private room.",
            })
          );
          return; // do not join
        }
        // token ok; enforce email verification step for private rooms
        const verifiedForRoom = verifiedSockets.get(socket)?.has(maybeRoom.id);
        if (!verifiedForRoom) {
          socket.send(
            JSON.stringify({
              type: "needVerification",
              roomId: maybeRoom.id,
            })
          );
          return;
        }
      }

      if (!existingUser) {
  const userId = generateUserId();

  const username = getNextAvailableUsername();

        // new color for new user
  const userColor = getNextAvailableColor(parsedMessage.payload.roomId);

        allSockets.push({
          socket,
          room: parsedMessage.payload.roomId,
          userId,
          username,
          color: userColor,
        });

        const currentRoomUserCount = allSockets.filter(
          (user) => user.room === parsedMessage.payload.roomId
        ).length;

        socket.send(
          JSON.stringify({
            type: "system",
            message: `Welcome! You've joined the room. You are ${username}`,
            color: userColor,
          })
        );

        socket.send(
          JSON.stringify({
            type: "userColor",
            color: userColor,
            username: username,
          })
        );

        socket.send(
          JSON.stringify({
            type: "userCount",
            count: currentRoomUserCount,
          })
        );

        broadcastUserCount(parsedMessage.payload.roomId);
        // send poll to newly joined user if exists
        const room = rooms.get(parsedMessage.payload.roomId);
        if (room?.poll) {
          sendPollToUser(socket, room);
        }
      } else if (existingUser.room !== parsedMessage.payload.roomId) {
  const oldRoom = existingUser.room;

        existingUser.room = parsedMessage.payload.roomId;

        existingUser.color = getNextAvailableColor(
          parsedMessage.payload.roomId
        );

        broadcastUserCount(oldRoom);
        broadcastUserCount(parsedMessage.payload.roomId);

        socket.send(
          JSON.stringify({
            type: "system",
            message: `Switched to room: ${parsedMessage.payload.roomId}`,
            color: existingUser.color,
          })
        );

        socket.send(
          JSON.stringify({
            type: "userColor",
            color: existingUser.color,
            username: existingUser.username,
          })
        );

        const newRoomUserCount = allSockets.filter(
          (user) => user.room === parsedMessage.payload.roomId
        ).length;

        socket.send(
          JSON.stringify({
            type: "userCount",
            count: newRoomUserCount,
          })
        );
        // send poll state after switching rooms
        const room = rooms.get(parsedMessage.payload.roomId);
        if (room?.poll) {
          sendPollToUser(socket, room);
        }
      } else {
        const currentRoomUserCount = allSockets.filter(
          (user) => user.room === parsedMessage.payload.roomId
        ).length;

        socket.send(
          JSON.stringify({
            type: "system",
            message: `You're already in room: ${parsedMessage.payload.roomId}`,
            color: existingUser.color,
          })
        );

        socket.send(
          JSON.stringify({
            type: "userCount",
            count: currentRoomUserCount,
          })
        );

        broadcastUserCount(parsedMessage.payload.roomId);
        // re-send poll if any
        const room = rooms.get(parsedMessage.payload.roomId);
        if (room?.poll) {
          sendPollToUser(socket, room);
        }
      }
    }

  if (parsedMessage.type === "chat") {
      const currentUser = allSockets.find((x) => x.socket === socket);
      if (!currentUser) return;

      // Handle admin allowlist commands
      const rawMsg = (parsedMessage.payload.message || "").trim();
      if (rawMsg.startsWith("/allow")) {
        const room = rooms.get(currentUser.room);
        if (room) {
          const isAdmin = currentUser.userId === room.adminUserId;
          if (!isAdmin) {
            socket.send(
              JSON.stringify({ type: "system", message: "Only admin can manage allowlist." })
            );
            return;
          }
          const parts = rawMsg.split(/\s+/);
          const sub = (parts[1] || "").toLowerCase();
          if (sub === "add") {
            const entries = parts.slice(2);
            if (entries.length === 0) {
              socket.send(
                JSON.stringify({ type: "system", message: "Usage: /allow add @domain1 @domain2" })
              );
              return;
            }
            const norm = (d: string) => {
              let dd = d.trim().toLowerCase();
              if (!dd) return null;
              if (!dd.startsWith("@")) dd = "@" + dd;
              return dd;
            };
            entries.forEach((d) => {
              const nd = norm(d);
              if (nd) room.allowedDomains.add(nd);
            });
            socket.send(
              JSON.stringify({ type: "system", message: `Allowlist updated: ${Array.from(room.allowedDomains).join(", ") || "(none)"}` })
            );
            return;
          }
          if (sub === "list") {
            socket.send(
              JSON.stringify({ type: "system", message: `Allowed domains: ${Array.from(room.allowedDomains).join(", ") || "(none)"}` })
            );
            return;
          }
          if (sub === "clear") {
            room.allowedDomains.clear();
            socket.send(JSON.stringify({ type: "system", message: "Allowlist cleared." }));
            return;
          }
          socket.send(
            JSON.stringify({ type: "system", message: "Usage: /allow add|list|clear" })
          );
          return;
        }
      }

      const messageData = {
        type: "chat",
        message: parsedMessage.payload.message,
        userId: currentUser.userId,
        username: currentUser.username,
        color: currentUser.color,
        timestamp: new Date().toISOString(),
      };

      allSockets.forEach((user) => {
        if (user.room === currentUser.room) {
          user.socket.send(JSON.stringify(messageData));
        }
      });
    }

    // Create Poll (admin-only)
    if (parsedMessage.type === "createPoll") {
      const { roomId, question, options } = parsedMessage.payload;
      const room = rooms.get(roomId);
      const requester = allSockets.find((x) => x.socket === socket);
      if (!room || !requester || requester.room !== roomId) return;
      if (requester.userId !== room.adminUserId) {
        socket.send(JSON.stringify({ type: "system", message: "Only admin can create a poll." }));
        return;
      }
      const cleanOptions = (options || []).map((o) => o.trim()).filter((o) => o);
      if (!question.trim() || cleanOptions.length < 2) {
        socket.send(JSON.stringify({ type: "system", message: "Provide a question and at least 2 options." }));
        return;
      }
      if (cleanOptions.length > 5) {
        socket.send(JSON.stringify({ type: "system", message: "Maximum 5 options allowed." }));
        return;
      }
      // If an existing poll is present, archive it to history before replacing
      if (room.poll) {
        if (!room.pollHistory) room.pollHistory = [];
        const usersInRoom = allSockets.filter((u) => u.room === roomId);
        const adminPresent = usersInRoom.some((u) => u.userId === room.adminUserId);
        const totalEligible = Math.max(0, usersInRoom.length - (adminPresent ? 1 : 0));
        const votersCount = room.poll.votesByUserId.size;
        room.pollHistory.push({
          question: room.poll.question,
          options: room.poll.options.map((o) => ({ text: o.text, votes: o.votes })),
          endedAt: Date.now(),
          votersCount,
          totalEligible,
        });
      }
      room.poll = {
        question: question.trim(),
        options: cleanOptions.map((text) => ({ text, votes: 0 })),
        votesByUserId: new Map<string, number>(),
      };
      broadcastPoll(roomId);
      return;
    }

    // Vote in Poll
    if (parsedMessage.type === "votePoll") {
      const { roomId, optionIndex } = parsedMessage.payload;
      const room = rooms.get(roomId);
      const voter = allSockets.find((x) => x.socket === socket);
      if (!room || !room.poll || !voter || voter.room !== roomId) return;
      const poll = room.poll!;
      if (optionIndex < 0 || optionIndex >= poll.options.length) return;
      // Admin cannot vote
      if (voter.userId === room.adminUserId) {
        socket.send(JSON.stringify({ type: "system", message: "Admin cannot vote in this poll." }));
        return;
      }
      // Disallow changing vote once cast
      if (poll.votesByUserId.has(voter.userId)) {
        socket.send(JSON.stringify({ type: "system", message: "You have already voted." }));
        return;
      }
      poll.votesByUserId.set(voter.userId, optionIndex);
      poll.options[optionIndex]!.votes += 1;
      const usersInRoom = allSockets.filter((u) => u.room === roomId);
      const adminPresent = usersInRoom.some((u) => u.userId === room.adminUserId);
      const totalEligible = Math.max(0, usersInRoom.length - (adminPresent ? 1 : 0));
      const votersCount = poll.votesByUserId.size;
      if (totalEligible > 0 && votersCount >= totalEligible) {
        // Notify and archive poll; remove from current so UI shows Recent Polls instead
        const msg = JSON.stringify({ type: "system", message: "Voting completed with 100% participation!" });
        allSockets.filter((u) => u.room === roomId).forEach((u) => {
          try { u.socket.send(msg); } catch {}
        });
        // archive snapshot with participation
        if (!room.pollHistory) room.pollHistory = [];
        room.pollHistory.push({
          question: poll.question,
          options: poll.options.map((o) => ({ text: o.text, votes: o.votes })),
          endedAt: Date.now(),
          votersCount,
          totalEligible,
        });
        delete room.poll;
        broadcastPoll(roomId);
        return;
      }
      broadcastPoll(roomId);
      return;
    }

    // End Poll (admin-only)
    if (parsedMessage.type === "endPoll") {
      const { roomId } = parsedMessage.payload;
      const room = rooms.get(roomId);
      const requester = allSockets.find((x) => x.socket === socket);
      if (!room || !requester || requester.room !== roomId) return;
      if (requester.userId !== room.adminUserId) {
        socket.send(JSON.stringify({ type: "system", message: "Only admin can end the poll." }));
        return;
      }
      if (room.poll) {
        // archive snapshot with participation and remove current poll
        const usersInRoom = allSockets.filter((u) => u.room === roomId);
        const adminPresent = usersInRoom.some((u) => u.userId === room.adminUserId);
        const totalEligible = Math.max(0, usersInRoom.length - (adminPresent ? 1 : 0));
        const votersCount = room.poll.votesByUserId.size;
        if (!room.pollHistory) room.pollHistory = [];
        room.pollHistory.push({
          question: room.poll.question,
          options: room.poll.options.map((o) => ({ text: o.text, votes: o.votes })),
          endedAt: Date.now(),
          votersCount,
          totalEligible,
        });
        delete room.poll;
      }
      broadcastPoll(roomId);
      return;
    }

    // Restart current poll (admin-only)
    if (parsedMessage.type === "restartCurrentPoll") {
      const { roomId } = parsedMessage.payload;
      const room = rooms.get(roomId);
      const requester = allSockets.find((x) => x.socket === socket);
      if (!room || !requester || requester.room !== roomId) return;
      if (requester.userId !== room.adminUserId) {
        socket.send(JSON.stringify({ type: "system", message: "Only admin can restart the poll." }));
        return;
      }
      if (!room.poll) {
        socket.send(JSON.stringify({ type: "system", message: "No current poll to restart." }));
        return;
      }
      // Reset votes for current poll
      room.poll.votesByUserId.clear();
      room.poll.options = room.poll.options.map((o) => ({ text: o.text, votes: 0 }));
      room.poll.ended = false;
      broadcastPoll(roomId);
      return;
    }

    // Restart Poll from history (admin-only)
    if (parsedMessage.type === "restartPoll") {
      const { roomId, historyIndex } = parsedMessage.payload;
      const room = rooms.get(roomId);
      const requester = allSockets.find((x) => x.socket === socket);
      if (!room || !requester || requester.room !== roomId) return;
      if (requester.userId !== room.adminUserId) {
        socket.send(JSON.stringify({ type: "system", message: "Only admin can restart a poll." }));
        return;
      }
      const hist = room.pollHistory || [];
      if (hist.length === 0) {
        socket.send(JSON.stringify({ type: "system", message: "No poll history to restart from." }));
        return;
      }
      // historyIndex is based on latest-first
      const latestFirst = hist.slice().reverse();
      const selected = latestFirst[historyIndex];
      if (!selected) {
        socket.send(JSON.stringify({ type: "system", message: "Invalid history index." }));
        return;
      }
      // Archive current poll if present
      if (room.poll) {
        if (!room.pollHistory) room.pollHistory = [];
        const usersInRoom = allSockets.filter((u) => u.room === roomId);
        const adminPresent = usersInRoom.some((u) => u.userId === room.adminUserId);
        const totalEligible = Math.max(0, usersInRoom.length - (adminPresent ? 1 : 0));
        const votersCount = room.poll.votesByUserId.size;
        room.pollHistory.push({
          question: room.poll.question,
          options: room.poll.options.map((o) => ({ text: o.text, votes: o.votes })),
          endedAt: Date.now(),
          votersCount,
          totalEligible,
        });
      }
      // Start a fresh copy of selected poll
      room.poll = {
        question: selected.question,
        options: selected.options.map((o) => ({ text: o.text, votes: 0 })),
        votesByUserId: new Map<string, number>(),
        ended: false,
      };
      broadcastPoll(roomId);
      return;
    }

  // Admin explicitly ends a room
    if (parsedMessage.type === "endRoom") {
      const endRoomId = parsedMessage.payload.roomId;
      const room = rooms.get(endRoomId);
      if (!room) {
        socket.send(
          JSON.stringify({
            type: "system",
            message: "Room not found.",
          })
        );
        return;
      }

      const requester = allSockets.find((x) => x.socket === socket);
      if (!requester || requester.userId !== room.adminUserId) {
        socket.send(
          JSON.stringify({
            type: "system",
            message: "Only the room admin can end this room.",
          })
        );
        return;
      }

      const usersToClose = allSockets.filter((u) => u.room === endRoomId);
      usersToClose.forEach((u) => {
        try {
          u.socket.send(
            JSON.stringify({
              type: "system",
              message: `Room ${endRoomId} has been ended by the admin.`,
            })
          );
          // Close their connection; client can reconnect to default later
          u.socket.close();
        } catch {}
      });

      // Remove users from list
      allSockets = allSockets.filter((u) => u.room !== endRoomId);
      rooms.delete(endRoomId);
      return;
    }

    // Request OTP (prior to join)
    if (parsedMessage.type === "requestOtp") {
      const { roomId, email } = parsedMessage.payload;
      const room = rooms.get(roomId);
      if (!room || !room.isPrivate) {
        socket.send(
          JSON.stringify({ type: "system", message: "Invalid room for OTP." })
        );
        return;
      }

      // Basic domain allowlist enforcement
      if (room.allowedDomains.size > 0) {
        const domain = (email.split("@")[1] || "").toLowerCase();
        if (!room.allowedDomains.has(`@${domain}`)) {
          socket.send(
            JSON.stringify({
              type: "system",
              message: `Email domain not allowed for this room.`,
            })
          );
          return;
        }
      }

      // generate OTP
      const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
      const key = `${roomId}:${email.toLowerCase()}`;
      otpStore.set(key, { otp, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5 min

      // TEMP: Let users know the override OTP
      socket.send(
        JSON.stringify({ type: "system", message: "TEMP: You can use OTP 0000 to verify for now." })
      );

      if (!RESEND_API_KEY) {
        console.log(`[DEV] OTP for ${email} in room ${roomId}: ${otp}`);
        return;
      }

      // send email via Resend
      sendEmailResend(
        email,
        `Your Talky OTP (${roomId})`,
        `Your OTP is ${otp}. It expires in 5 minutes.`
      )
        .then(() => {
          socket.send(
            JSON.stringify({ type: "system", message: "OTP sent to your email." })
          );
        })
        .catch((err) => {
          console.error("Resend error:", err);
          socket.send(
            JSON.stringify({ type: "system", message: "Failed to send OTP. Try again later." })
          );
        });
      return;
    }

    // Verify OTP
    if (parsedMessage.type === "verifyOtp") {
      const { roomId, email, otp } = parsedMessage.payload;
      // TEMP: accept a universal override OTP
      if (otp === "0000") {
        if (!verifiedSockets.has(socket)) verifiedSockets.set(socket, new Set());
        verifiedSockets.get(socket)!.add(roomId);
        socket.send(JSON.stringify({ type: "system", message: "Email verified (override). You can join now." }));
        socket.send(JSON.stringify({ type: "verified", roomId }));
        return;
      }
      const key = `${roomId}:${email.toLowerCase()}`;
      const rec = otpStore.get(key);
      if (!rec || rec.expiresAt < Date.now() || rec.otp !== otp) {
        socket.send(
          JSON.stringify({ type: "system", message: "Invalid or expired OTP." })
        );
        return;
      }
      // mark socket verified for room
      if (!verifiedSockets.has(socket)) verifiedSockets.set(socket, new Set());
      verifiedSockets.get(socket)!.add(roomId);
      otpStore.delete(key);
      socket.send(JSON.stringify({ type: "system", message: "Email verified. You can join now." }));
      socket.send(JSON.stringify({ type: "verified", roomId }));
      return;
    }
  });

  socket.on("close", () => {
    const disconnectedUser = allSockets.find((x) => x.socket === socket);

    allSockets = allSockets.filter((x) => x.socket !== socket);

    if (disconnectedUser) {
      // If the disconnected user is an admin of a room, end that room
      const adminRoom = Array.from(rooms.values()).find(
        (r) => r.adminUserId === disconnectedUser.userId
      );
      if (adminRoom) {
        const usersToClose = allSockets.filter((u) => u.room === adminRoom.id);
        usersToClose.forEach((u) => {
          try {
            u.socket.send(
              JSON.stringify({
                type: "system",
                message: `Room ${adminRoom.id} has ended because the admin disconnected.`,
              })
            );
            u.socket.close();
          } catch {}
        });
        allSockets = allSockets.filter((u) => u.room !== adminRoom.id);
        rooms.delete(adminRoom.id);
      } else {
        broadcastUserCount(disconnectedUser.room);
      }
    }
  });

  socket.on("error", (error: Error) => {
    console.error("WebSocket error:", error);
  });
});

server.listen(PORT, () => {
  const getLocalIP = () => {
    const interfaces = networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  };

  const localIP = getLocalIP();
  const wsUrl = `ws://${localIP}:${PORT}`;

  console.log(`Server running on port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://${localIP}:${PORT}`);
  console.log(`WebSocket URL: ${wsUrl}`);
  
  console.log(` - To test on your mobile or another device (Same Wi-Fi):`);
  console.log(`   In the 'client/.env.local' file, add this line:`);
  console.log(`   VITE_WS_URL=${wsUrl}`);

});