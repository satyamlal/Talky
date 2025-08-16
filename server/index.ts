import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

interface User {
  socket: WebSocket;
  room: string;
}

let userCount = 0;
let allSockets: User[] = [];

wss.on("connection", (socket, req) => {
  userCount++;
  socket.on("message", (message) => {
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
        socket.send(
          "User #" + userCount + " Joined Room " + parsedMessage.payload.roomId
        );
      }
    }

    if (parsedMessage.type == "chat") {
      let currentUserRoom = allSockets.find((x) => x.socket === socket)?.room;

      allSockets.forEach((user) => {
        if (user.room == currentUserRoom) {
          user.socket.send(parsedMessage.payload.message);
        }
      });
    }
  });
  socket.on("close", () => {
    userCount--;
    allSockets = allSockets.filter((x) => x.socket != socket);
  });
});
