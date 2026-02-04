"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

/* -----------------------------
   Paths
----------------------------- */
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PLAYLISTS_FILE = path.join(DATA_DIR, "playlists.json");

const UPLOADS_DIR = path.join(__dirname, "uploads");

/* -----------------------------
   Uploads (MP3)
----------------------------- */

// Multer config: store MP3 files inside UPLOADS_DIR
const mp3Storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const original = String(file.originalname || "audio.mp3");
    const safe = original
      .replaceAll(" ", "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const ext = (path.extname(safe) || ".mp3").toLowerCase();
    const base = path.basename(safe, ext) || "audio";
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

    cb(null, `${base}_${unique}${ext}`);
  },
});

function mp3FileFilter(req, file, cb) {
  const nameOk = String(file.originalname || "").toLowerCase().endsWith(".mp3");
  const mimeOk = file.mimetype === "audio/mpeg" || file.mimetype === "audio/mp3";
  if (nameOk || mimeOk) return cb(null, true);
  return cb(new Error("Only MP3 files are allowed."));
}

const uploadMp3 = multer({
  storage: mp3Storage,
  fileFilter: mp3FileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});

/* -----------------------------
   Middleware
----------------------------- */
app.use(express.json({ limit: "1mb" }));

app.use(
  session({
    secret: "web-client-project-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // secure: true, // enable in production with https
      // sameSite: "lax",
    },
  })
);

/* Serve static client */
app.use(express.static(PUBLIC_DIR));

/* Serve uploaded files (Part B: MP3 uploads later) */
app.use("/uploads", express.static(UPLOADS_DIR));

/* -----------------------------
   Helpers: FS + JSON
----------------------------- */
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/* Read JSON safely, return fallback if anything fails */
function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/* Write JSON safely */
function writeJsonSafe(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function normalizeUsername(u) {
  return String(u || "").trim().toLowerCase();
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

function getSessionUsername(req) {
  return String(req.session.user.username || "");
}

/* -----------------------------
   Data models
----------------------------- */
/*
users.json: Array<{
  username, password, firstName, imageUrl, createdAt
}>

playlists.json: Object keyed by username:
{
  "alice": [
    { id, name, createdAt, videos: [ ... ] }
  ]
}

A video item (YouTube):
{
  type: "video",         // optional in old data; we treat missing as "video"
  videoId,
  title,
  thumbnailUrl,
  rating,
  addedAt
}

An MP3 item:
{
  type: "mp3",
  mp3Id,
  title,
  fileUrl,               // "/uploads/<filename>.mp3"
  rating,
  addedAt
}
*/

function loadUsers() {
  return readJsonSafe(USERS_FILE, []);
}

function saveUsers(users) {
  writeJsonSafe(USERS_FILE, users);
}

function loadPlaylistsStore() {
  return readJsonSafe(PLAYLISTS_FILE, {});
}

function savePlaylistsStore(store) {
  writeJsonSafe(PLAYLISTS_FILE, store);
}

function getUserPlaylistsFromStore(store, username) {
  const list = store[username];
  return Array.isArray(list) ? list : [];
}

function setUserPlaylistsInStore(store, username, playlists) {
  store[username] = playlists;
}

function makePlaylistId() {
  return `pl_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizePlaylist(pl) {
  if (!pl || typeof pl !== "object") return;
  if (!Array.isArray(pl.videos)) pl.videos = [];

  pl.videos.forEach((item) => {
    if (typeof item.rating !== "number") item.rating = Number(item.rating) || 0;
    if (!item.type) item.type = "video"; // backward compatibility
  });
}

function findPlaylist(playlists, playlistId) {
  return playlists.find((p) => String(p.id) === String(playlistId)) || null;
}

/* -----------------------------
   AUTH API
----------------------------- */

// POST /api/register
app.post("/api/register", (req, res) => {
  const { username, password, firstName, imageUrl } = req.body || {};

  if (!username || !password || !firstName || !imageUrl) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const users = loadUsers();
  const u = normalizeUsername(username);

  const exists = users.some((x) => normalizeUsername(x.username) === u);
  if (exists) return res.status(409).json({ error: "username_exists" });

  // Assignment simplicity: store password as plain text
  users.push({
    username: String(username).trim(),
    password: String(password),
    firstName: String(firstName).trim(),
    imageUrl: String(imageUrl).trim(),
    createdAt: Date.now(),
  });

  saveUsers(users);
  return res.json({ ok: true });
});

// POST /api/login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const users = loadUsers();
  const u = normalizeUsername(username);

  const user = users.find(
    (x) =>
      normalizeUsername(x.username) === u &&
      String(x.password) === String(password)
  );

  if (!user) return res.status(401).json({ error: "invalid_credentials" });

  req.session.user = {
    username: user.username,
    firstName: user.firstName,
    imageUrl: user.imageUrl,
  };

  return res.json({ ok: true, user: req.session.user });
});

// POST /api/logout
app.post("/api/logout", (req, res) => {
  if (!req.session) return res.json({ ok: true });
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/me
app.get("/api/me", (req, res) => {
  const user = req.session && req.session.user ? req.session.user : null;
  return res.json({ user });
});

/* -----------------------------
   PLAYLISTS API
----------------------------- */

// GET /api/playlists
app.get("/api/playlists", requireAuth, (req, res) => {
  const store = loadPlaylistsStore();
  const username = getSessionUsername(req);

  const playlists = getUserPlaylistsFromStore(store, username);
  playlists.forEach(normalizePlaylist);

  return res.json({ playlists });
});

// POST /api/playlists
// Body: { name }
app.post("/api/playlists", requireAuth, (req, res) => {
  const { name } = req.body || {};
  const playlistName = String(name || "").trim();

  if (!playlistName) return res.status(400).json({ error: "missing_name" });

  const store = loadPlaylistsStore();
  const username = getSessionUsername(req);

  const playlists = getUserPlaylistsFromStore(store, username);

  const dup = playlists.some(
    (p) => String(p.name || "").trim().toLowerCase() === playlistName.toLowerCase()
  );
  if (dup) return res.status(409).json({ error: "playlist_name_exists" });

  const pl = {
    id: makePlaylistId(),
    name: playlistName,
    createdAt: Date.now(),
    videos: [],
  };

  playlists.push(pl);
  setUserPlaylistsInStore(store, username, playlists);
  savePlaylistsStore(store);

  return res.status(201).json({ playlist: pl });
});

// POST /api/playlists/:playlistId/items
// Adds a YouTube video to a playlist.
// Body: { videoId, title, thumbnailUrl }
app.post("/api/playlists/:playlistId/items", requireAuth, (req, res) => {
  const { playlistId } = req.params;
  const { videoId, title, thumbnailUrl } = req.body || {};

  if (!videoId || !title || !thumbnailUrl) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const store = loadPlaylistsStore();
  const username = getSessionUsername(req);
  const playlists = getUserPlaylistsFromStore(store, username);

  const playlist = findPlaylist(playlists, playlistId);
  if (!playlist) return res.status(404).json({ error: "playlist_not_found" });

  normalizePlaylist(playlist);

  // Prevent duplicates (YouTube items only)
  const exists = playlist.videos.some(
    (v) =>
      String(v.type || "video") !== "mp3" &&
      String(v.videoId || "") === String(videoId)
  );
  if (exists) return res.status(409).json({ error: "already_exists" });

  const item = {
    type: "video",
    videoId: String(videoId),
    title: String(title),
    thumbnailUrl: String(thumbnailUrl),
    rating: 0,
    addedAt: Date.now(),
  };

  playlist.videos.push(item);

  setUserPlaylistsInStore(store, username, playlists);
  savePlaylistsStore(store);

  return res.status(201).json({ ok: true, item });
});


// DELETE /api/playlists/:playlistId
app.delete("/api/playlists/:playlistId", requireAuth, (req, res) => {
  const { playlistId } = req.params;

  const store = loadPlaylistsStore();
  const username = getSessionUsername(req);

  const playlists = getUserPlaylistsFromStore(store, username);
  const before = playlists.length;

  const next = playlists.filter((p) => String(p.id) !== String(playlistId));
  if (next.length === before) return res.status(404).json({ error: "playlist_not_found" });

  setUserPlaylistsInStore(store, username, next);
  savePlaylistsStore(store);

  return res.json({ ok: true });
});

// PATCH /api/playlists/:playlistId/items/:videoId
// Body: { rating }
app.patch("/api/playlists/:playlistId/items/:videoId", requireAuth, (req, res) => {
  const { playlistId, videoId } = req.params;
  const { rating } = req.body || {};

  const newRating = Number(rating);
  if (!Number.isFinite(newRating) || newRating < 0 || newRating > 5) {
    return res.status(400).json({ error: "invalid_rating" });
  }

  const store = loadPlaylistsStore();
  const username = getSessionUsername(req);
  const playlists = getUserPlaylistsFromStore(store, username);

  const playlist = findPlaylist(playlists, playlistId);
  if (!playlist) return res.status(404).json({ error: "playlist_not_found" });

  normalizePlaylist(playlist);

  const item = playlist.videos.find(
    (v) => String(v.type || "video") !== "mp3" && String(v.videoId || "") === String(videoId)
  );
  if (!item) return res.status(404).json({ error: "item_not_found" });

  item.rating = newRating;

  setUserPlaylistsInStore(store, username, playlists);
  savePlaylistsStore(store);

  return res.json({ ok: true });
});

// DELETE /api/playlists/:playlistId/items/:videoId
app.delete("/api/playlists/:playlistId/items/:videoId", requireAuth, (req, res) => {
  const { playlistId, videoId } = req.params;

  const store = loadPlaylistsStore();
  const username = getSessionUsername(req);
  const playlists = getUserPlaylistsFromStore(store, username);

  const playlist = findPlaylist(playlists, playlistId);
  if (!playlist) return res.status(404).json({ error: "playlist_not_found" });

  normalizePlaylist(playlist);

  const before = playlist.videos.length;
  playlist.videos = playlist.videos.filter(
    (v) => !(String(v.type || "video") !== "mp3" && String(v.videoId || "") === String(videoId))
  );

  if (playlist.videos.length === before) {
    return res.status(404).json({ error: "item_not_found" });
  }

  setUserPlaylistsInStore(store, username, playlists);
  savePlaylistsStore(store);

  return res.json({ ok: true });
});

/* -----------------------------
   MP3 Uploads API
   MP3 items are stored inside the same playlist.videos array.
   Item shape (MP3):
   {
     type: "mp3",
     mp3Id: "mp3_...",
     title: "...",
     fileUrl: "/uploads/<filename>.mp3",
     rating: 0,
     addedAt: <timestamp>
   }
----------------------------- */

// POST /api/playlists/:playlistId/mp3
// Multipart form-data: field "file" (MP3), optional field "title"
app.post(
  "/api/playlists/:playlistId/mp3",
  requireAuth,
  uploadMp3.single("file"),
  (req, res) => {
    const { playlistId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "missing_file" });
    }

    const title = String((req.body && req.body.title) || "").trim();

    const store = loadPlaylistsStore();
    const username = getSessionUsername(req);
    const playlists = getUserPlaylistsFromStore(store, username);

    const playlist = findPlaylist(playlists, playlistId);
    if (!playlist) return res.status(404).json({ error: "playlist_not_found" });

    normalizePlaylist(playlist);

    const item = {
      type: "mp3",
      mp3Id: `mp3_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      title: title || req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      rating: 0,
      addedAt: Date.now(),
    };

    playlist.videos.push(item);

    setUserPlaylistsInStore(store, username, playlists);
    savePlaylistsStore(store);

    return res.status(201).json({ ok: true, item });
  }
);

// PATCH /api/playlists/:playlistId/mp3/:mp3Id
// Body: { rating }
app.patch("/api/playlists/:playlistId/mp3/:mp3Id", requireAuth, (req, res) => {
  const { playlistId, mp3Id } = req.params;
  const { rating } = req.body || {};

  const newRating = Number(rating);
  if (!Number.isFinite(newRating) || newRating < 0 || newRating > 5) {
    return res.status(400).json({ error: "invalid_rating" });
  }

  const store = loadPlaylistsStore();
  const username = getSessionUsername(req);
  const playlists = getUserPlaylistsFromStore(store, username);

  const playlist = findPlaylist(playlists, playlistId);
  if (!playlist) return res.status(404).json({ error: "playlist_not_found" });

  normalizePlaylist(playlist);

  const item = playlist.videos.find(
    (v) => String(v.type || "") === "mp3" && String(v.mp3Id || "") === String(mp3Id)
  );
  if (!item) return res.status(404).json({ error: "item_not_found" });

  item.rating = newRating;

  setUserPlaylistsInStore(store, username, playlists);
  savePlaylistsStore(store);

  return res.json({ ok: true });
});

// DELETE /api/playlists/:playlistId/mp3/:mp3Id
app.delete("/api/playlists/:playlistId/mp3/:mp3Id", requireAuth, (req, res) => {
  const { playlistId, mp3Id } = req.params;

  const store = loadPlaylistsStore();
  const username = getSessionUsername(req);
  const playlists = getUserPlaylistsFromStore(store, username);

  const playlist = findPlaylist(playlists, playlistId);
  if (!playlist) return res.status(404).json({ error: "playlist_not_found" });

  normalizePlaylist(playlist);

  const before = playlist.videos.length;
  playlist.videos = playlist.videos.filter(
    (v) => !(String(v.type || "") === "mp3" && String(v.mp3Id || "") === String(mp3Id))
  );

  if (playlist.videos.length === before) {
    return res.status(404).json({ error: "item_not_found" });
  }

  setUserPlaylistsInStore(store, username, playlists);
  savePlaylistsStore(store);

  return res.json({ ok: true });
});

/* -----------------------------
   Fallback route
----------------------------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

/* -----------------------------
   Start server
----------------------------- */
ensureDirs();
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
