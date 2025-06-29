# Ope Ope no Mi - P2P File Sharing and Communication

![Ope Ope no Mi](client/public/ope_ope_no_mi1.png)

Welcome to **Ope Ope no Mi**, a versatile, hybrid file-sharing application inspired by the powers of the Ope Ope no Mi from One Piece. This project provides multiple ways to share files and communicate directly with others, emphasizing privacy, speed, and user control.

The application is deployed and can be accessed [here](https://file-share-w2g2.onrender.com/).

## ✨ Features

- **Hybrid File Sharing:**
  - **☁️ Server-Based Upload:** Securely upload files to Supabase Storage. The files are automatically deleted after 24 hours. A shareable link is generated for anyone to download the file.
  - **⚡ Instant P2P Transfer:** Send files directly to another user using WebRTC. No data is stored on any server, ensuring maximum privacy and speed.

- **Bidirectional P2P Rooms ("ROOMs"):**
  - Create secure, private rooms for real-time interaction.
  - **💬 Live Chat:** Engage in end-to-end encrypted chat with the other peer.
  - **📁 Multi-file & Folder Transfer:** Send multiple files and even entire folders. The application intelligently zips them on the fly for a seamless transfer.
  - **🔗 Easy Sharing:** Share room links easily via a direct link or a scannable QR code.

- **Technology Highlights:**
  - **🔒 Secure:** WebRTC channels are encrypted end-to-end by default.
  - **🚀 Fast:** Direct P2P connections minimize latency.
  - **Modern UI:** Built with React, TypeScript, and Tailwind CSS, featuring a clean and responsive design.

## 🛠️ Technologies Used

- **Frontend:**
  - React & TypeScript
  - Vite
  - Tailwind CSS with Shadcn/ui for components
  - `wouter` for routing
  - `socket.io-client` for signaling
- **Backend:**
  - Node.js & Express with TypeScript
  - `socket.io` for the signaling server
- **P2P Communication:**
  - WebRTC for direct data channels
- **Storage & Database:**
  - Supabase for user file storage (server-based sharing)
  - Drizzle ORM with a PostgreSQL database
- **Deployment:**
  - The live version is deployed on Render.

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/vedantdalavi14/File_Share.git
    cd File_Share
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add the following keys. You will need a Supabase account for this.

    ```env
    # Public key for the Supabase client (used on the frontend)
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

    # Secret service role key for Supabase admin tasks (used on the backend)
    SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
    ```

    The `supabaseUrl` is currently hardcoded but could be moved to the `.env` file for more flexibility.

### Running the Application

-   **Development Mode:**
    This command will start the Vite frontend and the Node.js Express backend concurrently. The application will be available at `http://localhost:8080`.
    ```bash
    npm run dev
    ```

-   **Production Build:**
    This command builds the frontend and backend for production.
    ```bash
    npm run build
    ```

-   **Start in Production:**
    This command starts the application from the compiled `dist` folder.
    ```bash
    npm run start
    ```

## 🏗️ Project Architecture

The application is a monorepo-style project with a `client` and `server` directory.

### Server (`/server`)

-   An **Express.js** server acts as the signaling server for WebRTC.
-   **Socket.IO** is used to manage rooms and pass signaling messages (offers, answers, ICE candidates) between peers to establish a connection.
-   It provides API endpoints for:
    -   Creating and validating P2P rooms (`/api/rooms`, `/api/bidirectional-rooms`).
    -   Initiating server-based uploads by generating signed URLs for Supabase (`/api/files/upload`).
    -   Finalizing uploads and retrieving file metadata (`/api/files/finalize`, `/api/files/:uuid`).
-   An in-memory store is used to manage active rooms and participants.

### Client (`/client`)

-   A **React** application built with **Vite** and written in **TypeScript**.
-   The `WebRTCManager` class (`/client/src/lib/webrtc.ts`) abstracts all the low-level WebRTC logic, including creating peer connections, managing data channels, and handling file chunking and reconstruction.
-   The `socketManager` (`/client/src/lib/socket.ts`) is a singleton for managing the Socket.IO connection to the signaling server.
-   **Components:** The UI is built with reusable React components, with core logic for file transfers encapsulated in `P2PFileSender.tsx` and `BidirectionalP2PRoom.tsx`.
-   **State Management:** Primarily uses React's `useState`, `useRef`, and `useEffect` hooks.

### File Sharing Flow

#### P2P File Transfer
1.  A user (sender) selects a file.
2.  A new room is created on the server, and a shareable link is generated.
3.  The sender connects to the signaling server and waits in the room.
4.  Another user (receiver) uses the link to join the room.
5.  The server notifies both users about each other's presence.
6.  A WebRTC connection is negotiated through the signaling server.
7.  Once the direct P2P connection is established, the file is transferred in chunks directly between the two peers.
8.  The receiver reconstructs the file and can download it.

#### Server-Based File Transfer
1.  A user selects a file to upload.
2.  The client requests a secure, signed upload URL from the server.
3.  The server generates this URL using Supabase Storage credentials.
4.  The client uploads the file directly to Supabase Storage using the signed URL.
5.  Upon successful upload, the client notifies the server to finalize the process, creating a metadata record in the database.
6.  The server returns a final shareable download link.

---

Feel free to contribute, open issues, and suggest improvements! 
