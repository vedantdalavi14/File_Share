<div align="center">
  <img src="client/public/ope_ope_no_mi1.png" alt="Ope Ope no Mi" width="150"/>

  # 🏴‍☠️ Ope Ope no Mi - P2P File Sharing

  ### A versatile, hybrid file-sharing application inspired by the powers of the Ope Ope no Mi from One Piece.

## <a name="-screenshots"></a>📸 Live Demo
https://github.com/user-attachments/assets/4cde506f-2b61-4912-a6e5-5f4f0e033f8f


  <p>
    <a href="https://file-share-w2g2.onrender.com/" target="_blank"><strong>Live Demo »</strong></a>
    <br />
    <br />
    <a href="https://github.com/vedantdalavi14/File_Share/issues">Report Bug</a>
    ·
    <a href="https://github.com/vedantdalavi14/File_Share/issues">Request Feature</a>
  </p>

  <p>
    <a href="https://github.com/vedantdalavi14/File_Share/blob/main/LICENSE"><img src="https://img.shields.io/github/license/vedantdalavi14/File_Share?style=for-the-badge" alt="License"></a>
    <a href="https://www.linkedin.com/in/vedant-dalavi-175419331/"><img src="https://img.shields.io/badge/LinkedIn-VedantDalavi-blue?style=for-the-badge&logo=linkedin" alt="LinkedIn"></a>
    <a href="https://twitter.com/VedantDalavi14"><img src="https://img.shields.io/badge/Twitter-@VedantDalavi14-blue?style=for-the-badge&logo=twitter" alt="Twitter"></a>
  </p>
</div>

---

## 📋 Table of Contents

- [About The Project](#about-the-project)
- [Key Features](#-key-features)
- [Screenshots](#-screenshots)
- [Built With](#-built-with)
- [Getting Started](#-getting-started)
- [Project Architecture](#-project-architecture)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

---

## <a name="about-the-project"></a>📖 About The Project

**Ope Ope no Mi** is a hybrid file-sharing application that provides multiple ways to share files and communicate directly with others, emphasizing privacy, speed, and user control. This project was built to explore the power of WebRTC for peer-to-peer connections and to create a seamless, real-world file-sharing experience.

---

## <a name="-key-features"></a>✨ Key Features

- **Hybrid File Sharing:**
  - **☁️ Server-Based Upload:** Securely upload files to Supabase Storage, with automatic deletion after 24 hours.
  - **⚡ Instant P2P Transfer:** Send files directly to another user using WebRTC, with no server storage for maximum privacy.
- **Bidirectional P2P Rooms:**
  - **💬 Live Chat:** Engage in end-to-end encrypted chat with another peer.
  - **📁 Multi-file & Folder Transfer:** Send multiple files and folders, which are intelligently zipped on the fly.
  - **🔗 Easy Sharing:** Share room links via a direct link or a scannable QR code.
- **Technology Highlights:**
  - **🔒 Secure:** WebRTC channels are encrypted end-to-end by default.
  - **🚀 Fast:** Direct P2P connections minimize latency and are ideal for large files.
  - **Modern UI:** A clean and responsive design built with React, TypeScript, and Tailwind CSS.

---

## <a name="-built-with"></a>🛠️ Built With

This project is built with a modern, full-stack TypeScript architecture.

| Tech Stack                | Description                                                                 |
| ------------------------- | --------------------------------------------------------------------------- |
| **Frontend**              |                                                                             |
| [React](https://reactjs.org/)     | A JavaScript library for building user interfaces.                          |
| [TypeScript](https://www.typescriptlang.org/) | A typed superset of JavaScript that compiles to plain JavaScript.         |
| [Vite](https://vitejs.dev/)       | A fast frontend build tool that provides a lightning-fast development experience. |
| [Tailwind CSS](https://tailwindcss.com/) | A utility-first CSS framework for rapid UI development.                     |
| [Shadcn/ui](https://ui.shadcn.com/) | Re-usable components built using Radix UI and Tailwind CSS.                 |
| **Backend**               |                                                                             |
| [Node.js](https://nodejs.org/)   | A JavaScript runtime built on Chrome's V8 JavaScript engine.                |
| [Express](https://expressjs.com/)   | A minimal and flexible Node.js web application framework.                   |
| [Socket.IO](https://socket.io/)    | Enables real-time, bidirectional, and event-based communication.            |
| **P2P & Storage**         |                                                                             |
| [WebRTC](https://webrtc.org/)      | Enables real-time communication of audio, video, and data in web browsers.  |
| [Supabase](https://supabase.io/)  | An open-source Firebase alternative for storage and database.               |
| [Drizzle ORM](https://orm.drizzle.team/) | A TypeScript ORM for building web applications with SQL databases.            |
| **Deployment**            |                                                                             |
| [Render](https://render.com/)      | A unified cloud to build and run all your apps and websites.                |

---

## <a name="-getting-started"></a>🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- [Node.js](https://nodejs.org/en/download/) (v18 or later recommended)
- [npm](https://www.npmjs.com/get-npm) or [yarn](https://classic.yarnpkg.com/en/docs/install/)

### Installation

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
    # Public key for the Supabase client (frontend)
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

    # Secret service role key for Supabase admin (backend)
    SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
    ```

### Running the Application

-   **Development Mode:**
    Starts the Vite frontend and the Node.js backend concurrently.
    ```bash
    npm run dev
    ```

-   **Production Build:**
    Builds the frontend and backend for production.
    ```bash
    npm run build
    ```

-   **Start in Production:**
    Starts the application from the compiled `dist` folder.
    ```bash
    npm run start
    ```

---

## <a name="-project-architecture"></a>🏗️ Project Architecture

The application follows a monorepo-style structure with a `client` and `server` directory.

-   **`/server`**: The Express.js backend that serves as the signaling server for WebRTC. It uses Socket.IO to manage rooms and pass signaling messages between peers. It also provides API endpoints for server-based file uploads and room management.
-   **`/client`**: The React application built with Vite. It contains all the UI components and the client-side logic for WebRTC connections, file transfers, and chat.
-   **`/shared`**: Contains shared code, such as database schemas, that can be used by both the client and the server.

### File Sharing Flow

#### P2P File Transfer
1.  A sender selects a file, and a new room is created on the server.
2.  A shareable link is generated, which the sender shares with a receiver.
3.  The receiver joins the room, and the signaling server notifies both users.
4.  A WebRTC connection is negotiated through the signaling server.
5.  Once the P2P connection is established, the file is transferred in chunks directly between the two peers.

#### Server-Based File Transfer
1.  A user uploads a file, and the client requests a secure signed URL from the server.
2.  The client uploads the file directly to Supabase Storage.
3.  Upon completion, the server creates a metadata record and returns a final shareable download link.

---

## <a name="-contributing"></a>🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

To contribute:
1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## <a name="-license"></a>📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## <a name="-contact"></a>📬 Contact

Vedant Dalavi - [LinkedIn](https://www.linkedin.com/in/vedant-dalavi-175419331/) - [Portfolio](https://vedantdalavi.vercel.app/)

Project Link: [https://github.com/vedantdalavi14/File_Share](https://github.com/vedantdalavi14/File_Share) 
