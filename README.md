# Talky

**Talky** is a modern, anonymous chat platform where anyone can join rooms and start conversations without revealing their identity.  
Whether you want to chat globally, connect in small groups, or run quick live polls, Talky makes conversations fast, fun, and free.

## Features

- **Stay Anonymous** – No accounts, no tracking, no personal data.
- **Ephemeral Rooms** – Create private rooms with a shareable link; rooms end when the admin leaves or ends them.
- **Private Access Control** – Only users with the room link can join; token-gated join for private rooms.
- **Email OTP Verification** – Users must verify their email via OTP to join a private room.
- **Admin Domain Allowlist** – Admin can allow specific email domains using chat commands.
- **Live Polls** – Per-room polls with question + options, live tallies, single-vote lock, and end controls.
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

## Environment Setup (Email OTP)

The server uses Resend to deliver OTP emails for private room verification.

1) Create a `.env` file in `server/` based on the provided example (copy `server/.env.example` to `server/.env`).

2) Add your Resend API key to `server/.env`:

```
RESEND_API_KEY=your_resend_api_key
```

Notes:
- During development, OTP delivery may be flaky. The server currently accepts the universal OTP `0000` as a temporary override to unblock flows. Remove this override in code before deploying to production.
- No data is persisted. Rooms, OTPs, and polls live only in memory and are cleared when the process stops.

## Private Rooms and Admin Controls

- Create a private room from the landing page; you’ll become the admin.
- Share the generated room link (contains `?room=<id>&token=<token>`) with participants.
- Admin can end a room at any time; the room also ends if the admin disconnects.

### Admin Allowlist Commands

Type these in the chat as the admin to control which email domains can request OTPs:

- `/allow add example.com` – Allow users with emails like `@example.com`.
- `/allow list` – Show allowed domains for the current room.
- `/allow clear` – Clear the allowlist for the current room.

## Polls

- Create a poll with a question and 2–5 options.
- Each user can vote once; votes are tallied live for everyone.
- Admin can end the poll; the final tallies remain visible.

## Limitations

- In-memory only (no database). All rooms, OTPs, and polls are ephemeral.
- Email delivery depends on Resend; ensure your API key and domain are set up properly.

## Deploying

- Frontend and backend can be deployed separately. The backend must be reachable over HTTPS, and the WebSocket URL should be updated accordingly in the client if you change defaults.
- Remove the temporary universal OTP override (`0000`) before going live.