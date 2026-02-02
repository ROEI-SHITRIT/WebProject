"use strict";

const YOUTUBE_API_KEY = "AIzaSyC5twBQgreWRSIuWKXZiM647toL4EVacPo";
const SEARCH_STORAGE_KEY_QUERY = "searchLastQuery";
const SEARCH_STORAGE_KEY_RESULTS = "searchLastResults";

function setAlert(msg) {
  const el = document.getElementById("pageAlert");
  el.textContent = msg;
  el.classList.remove("d-none");
}

function clearAlert() {
  const el = document.getElementById("pageAlert");
  el.textContent = "";
  el.classList.add("d-none");
}

function setModalAlert(msg) {
  const el = document.getElementById("addModalAlert");
  el.textContent = msg;
  el.classList.remove("d-none");
}

function clearModalAlert() {
  const el = document.getElementById("addModalAlert");
  el.textContent = "";
  el.classList.add("d-none");
}

function showToast(html) {
  const body = document.getElementById("toastBody");
  body.innerHTML = html;
  const toastEl = document.getElementById("appToast");
  const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 4500 });
  toast.show();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getQueryFromUrl() {
  const url = new URL(window.location.href);
  return (url.searchParams.get("q") || "").trim();
}

function setQueryToUrl(q) {
  const url = new URL(window.location.href);
  const value = (q || "").trim();
  if (value.length > 0) url.searchParams.set("q", value);
  else url.searchParams.delete("q");
  history.replaceState({}, "", url.toString());
}

function getUsername() {
  const user = getCurrentUser();
  return user ? String(user.username || "").trim() : "";
}

function makePlaylistId() {
  return `pl_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function apiGetPlaylists() {
  const username = getUsername();
  if (!username) return [];
  const store = getPlaylistsStore();
  const list = store[username];
  return Array.isArray(list) ? [...list] : [];
}

async function apiCreatePlaylist(name) {
  const username = getUsername();
  if (!username) throw new Error("Not logged in.");

  const store = getPlaylistsStore();
  const list = Array.isArray(store[username]) ? store[username] : [];
  const trimmed = String(name || "").trim();
  if (!trimmed) throw new Error("Please enter a playlist name.");

  const dup = list.some(
    (p) => String(p.name || "").trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (dup) throw new Error("Playlist name already exists.");

  const pl = {
    id: makePlaylistId(),
    name: trimmed,
    createdAt: Date.now(),
    videos: [],
  };
  list.push(pl);
  store[username] = list;
  savePlaylistsStore(store);
  return pl;
}

async function apiAddVideoToPlaylist(playlistId, video) {
  const username = getUsername();
  if (!username) throw new Error("Not logged in.");

  const store = getPlaylistsStore();
  const list = Array.isArray(store[username]) ? store[username] : [];
  const pl = list.find((p) => String(p.id) === String(playlistId));
  if (!pl) throw new Error("playlist_not_found");

  const vid = String(video.videoId || "");
  const exists = (pl.videos || []).some(
    (v) => String(v.type || "video") !== "mp3" && String(v.videoId || "") === vid
  );
  if (exists) throw new Error("already_in_playlist");

  const item = {
    type: "video",
    videoId: vid,
    title: String(video.title || ""),
    thumbnailUrl: String(video.thumbnailUrl || ""),
    rating: 0,
    addedAt: Date.now(),
  };
  if (!Array.isArray(pl.videos)) pl.videos = [];
  pl.videos.push(item);
  savePlaylistsStore(store);
  return item;
}

let currentUser = null;
let pendingVideo = null;
let playlistsCache = [];

function isVideoInAnyPlaylist(videoId) {
  const vid = String(videoId || "");
  return playlistsCache.some(
    (pl) => Array.isArray(pl.videos) && pl.videos.some((v) => String(v.videoId) === vid)
  );
}

function getPlaylistById(id) {
  return playlistsCache.find((p) => String(p.id) === String(id)) || null;
}

function renderResults(user, videos) {
  const row = document.getElementById("resultsRow");
  row.innerHTML = "";

  if (!videos || videos.length === 0) {
    row.innerHTML = `<div class="col-12"><div class="text-muted">No results.</div></div>`;
    return;
  }

  videos.forEach((v) => {
    const titleEsc = escapeHtml(v.title || "");
    const vid = String(v.videoId || "");
    const already = isVideoInAnyPlaylist(vid);

    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4";
    col.innerHTML = `
      <div class="card h-100 shadow-sm position-relative">
        ${already ? `<span class="badge bg-success position-absolute top-0 end-0 m-2">✓</span>` : ""}
        <img src="${escapeHtml(v.thumbnailUrl || "")}" class="card-img-top" alt="thumbnail" style="cursor:pointer;" data-action="play" data-video-id="${escapeHtml(vid)}" data-title="${titleEsc}" />
        <div class="card-body d-flex flex-column">
          <h6 class="card-title mb-2" title="${titleEsc}" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;cursor:pointer;" data-action="play" data-video-id="${escapeHtml(vid)}" data-title="${titleEsc}">${titleEsc}</h6>
          <div class="small text-muted mb-2">Duration: ${escapeHtml(v.duration || "N/A")} | Views: ${escapeHtml(v.views || "N/A")}</div>
          <div class="mt-auto d-grid gap-2">
            <button class="btn btn-outline-primary btn-sm" type="button" data-action="play" data-video-id="${escapeHtml(vid)}" data-title="${titleEsc}">Play</button>
            <button class="btn btn-sm ${already ? "btn-secondary" : "btn-success"}" type="button" data-action="add" data-video-id="${escapeHtml(vid)}" data-title="${titleEsc}" data-thumb="${escapeHtml(v.thumbnailUrl || "")}" ${already ? "disabled" : ""}>Add to favorites</button>
          </div>
        </div>
      </div>
    `;
    row.appendChild(col);
  });
}

function openPlayer(videoId, title) {
  const frame = document.getElementById("playerFrame");
  const titleEl = document.getElementById("playerTitle");
  titleEl.textContent = title || "";
  frame.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("playerModal")).show();
}

function closePlayer() {
  document.getElementById("playerFrame").src = "";
}

function getMockResults(query) {
  const q = (query || "").trim() || "demo";
  return [
    { videoId: "dQw4w9WgXcQ", title: `Demo result for "${q}" (1)`, thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg", duration: "N/A", views: "N/A" },
    { videoId: "kJQP7kiw5Fk", title: `Demo result for "${q}" (2)`, thumbnailUrl: "https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg", duration: "N/A", views: "N/A" },
  ];
}

function populatePlaylistSelect() {
  const select = document.getElementById("playlistSelect");
  const hint = document.getElementById("noPlaylistsHint");
  select.innerHTML = "";

  if (!Array.isArray(playlistsCache) || playlistsCache.length === 0) {
    hint.classList.remove("d-none");
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No playlists";
    select.appendChild(opt);
    select.disabled = true;
    return;
  }

  hint.classList.add("d-none");
  select.disabled = false;
  playlistsCache.forEach((pl) => {
    const opt = document.createElement("option");
    opt.value = pl.id;
    opt.textContent = pl.name;
    select.appendChild(opt);
  });
}

function openAddModal(video) {
  pendingVideo = video;
  clearModalAlert();
  document.getElementById("newPlaylistName").value = "";
  populatePlaylistSelect();
  bootstrap.Modal.getOrCreateInstance(document.getElementById("addToPlaylistModal")).show();
}

function markCardAsSaved(videoId) {
  const btn = document.querySelector(`button[data-action="add"][data-video-id="${CSS.escape(String(videoId))}"]`);
  if (!btn) return;
  btn.disabled = true;
  btn.classList.remove("btn-success");
  btn.classList.add("btn-secondary");
  const card = btn.closest(".card");
  if (card && !card.querySelector(".badge.bg-success")) {
    const badge = document.createElement("span");
    badge.className = "badge bg-success position-absolute top-0 end-0 m-2";
    badge.textContent = "✓";
    card.appendChild(badge);
  }
}

function attachResultsHandlers() {
  const row = document.getElementById("resultsRow");
  row.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.getAttribute("data-action");
    if (action === "play") {
      const videoId = target.getAttribute("data-video-id");
      const title = target.getAttribute("data-title");
      if (videoId) openPlayer(videoId, title);
      return;
    }
    if (action === "add") {
      const video = {
        videoId: target.getAttribute("data-video-id"),
        title: target.getAttribute("data-title"),
        thumbnailUrl: target.getAttribute("data-thumb"),
      };
      if (isVideoInAnyPlaylist(video.videoId)) {
        setAlert("This video is already in one of your playlists.");
        markCardAsSaved(video.videoId);
        return;
      }
      openAddModal(video);
    }
  });
  document.getElementById("playerModal").addEventListener("hidden.bs.modal", closePlayer);
}

function formatViews(viewCount) {
  const n = Number(viewCount);
  if (!Number.isFinite(n)) return "N/A";
  return n.toLocaleString();
}

function isoDurationToClock(iso) {
  if (!iso || typeof iso !== "string") return "N/A";
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return "N/A";
  const hours = Number(m[1] || 0);
  const mins = Number(m[2] || 0);
  const secs = Number(m[3] || 0);
  const totalSeconds = hours * 3600 + mins * 60 + secs;
  if (!Number.isFinite(totalSeconds)) return "N/A";
  const h = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  const mm2 = String(mm).padStart(2, "0");
  const ss2 = String(ss).padStart(2, "0");
  return h > 0 ? `${h}:${mm2}:${ss2}` : `${mm2}:${ss2}`;
}

async function fetchVideosDetailsByIds(videoIds) {
  if (!Array.isArray(videoIds) || videoIds.length === 0) return new Map();
  const ids = videoIds.map(String).filter(Boolean).join(",");
  const url = "https://www.googleapis.com/youtube/v3/videos" + `?part=contentDetails,statistics&id=${encodeURIComponent(ids)}` + `&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Videos details API error");
  const data = await res.json();
  const map = new Map();
  (data.items || []).forEach((item) => {
    const id = item?.id;
    const isoDur = item?.contentDetails?.duration;
    const views = item?.statistics?.viewCount;
    map.set(String(id), { duration: isoDurationToClock(isoDur), views: formatViews(views) });
  });
  return map;
}

let lastSearchToken = 0;

async function runSearch(query) {
  const token = ++lastSearchToken;
  clearAlert();
  const q = (query || "").trim();

  if (!q) {
    renderResults(currentUser, []);
    setQueryToUrl("");
    try {
      sessionStorage.removeItem(SEARCH_STORAGE_KEY_QUERY);
      sessionStorage.removeItem(SEARCH_STORAGE_KEY_RESULTS);
    } catch (_) {}
    return;
  }

  setQueryToUrl(q);

  if (!YOUTUBE_API_KEY) {
    const videos = getMockResults(q);
    renderResults(currentUser, videos);
    try {
      sessionStorage.setItem(SEARCH_STORAGE_KEY_QUERY, q);
      sessionStorage.setItem(SEARCH_STORAGE_KEY_RESULTS, JSON.stringify(videos));
    } catch (_) {}
    return;
  }

  try {
    const url = "https://www.googleapis.com/youtube/v3/search" + `?part=snippet&type=video&maxResults=9&q=${encodeURIComponent(q)}` + `&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    const baseVideos = (data.items || [])
      .map((item) => ({
        videoId: item?.id?.videoId,
        title: item?.snippet?.title,
        thumbnailUrl: item?.snippet?.thumbnails?.medium?.url,
      }))
      .filter((v) => v.videoId);
    const ids = baseVideos.map((v) => v.videoId);
    const detailsMap = await fetchVideosDetailsByIds(ids);
    const videos = baseVideos.map((v) => {
      const d = detailsMap.get(String(v.videoId)) || {};
      return { ...v, duration: d.duration || "N/A", views: d.views || "N/A" };
    });
    if (token !== lastSearchToken) return;
    renderResults(currentUser, videos);
    try {
      sessionStorage.setItem(SEARCH_STORAGE_KEY_QUERY, q);
      sessionStorage.setItem(SEARCH_STORAGE_KEY_RESULTS, JSON.stringify(videos));
    } catch (_) {}
  } catch (err) {
    console.error(err);
    setAlert("Failed to load videos from YouTube.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    const user = await initAuthUI({
      redirectIfMissing: true,
      redirectTo: "login.html",
    });
    if (!user) return;

    currentUser = user;

    try {
      playlistsCache = await apiGetPlaylists();
    } catch (err) {
      console.error(err);
      playlistsCache = [];
      setAlert("Could not load playlists.");
    }

    attachResultsHandlers();

    document.getElementById("addToPlaylistModal").addEventListener("hidden.bs.modal", () => {
      pendingVideo = null;
      clearModalAlert();
      document.getElementById("newPlaylistName").value = "";
    });

    document.getElementById("confirmAddBtn").addEventListener("click", async () => {
      clearModalAlert();
      if (!pendingVideo) return;

      const newName = document.getElementById("newPlaylistName").value.trim();
      const select = document.getElementById("playlistSelect");
      const selectedId = select && !select.disabled ? select.value : "";

      try {
        let playlistId = selectedId;

        if (newName.length > 0) {
          const created = await apiCreatePlaylist(newName);
          playlistsCache.push(created);
          playlistId = created.id;
        } else if (!playlistId) {
          setModalAlert("Please choose an existing playlist or create a new one.");
          return;
        }

        if (isVideoInAnyPlaylist(pendingVideo.videoId)) {
          setModalAlert("This video is already in one of your playlists.");
          markCardAsSaved(pendingVideo.videoId);
          return;
        }

        await apiAddVideoToPlaylist(playlistId, pendingVideo);

        const pl = getPlaylistById(playlistId);
        if (pl) {
          if (!Array.isArray(pl.videos)) pl.videos = [];
          pl.videos.push({
            videoId: String(pendingVideo.videoId),
            title: String(pendingVideo.title || ""),
            thumbnailUrl: String(pendingVideo.thumbnailUrl || ""),
            rating: 0,
          });
        }

        bootstrap.Modal.getOrCreateInstance(document.getElementById("addToPlaylistModal")).hide();
        markCardAsSaved(pendingVideo.videoId);
        showToast(`Video saved. <a href="playlists.html?playlistId=${encodeURIComponent(playlistId)}">Open playlist</a>.`);
        pendingVideo = null;
      } catch (err) {
        console.error(err);
        const msg = String(err && err.message ? err.message : "");
        if (msg === "already_in_playlist") setModalAlert("This video is already in this playlist.");
        else if (msg) setModalAlert(msg);
        else setModalAlert("Could not save video.");
      }
    });

    const input = document.getElementById("queryInput");
    const form = document.getElementById("searchForm");

    const initialQ = getQueryFromUrl();
    if (initialQ) {
      input.value = initialQ;
      runSearch(initialQ);
    } else {
      let lastQuery = "";
      let lastResults = [];
      try {
        lastQuery = (sessionStorage.getItem(SEARCH_STORAGE_KEY_QUERY) || "").trim();
        const raw = sessionStorage.getItem(SEARCH_STORAGE_KEY_RESULTS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) lastResults = parsed;
        }
      } catch (_) {}
      if (lastQuery) {
        input.value = lastQuery;
        setQueryToUrl(lastQuery);
        if (lastResults.length > 0) {
          renderResults(currentUser, lastResults);
        } else {
          runSearch(lastQuery);
        }
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      runSearch(input.value);
    });
  })();
});
