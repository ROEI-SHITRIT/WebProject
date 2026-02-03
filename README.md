# Web Client Project

A simple web app for searching YouTube videos and managing playlists.  
**Current version: Part A** – client-side only, no server. All data is stored in the browser (localStorage).

**Live Demo:** [https://roei-shitrit.github.io/WebProject/](https://roei-shitrit.github.io/WebProject/)

## What’s in the project

- **Registration** – create an account (username, password, first name, image URL).
- **Login / Logout** – sign in and out. Session is kept in localStorage.
- **Search** – search YouTube, play videos, add results to playlists.
- **Playlists** – create playlists, add/remove videos, rate them, play from the list.

Data (users, playlists) is saved in **localStorage**, so it stays until you clear site data and there is no backend.

## Project structure

| File | Purpose |
|------|--------|
| `index.html` | Home page |
| `register.html` | Registration form |
| `login.html` | Login form |
| `search.html` | YouTube search and results |
| `playlists.html` | View and manage playlists |
| `auth.js` | Shared auth and localStorage (users, current user, playlists) |
| `register.js` | Registration logic |
| `login.js` | Login logic |
| `search.js` | Search, results, add-to-playlist |
| `playlists.js` | Playlist list, videos, play, rate, delete |

## How to run

1. Open the project folder in VS Code / Cursor.
2. Install the **Live Server** extension if you don’t have it.
3. Right-click `index.html` → **Open with Live Server**, or click **Go Live** in the status bar.
4. Use the site in the browser (e.g. register → login → search → playlists).

You can also open `index.html` directly in the browser (double-click the file).  
No server or `npm install` is required for Part A.
