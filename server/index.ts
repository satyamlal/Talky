import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

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

wss.on("connection", (socket, req) => {
  socket.send(
    JSON.stringify({
      type: "system",
      message: "Connected to server. Send a join message to enter a room.",
    })
  );

  socket.on("message", (message) => {
    const parsedMessage: MessageType = JSON.parse(message as unknown as string);

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
      }
    }

    if (parsedMessage.type === "chat") {
      const currentUser = allSockets.find((x) => x.socket === socket);
      if (!currentUser) return;

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
  });

  socket.on("close", () => {
    const disconnectedUser = allSockets.find((x) => x.socket === socket);

    allSockets = allSockets.filter((x) => x.socket !== socket);

    if (disconnectedUser) {
      broadcastUserCount(disconnectedUser.room);
    }
  });

  socket.on("error", (error: Error) => {
    console.error("WebSocket error:", error);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
