import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

let userCount = 0;
let allSockets: WebSocket[] = [];

wss.on("connection", (socket, req) => {
  allSockets.push(socket);
  userCount++;
  console.log("Connected User #" + userCount);

  socket.on("message", (message) => {
    for (let i = 0; i < allSockets.length; i++) {
      const s = allSockets[i];
      s?.send(message.toString() + " sent from the server!");
    }
  });
});
