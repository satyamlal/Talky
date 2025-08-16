import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

interface User {
  socket: WebSocket;
  room: string;
}

let allSockets: User[] = [];

wss.on("connection", (socket, req) => {
  socket.on("message", (message) => {
    const parsedMessage = JSON.parse(message as unknown as string);

    if (parsedMessage.type == "join") {
      allSockets.push({
        socket,
        room: parsedMessage.payload.roomId,
      });
    }

    if (parsedMessage.type == "chat") {
      let currentUserRoom = allSockets.find((x) => x.socket === socket)?.room;

      allSockets.forEach((user) => {
        if (user.room == currentUserRoom) {
          user.socket.send(parsedMessage.payload.message);
        }
      });
    }

    socket.on("close", () => {
      allSockets = allSockets.filter((x) => x.socket != socket);
    });
  });
});
