import { useEffect, useState, useRef } from "react";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState(""); // Controlled input
  const messagesEndRef = useRef(null); // For auto-scroll
  const wsRef = useRef();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const ws = new WebSocket("http://localhost:8080");
    ws.onmessage = (event) => {
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
    return () => {
      ws.close();
    };
  }, []);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return; // Don't send empty messages
    
    wsRef.current?.send(
      JSON.stringify({
        type: "chat",
        payload: {
          message: inputMessage,
        },
      })
    );
    setInputMessage(""); // Clear input after sending
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Chat Room</h1>
            <p className="text-sm text-gray-500">Room: Red</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-green-400 rounded-full"></div>
            <span className="text-sm text-gray-600">Online</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">💬</div>
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="flex justify-start">
                <div className="max-w-xs lg:max-w-md">
                  <div className="bg-white rounded-2xl rounded-tl-md shadow-sm px-4 py-3 border border-gray-100">
                    <p className="text-gray-800 text-sm leading-relaxed">{message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="w-full px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  // rows="1"
                />
                {/*
                {inputMessage && (
                  <button
                    onClick={() => setInputMessage("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
                  */}
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="flex items-center justify-center w-12 h-12 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
 




// import { useEffect, useState, useRef } from "react";
// import "./App.css";

// function App() {
//   const [messages, setMessages] = useState([]);

//   // @ts-expect-error : currently I am ignoring any errors for useRef()!
//   const wsRef = useRef();
//   useEffect(() => {
//     const ws = new WebSocket("http://localhost:8080");
//     ws.onmessage = (event) => {
//       // @ts-expect-error : currently I am initiazing useState() as empty array!
//       setMessages((m) => [...m, event.data]);
//     };
//     wsRef.current = ws;
//     ws.onopen = () => {
//       ws.send(
//         JSON.stringify({
//           type: "join",
//           payload: {
//             roomId: "red",
//           },
//         })
//       );
//     };
//     return () => {
//       ws.close();
//     };
//   }, []);
//   return (
//     <div
//       className="max-h-screen bg-neutral-900"
//       style={{
//         backgroundImage: `radial-gradient(circle at 0.5px 0.5px, rgba(89, 97, 98, 0.52) 0.5px, transparent 0)`,
//         backgroundSize: "8px 8px",
//         backgroundRepeat: "repeat",
//       }}
//     >
//       <div className="h-[60vh] h-[60vh] p-4 overflow-hidden">
//         {messages.map((message) => (
//           <div className="mb-6">
//             <span className="bg-white text-black rounded m-8 p-2">
//               {message}
//             </span>
//           </div>
//         ))}
//       </div>
//       <div className="w-full h-[60px] bg-white flex rounded flex items-center justify-between pr-1.5 ">
//         <input id="message" className="flex-1 p-4 text-black" type="text" />
//         <button
//           onClick={() => {
//             // @ts-expect-error : using document.getElement for now
//             const message = document.getElementById("message")?.value;
//             // @ts-expect-error : using useRef()
//             wsRef.current.send(
//               JSON.stringify({
//                 type: "chat",
//                 payload: {
//                   message: message,
//                 },
//               })
//             );
//           }}
//           className="h-[50px] w-[60px] bg-purple-600 text-white p-4 rounded flex justify-center items-center"
//         >
//           Send
//         </button>
//       </div>
//     </div>
//   );
// }

// export default App;
