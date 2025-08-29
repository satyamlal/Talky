import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

const server = createServer();
const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ server });

const USER_COLORS: string[] = [
  "#8FAFC2",
  "#C2A894",
  "#A8C294",
  "#C294A0",
  "#9AA2C9",
  "#B39AC9",
  "#94C2A4",
  "#C2B894",
  "#A894C2",
  "#94C2BD",
  "#C294A8",
  "#A0C294",
  "#94AEC2",
  "#C2A694",
  "#B894C2",
  "#C2C194",
  "#94C2C1",
  "#C29494",
  "#9CC294",
  "#C294BA",
  "#94A6C2",
  "#C2AB94",
  "#A494C2",
  "#94C2B2",
  "#C2A0A8",
  "#A9C294",
  "#94BAC2",
  "#C2C294",
  "#B094C2",
  "#94C2A9",
  "#C2949D",
  "#A4C294",
  "#94C2C8",
  "#C2AD94",
  "#A094C2",
  "#94C29F",
  "#C2B994",
  "#C294C2",
  "#9FC294",
  "#94B5C2",
  "#C2A594",
  "#AD94C2",
  "#94C2B8",
  "#C294AA",
  "#A2C294",
  "#94C2A1",
  "#C2C2A0",
  "#B594C2",
  "#94C2AC",
  "#C2A994",
];

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

const getNextAvailableColor = (roomId: string): string => {
  const usersInRoom = allSockets.filter((user) => user.room === roomId);
  const usedColors = usersInRoom.map((user) => user.color);

  for (const color of USER_COLORS) {
    if (!usedColors.includes(color)) {
      return color;
    }
  }

  // If all colors are used, return a random color (this shouldn't happen with 15 colors)
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]!;
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
        const userColor = getNextAvailableColor(parsedMessage.payload.roomId);
        const usersInRoom = allSockets.filter(
          (user) => user.room === parsedMessage.payload.roomId
        );
        const username = `User-${usersInRoom.length + 1}`;

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
