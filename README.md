# Talky

**Talky** is a modern, anonymous chat platform where anyone can join rooms and start conversations without revealing their identity.  
Whether you want to chat globally, connect in small groups, or run quick live polls, Talky makes conversations fast, fun, and free.

## Features

- **Stay Anonymous** – No accounts, no tracking, no personal data.
- **Room-Based Chat** – Create or join rooms instantly.
- **Global Conversations** – Meet people from anywhere in the world.
- **Live Voting** – Run quick polls for 1–2 minutes to engage your audience.
- **Real-Time Messaging** – Powered by WebSockets for instant responses.

## Tech Stack

- **Frontend (client):** React + Vite + TypeScript
- **Backend (server):** Node.js + Express + TypeScript
- **Real-time:** [WebSockets](https://github.com/websockets/ws)
- **Deployment:** Render (FE + BE)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/satyamlal/Talky.git
cd Talky

# Running FrontEnd :
cd client

## Install dependencies
pnpm install

## Start client on localhost
pnpm run dev


# Running BackEnd :
cd server

## Install dependencies
pnpm install

# Run server
pnpm run dev
```
### Client
- Open **`http://localhost:5173/`** in your browser.

### Server
- The server will be running at:
    * **API:** `http://localhost:8080/`
    * **WebSocket:** `ws://localhost:8080/`