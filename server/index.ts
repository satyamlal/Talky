import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

const server = createServer();

const PORT = process.env.PORT || 8080;

// WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });

interface User {
  socket: WebSocket;
  room: string;
}

let userCount = 0;
let allSockets: User[] = [];

wss.on("connection", (socket, req) => {
  console.log("New WebSocket connection established");
  userCount++;

  socket.on("message", (message) => {
    console.log("Received message:", message.toString());
    const parsedMessage = JSON.parse(message as unknown as string);

    if (parsedMessage.type == "join") {
      const user = allSockets.find((x) => x.socket === socket);

      if (user) {
        if (user.room) {
          socket.send(
            "You are already in a room. Please leave that to join a new one!"
          );
        } else {
          user.room = parsedMessage.payload.roomId;
          socket.send("You joined " + user.room);
        }
      } else {
        allSockets.push({
          socket,
          room: parsedMessage.payload.roomId,
        });
        socket.send("User #" + userCount + " connected!");
      }
    }

    if (parsedMessage.type == "chat") {
      let currentUserRoom = allSockets.find((x) => x.socket === socket)?.room;
      console.log(`Broadcasting message to room: ${currentUserRoom}`);

      allSockets.forEach((user) => {
        if (user.room == currentUserRoom) {
          user.socket.send(parsedMessage.payload.message);
        }
      });
    }
  });

  socket.on("close", () => {
    console.log("WebSocket connection closed");
    userCount--;
    allSockets = allSockets.filter((x) => x.socket != socket);
  });

  socket.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

// Start the HTTP server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
