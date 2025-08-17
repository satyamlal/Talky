import { useEffect, useState, useRef } from "react";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);

  // @ts-expect-error : currently I am ignoring any errors for useRef()!
  const wsRef = useRef();
  useEffect(() => {
    const ws = new WebSocket("http://localhost:8080");
    ws.onmessage = (event) => {
      // @ts-expect-error : currently I am initiazing useState() as empty array!
      setMessages((m) => [...m, event.data]);
    };
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          payload: {
            roomId: "red",
          },
        })
      );
    };
  }, []);
  return (
    <div
      className="max-h-screen bg-neutral-900"
      style={{
        backgroundImage: `radial-gradient(circle at 0.5px 0.5px, rgba(89, 97, 98, 0.52) 0.5px, transparent 0)`,
        backgroundSize: "8px 8px",
        backgroundRepeat: "repeat",
      }}
    >
      <div className="h-[60vh] h-[60vh] p-4 overflow-hidden">
        {messages.map((message) => (
          <div className="mb-6">
            <span className="bg-white text-black rounded m-8 p-2">
              {message}
            </span>
          </div>
        ))}
      </div>
      <div className="w-full h-[60px] bg-white flex rounded flex items-center justify-between pr-1.5 ">
        <input id="message" className="flex-1 p-4 text-black" type="text" />
        <button
          onClick={() => {
            // @ts-expect-error : using document.getElement for now
            const message = document.getElementById("message")?.value;
            // @ts-expect-error : using useRef()
            wsRef.current.send(
              JSON.stringify({
                type: "chat",
                payload: {
                  message: message,
                },
              })
            );
          }}
          className="h-[50px] w-[60px] bg-purple-600 text-white p-4 rounded flex justify-center items-center"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default App;
