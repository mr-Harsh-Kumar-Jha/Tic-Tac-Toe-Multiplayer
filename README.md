# Tic-Tac-Toe Multiplayer (Authoritative Nakama Backend)

A fully functional, real-time multiplayer Tic-Tac-Toe game built with **React Native (Expo)** on the frontend and **Nakama (Go Plugin)** on the backend. This project showcases advanced multiplayer capabilities, secure server-side logic, and a scalable architecture framework ideal for modern competitive games.

## 🌟 Key Features

* **Auto Username Generation & Device Authentication:** Frictionless onboarding! Users are authenticated implicitly via device IDs. Upon the first launch, Nakama automatically generates a unique user profile and username, allowing players to jump straight into the action without tedious password screens or registration forms.
* **Customizable User Profiles:** Players are not locked into their auto-generated names. Users can edit their profiles directly in the app to set custom avatars or custom usernames for a more personalized gaming identity.
* **Direct "Challenge Anyone" System:** A fully bespoke invite system built with custom RPCs. Players can pull up a real-time list of online users, send direct PvP (Player vs. Player) invitations ("challenges") to anyone online, view incoming challenge requests, and accept them to instantly lock into a private authoritative match.
* **Global Matchmaking:** Don't have a specific friend to play against? The "Play Game" feature drops players into a global matchmaking pool, automatically finding an available opponent of a similar tier and spawning a real-time match.
* **Global Leaderboards & Stat Tracking:** Competitive tracking of Wins, Losses, and Ties. The central leaderboard updates securely via server-side authority at the end of every match, preventing client-side score spoofing.
* **Real-Time Authoritative Gameplay:** Zero lag, zero cheating. Game turns are validated and executed completely by the server, securely broadcasting the new board state under tight latency constraints.

---

## 🏗 Architecture and Design Decisions

This project strictly adheres to an **Authoritative Server Model** to guarantee fairness, security, and consistent state synchronization between connected clients across different platforms.

### 1. Server-Authoritative Game Loop (Go Plugin)
The `game.Match` logic (implemented in `game/match.go`) executes entirely inside the Nakama server environment. 
- **Strict Validation:** Clients never compute the game state. They only send opcodes with intents (e.g., "Place X on slot 3"). The server validates if it's legally the player's turn, if the target slot is empty, and if the match is still active.
- **State Broadcasting:** The server evaluates the new board state, checks for algorithmic win/draw conditions, and broadcasts the updated `MatchState` to both clients to render.
- **Anti-Cheat:** Because the server holds the definitive "Source of Truth," it is impossible for a modified client to warp the board, skip turns, or force a win. Illegitimate packets are simply discarded.
- **Enforced Timers & Disconnect Handling:** A strict 30-second turn timer is enforced server-side. If a player fails to make a move in time, or if their socket connection completely drops, the server immediately resolves the game and automatically awards a forfeit win to the remaining opponent.

### 2. High-Performance Go Micro-architecture
The backend logic is compiled into a highly-performant `.so` Go Plugin module that Nakama natively runs. The codebase uses a clean, domain-driven structure separated into discrete packages:
- `game/`: Contains the core multiplayer match loops, tick-based state initialization, and real-time turn/board management logic.
- `challenge/`: Manages the direct PvP peer-to-peer flow. Handles custom RPCs for social connectivity (`send_challenge`, `respond_to_challenge`, `get_pending_challenges`, `get_online_players`).
- `matchmaker/`: Hooks directly into Nakama's native matchmaking pool (`RegisterMatchmakerMatched`) to automatically spawn authoritative matches when random players queue up.
- `leaderboard/`: Handles secure initialization of tracking metrics. Client write-access to the leaderboard is fundamentally denied; *only* the authoritative match loop in `game/` can increment records upon game completion.

### 3. Cross-Platform Edge Client
- **React Native (Expo):** We use Expo to quickly iterate on Android, iOS, and Web. The game connects to the Nakama instance via WebSockets (`nk.Socket`).
- **Low Latency Payloads:** Match opcodes and JSON payloads are cleanly marshalled over the WebSocket, minimizing overhead to offer instantaneous snap-rendering when pieces are placed on the grid.

---

## 🛠 Setup and Installation Instructions

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js](https://nodejs.org/en/) & npm
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Go 1.22+](https://go.dev/doc/install) (for local backend development)

### Running Locally

1. **Start the Nakama Server:**
   From the root of the project, use Docker Compose to spin up the server and its PostgreSQL database.
   ```bash
   ./dev.sh
   ```
   *This command builds the Go plugin and mounts it into the Nakama container. The server will start on `http://127.0.0.1:7350` and the Nakama administration console on `http://127.0.0.1:7351` (default login: admin / password).*

2. **Start the Client (React Native / Expo):**
   Navigate to the client directory and start Expo.
   ```bash
   cd TicTacToe
   npm install
   npx expo start
   ```

---

## 🚀 Deployment Process Documentation

The backend is configured and optimized for deployment on **Koyeb** using their native Docker engine.

### Deployment Workflow
1. **Multi-Stage Dockerfile:** 
   Our Docker setup uses a multi-stage process. Stage 1 pulls `heroiclabs/nakama-pluginbuilder`, compiling our local Go code to a static `tictactoe.so` plugin. Stage 2 pulls the lean `heroiclabs/nakama` image and safely copies the compiled plugin from Stage 1 into the active runtime environment.
2. **Secure Database Integration:** 
   An external PostgreSQL 12+ database (like Koyeb DB) is linked securely. Instead of hardcoding credentials in our `Dockerfile`, we pass the database connection string via a secure environment variable (`DB_URL`). You must configure the `DB_URL` secret in your Koyeb service settings.
3. **Container Port Mapping:**
   - The primary API/Socket container natively uses port `7350`.
   - The admin console natively uses port `7351`.
   - For Koyeb's PaaS routing, our `ENTRYPOINT` passes `--socket.port 8000` to seamlessly bind to Koyeb's default health-check and HTTP/WSS traffic ports.
---

## ⚙️ API Details

This server heavily extends the standard Nakama feature-set with domain-specific customizations for this game:

- **Custom RPC Endpoints (Server Commands):**
   - `get_leaderboard`: Retrieves global rankings ordered by wins.
   - `get_online_players` & `get_profile`: Social polling tools to read online presence.
   - `send_challenge`, `get_pending_challenges`, `respond_to_challenge`: Endpoints to coordinate direct 1v1 PvP invitations.
- **Game Match Opcodes:**
   - `1` (`OpCodeMove`): The only valid client-sent opcode; sent by the player attempting to place an X/O on a Board Index (0-8).
   - *State Broadcasts*: Pushed directly by the Authoritative Server asynchronously. Represents the structured `MatchState` schema complete with `CurrentTurn`, `TimerExpiry`, `Board`, `Winner`, etc.

## ⚙️ Server Configuration Details
The Nakama server runs highly efficiently on minimal resources. Our current production topology is deployed with the following configuration:

- **Instance Type:** `eNano` (CPU Eco)
- **Compute:** 0.1 vCPU
- **Memory:** 256 MB RAM
- **Storage:** 2 GB Disk
- **Region:** Singapore (Asia-Pacific) for optimal low-latency routing to local players.

---

## 🕹 How to test the Multiplayer Functionality

1. **Open two active clients:** 
   - You can open the Expo app on your physical phone (via the Expo Go app), and run another instance on your desktop's Android Emulator or iOS Simulator.
   - *Alternative:* You can run `npx expo start --web` and open the app in two separate incognito web browser windows. 
2. **Device Authentication:** Both clients will auto-generate users via device ID under the hood. You will instantly jump into the menu dashboard. Head to "Profile" if you'd like to manually change the generated names to something recognizable.
3. **Multiplayer Test Flow:**
   - **Matchmaker Test:** Click "Play Game" on both devices simultaneously. They will be pooled together automatically by Nakama and locked into an active game state.
   - **Challenge Test:** On Device A, locate Device B in the "Online Players" list and tap the "Challenge" button. On Device B, watch the challenge prompt appear, accept it, and observe both clients seamlessly jump straight into a private authoritative match.
4. **Gameplay Mechanics Test:** Try making a move when it isn't your turn—notice how the server politely rejects it. Close one app entirely, and notice how the remaining app instantly receives an authoritative "Forfeit Win" broadcast based on socket disconnection.
