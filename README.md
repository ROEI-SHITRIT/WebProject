# Web Client Project (Part 2)

Web app for searching YouTube videos and managing playlists.  
Uses a **backend server**: users and playlists are stored on the server (session + JSON files). No Live Server – run via Node.

## What’s in the project

- **Registration & Login** – create account, sign in. Session is managed by the server.
- **Search** – search YouTube, play videos, add results to playlists.
- **Playlists** – create playlists, add/remove videos, rate, play. Optional: upload MP3 to playlists.

## Project structure

| Path | Purpose |
|------|--------|
| `public/` | Client: HTML, JS (auth, login, register, search, playlists) |
| `server/` | Backend: Express server, REST API, `data/` (users.json, playlists.json) |
| `package.json` | Dependencies and scripts |

## How to run

From the project root:

```bash
npm install
npm start
```

Then open **http://localhost:3000** in the browser.  
Do not use Live Server – the app is served by the Node server.
