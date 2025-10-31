import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
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
  joinToken: string; // used for private rooms links
  allowedDomains: Set<string>;
}

const rooms = new Map<string, Room>();

interface CreateRoomMessage {
  type: "createRoom";
  payload: {
    name?: string;
    isPrivate?: boolean; // default true
  };
}

type ExtendedMessageType = MessageType | CreateRoomMessage;

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
          message: `Room created${isPrivate ? " (private)" : ""}. Share this link: ${linkPath}`,
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