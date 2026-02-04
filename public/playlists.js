"use strict";

// View mode: "cards" | "table" (UI preference only)
const VIEW_MODE_KEY = "playlistsViewMode";
let viewMode = localStorage.getItem(VIEW_MODE_KEY) || "cards";

/* ---------- API ---------- */
async function apiGetPlaylists() {
  const res = await fetch("/api/playlists");
  if (!res.ok) throw new Error("Failed to load playlists");
  const data = await res.json();
  return Array.isArray(data.playlists) ? data.playlists : [];
}

async function apiCreatePlaylist(name) {
  const res = await fetch("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === "playlist_name_exists") throw new Error("A playlist with this name already exists.");
    if (data.error === "missing_name") throw new Error("Please enter a playlist name.");
    throw new Error("Failed to create playlist.");
  }
  return data.playlist;
}

async function apiDeletePlaylist(playlistId) {
  const res = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === "playlist_not_found") throw new Error("Playlist not found.");
    throw new Error("Failed to delete playlist.");
  }
  return true;
}

async function apiDeleteVideo(playlistId, videoId) {
  const res = await fetch(
    `/api/playlists/${encodeURIComponent(playlistId)}/items/${encodeURIComponent(videoId)}`,
    { method: "DELETE" }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === "item_not_found") throw new Error("Video not found in playlist.");
    throw new Error("Failed to remove video.");
  }
  return true;
}

async function apiSetRating(playlistId, videoId, rating) {
  const res = await fetch(
    `/api/playlists/${encodeURIComponent(playlistId)}/items/${encodeURIComponent(videoId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === "invalid_rating") throw new Error("Invalid rating.");
    throw new Error("Failed to update rating.");
  }
  return true;
}

async function apiUploadMp3(playlistId, file, title) {
  const fd = new FormData();
  fd.append("file", file);
  if (title) fd.append("title", String(title));

  const res = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}/mp3`, {
    method: "POST",
    body: fd,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === "missing_file") throw new Error("Please choose an MP3 file.");
    if (data.error === "playlist_not_found") throw new Error("Playlist not found.");
    throw new Error("Failed to upload MP3.");
  }
  return data.item;
}

async function apiDeleteMp3(playlistId, mp3Id) {
  const res = await fetch(
    `/api/playlists/${encodeURIComponent(playlistId)}/mp3/${encodeURIComponent(mp3Id)}`,
    { method: "DELETE" }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === "item_not_found") throw new Error("MP3 not found in playlist.");
    throw new Error("Failed to remove MP3.");
  }
  return true;
}

async function apiSetMp3Rating(playlistId, mp3Id, rating) {
  const res = await fetch(
    `/api/playlists/${encodeURIComponent(playlistId)}/mp3/${encodeURIComponent(mp3Id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === "invalid_rating") throw new Error("Invalid rating.");
    throw new Error("Failed to update rating.");
  }
  return true;
}

/* ---------- URL ---------- */
function getPlaylistIdFromUrl() {
  const url = new URL(window.location.href);
  return (url.searchParams.get("playlistId") || "").trim();
}

function setPlaylistIdToUrl(id) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("playlistId", id);
  else url.searchParams.delete("playlistId");
  history.replaceState({}, "", url.toString());
}

/* ---------- Utils ---------- */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------- Alerts ---------- */
function showSidebarAlert(msg) {
  const el = document.getElementById("sidebarAlert");
  el.textContent = msg;
  el.classList.remove("d-none");
}

function clearSidebarAlert() {
  const el = document.getElementById("sidebarAlert");
  el.textContent = "";
  el.classList.add("d-none");
}

function showMp3UploadAlert(msg, kind) {
  const el = document.getElementById("mp3UploadAlert");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("d-none");
  el.classList.toggle("alert-success", kind === "success");
  el.classList.toggle("alert-danger", kind !== "success");
}

function clearMp3UploadAlert() {
  const el = document.getElementById("mp3UploadAlert");
  if (!el) return;
  el.textContent = "";
  el.classList.add("d-none");
  el.classList.remove("alert-success");
  el.classList.add("alert-danger");
}

function showNewPlaylistAlert(msg) {
  const el = document.getElementById("newPlaylistAlert");
  el.textContent = msg;
  el.classList.remove("d-none");
}

function clearNewPlaylistAlert() {
  const el = document.getElementById("newPlaylistAlert");
  el.textContent = "";
  el.classList.add("d-none");
}

/* ---------- Player ---------- */
function openPlayer(videoId, title) {
  // Show YouTube player
  const youtubeWrap = document.getElementById("youtubeWrap");
  const audioWrap = document.getElementById("audioWrap");
  if (youtubeWrap) youtubeWrap.classList.remove("d-none");
  if (audioWrap) audioWrap.classList.add("d-none");

  document.getElementById("playerTitle").textContent = title || "";
  document.getElementById("playerFrame").src =
    `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1`;

  const modalEl = document.getElementById("playerModal");
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function openAudio(fileUrl, title) {
  // Show MP3 player
  const youtubeWrap = document.getElementById("youtubeWrap");
  const audioWrap = document.getElementById("audioWrap");
  if (youtubeWrap) youtubeWrap.classList.add("d-none");
  if (audioWrap) audioWrap.classList.remove("d-none");

  document.getElementById("playerTitle").textContent = title || "";

  // Stop YouTube if it was playing
  document.getElementById("playerFrame").src = "";

  const audio = document.getElementById("audioPlayer");
  audio.src = String(fileUrl || "");
  audio.load();

  const modalEl = document.getElementById("playerModal");
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function closePlayer() {
  document.getElementById("playerFrame").src = "";
  const audio = document.getElementById("audioPlayer");
  if (audio) {
    audio.pause();
    audio.src = "";
  }
}

/* ---------- View Mode ---------- */
function setViewMode(mode) {
  viewMode = mode === "table" ? "table" : "cards";
  localStorage.setItem(VIEW_MODE_KEY, viewMode);

  const cardsBtn = document.getElementById("viewCardsBtn");
  const tableBtn = document.getElementById("viewTableBtn");
  const row = document.getElementById("videosRow");
  const tableWrap = document.getElementById("videosTableWrap");

  if (cardsBtn && tableBtn) {
    cardsBtn.classList.toggle("btn-secondary", viewMode === "cards");
    cardsBtn.classList.toggle("btn-outline-secondary", viewMode !== "cards");

    tableBtn.classList.toggle("btn-secondary", viewMode === "table");
    tableBtn.classList.toggle("btn-outline-secondary", viewMode !== "table");
  }

  if (row && tableWrap) {
    row.classList.toggle("d-none", viewMode === "table");
    tableWrap.classList.toggle("d-none", viewMode !== "table");
  }
}

/* ---------- UI Render ---------- */
function renderPlaylistList(playlists, activeId) {
  const listEl = document.getElementById("playlistList");
  listEl.innerHTML = "";

  if (playlists.length === 0) {
    listEl.innerHTML = `<div class="text-muted">No playlists yet.</div>`;
    return;
  }

  playlists.forEach((pl) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `list-group-item list-group-item-action ${pl.id === activeId ? "active" : ""}`;
    btn.textContent = pl.name;
    btn.setAttribute("data-playlist-id", pl.id);
    listEl.appendChild(btn);
  });
}

function getActivePlaylist(playlists, activeId) {
  return playlists.find((p) => String(p.id) === String(activeId)) || null;
}

function normalizeVideos(pl) {
  if (!pl.videos || !Array.isArray(pl.videos)) pl.videos = [];
  pl.videos.forEach((v) => {
    if (typeof v.rating !== "number") v.rating = Number(v.rating) || 0;
    if (!v.type) v.type = "video";
  });
}

function renderMainForNone() {
  document.getElementById("activePlaylistTitle").textContent = "";
  document.getElementById("activePlaylistSub").textContent = "";
  document.getElementById("emptyMain").classList.remove("d-none");
  document.getElementById("mainControls").classList.add("d-none");
}

function renderMainHeader(pl) {
  document.getElementById("activePlaylistTitle").textContent = pl.name;
  document.getElementById("activePlaylistSub").textContent = `${pl.videos.length} videos`;
}

function buildRatingSelect(current, itemType, itemId) {
  const val = Number(current) || 0;
  const type = itemType === "mp3" ? "mp3" : "video";
  const id = String(itemId || "");
  return `
    <select class="form-select form-select-sm" data-action="rate" data-item-type="${escapeHtml(
      type
    )}" data-item-id="${escapeHtml(id)}">
      <option value="0" ${val === 0 ? "selected" : ""}>No rating</option>
      <option value="1" ${val === 1 ? "selected" : ""}>1</option>
      <option value="2" ${val === 2 ? "selected" : ""}>2</option>
      <option value="3" ${val === 3 ? "selected" : ""}>3</option>
      <option value="4" ${val === 4 ? "selected" : ""}>4</option>
      <option value="5" ${val === 5 ? "selected" : ""}>5</option>
    </select>
  `;
}

/* Cards view */
function renderVideos(videos) {
  const row = document.getElementById("videosRow");
  row.innerHTML = "";

  if (videos.length === 0) {
    row.innerHTML = `<div class="col-12 text-muted">No videos in this playlist.</div>`;
    return;
  }

  videos.forEach((v) => {
    const titleEsc = escapeHtml(v.title || "");
    const type = String(v.type || "video");
    const isMp3 = type === "mp3";

    const thumbEsc = escapeHtml(v.thumbnailUrl || "");
    const id = isMp3 ? String(v.mp3Id || "") : String(v.videoId || "");
    const idEsc = escapeHtml(id);
    const rating = Number(v.rating) || 0;
    const fileUrlEsc = escapeHtml(v.fileUrl || "");

    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4";

    col.innerHTML = `
      <div class="card h-100 shadow-sm">
        ${
          isMp3
            ? `
              <div class="p-3 border-bottom bg-white">
                <div class="small text-muted mb-2">Local MP3</div>
                <audio controls class="w-100" src="${fileUrlEsc}"></audio>
              </div>
            `
            : `
              <img
                src="${thumbEsc}"
                class="card-img-top"
                alt="thumbnail"
                style="cursor:pointer;"
                data-action="play"
                data-item-type="video"
                data-item-id="${idEsc}"
                data-title="${titleEsc}"
              />
            `
        }

        <div class="card-body d-flex flex-column">
          <h6 class="card-title mb-2">${titleEsc}</h6>

          <div class="mb-2">
            ${buildRatingSelect(rating, isMp3 ? "mp3" : "video", id)}
          </div>

          <div class="mt-auto d-grid gap-2">
            <button class="btn btn-outline-primary btn-sm" type="button"
              data-action="play"
              data-item-type="${isMp3 ? "mp3" : "video"}"
              data-item-id="${idEsc}"
              data-title="${titleEsc}"
              ${isMp3 ? `data-file-url="${fileUrlEsc}"` : ""}>
              Play
            </button>

            <button class="btn btn-outline-danger btn-sm" type="button"
              data-action="remove"
              data-item-type="${isMp3 ? "mp3" : "video"}"
              data-item-id="${idEsc}">
              Remove
            </button>
          </div>
        </div>
      </div>
    `;

    row.appendChild(col);
  });
}

/* Table view */
function renderVideosTable(videos) {
  const body = document.getElementById("videosTableBody");
  body.innerHTML = "";

  if (videos.length === 0) {
    body.innerHTML = `<tr><td colspan="4" class="text-muted">No videos in this playlist.</td></tr>`;
    return;
  }

  videos.forEach((v) => {
    const titleEsc = escapeHtml(v.title || "");
    const type = String(v.type || "video");
    const isMp3 = type === "mp3";

    const thumbEsc = escapeHtml(v.thumbnailUrl || "");
    const id = isMp3 ? String(v.mp3Id || "") : String(v.videoId || "");
    const idEsc = escapeHtml(id);
    const rating = Number(v.rating) || 0;
    const fileUrlEsc = escapeHtml(v.fileUrl || "");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        ${
          isMp3
            ? `<span class="badge bg-secondary">MP3</span>`
            : `
              <img
                src="${thumbEsc}"
                alt="thumb"
                style="width:72px; height:auto; cursor:pointer;"
                data-action="play"
                data-item-type="video"
                data-item-id="${idEsc}"
                data-title="${titleEsc}"
              />
            `
        }
      </td>
      <td style="cursor:pointer;"
        data-action="play"
        data-item-type="${isMp3 ? "mp3" : "video"}"
        data-item-id="${idEsc}"
        data-title="${titleEsc}"
        ${isMp3 ? `data-file-url="${fileUrlEsc}"` : ""}>
        ${titleEsc}
      </td>
      <td>
        ${buildRatingSelect(rating, isMp3 ? "mp3" : "video", id)}
      </td>
      <td>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-outline-primary btn-sm" type="button"
            data-action="play"
            data-item-type="${isMp3 ? "mp3" : "video"}"
            data-item-id="${idEsc}"
            data-title="${titleEsc}"
            ${isMp3 ? `data-file-url="${fileUrlEsc}"` : ""}>
            Play
          </button>
          <button class="btn btn-outline-danger btn-sm" type="button"
            data-action="remove"
            data-item-type="${isMp3 ? "mp3" : "video"}"
            data-item-id="${idEsc}">
            Remove
          </button>
        </div>
      </td>
    `;

    body.appendChild(tr);
  });
}

function applyFilterSort(pl) {
  const filterText = document.getElementById("filterInput").value.trim().toLowerCase();
  const sortMode = document.getElementById("sortSelect").value;

  let list = [...pl.videos];

  if (filterText) {
    list = list.filter((v) => String(v.title || "").toLowerCase().includes(filterText));
  }

  if (sortMode === "rating") {
    list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
  } else {
    list.sort((a, b) =>
      String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" })
    );
  }

  return list;
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    const user = await initAuthUI({
      redirectIfMissing: true,
      redirectTo: "login.html",
    });
    if (!user) return;

    let playlists = [];
    let activeId = "";

    async function loadPlaylists() {
      playlists = await apiGetPlaylists();
      playlists.forEach(normalizeVideos);

      activeId = getPlaylistIdFromUrl();
      if (!activeId && playlists.length > 0) {
        activeId = playlists[0].id;
        setPlaylistIdToUrl(activeId);
      }
    }

    function refreshUI() {
      if (playlists.length === 0) {
        clearSidebarAlert();
        renderPlaylistList(playlists, "");
        renderMainForNone();
        showSidebarAlert("Create a playlist to start.");
        return;
      }

      if (!activeId || !playlists.some((p) => String(p.id) === String(activeId))) {
        activeId = playlists[0].id;
        setPlaylistIdToUrl(activeId);
      }

      renderPlaylistList(playlists, activeId);

      const activePl = getActivePlaylist(playlists, activeId);
      if (!activePl) {
        renderMainForNone();
        return;
      }

      normalizeVideos(activePl);
      renderMainHeader(activePl);

      document.getElementById("emptyMain").classList.add("d-none");
      document.getElementById("mainControls").classList.remove("d-none");

      setViewMode(viewMode);

      const ordered = applyFilterSort(activePl);
      if (viewMode === "table") renderVideosTable(ordered);
      else renderVideos(ordered);
    }

    try {
      await loadPlaylists();
      refreshUI();
    } catch (err) {
      console.error(err);
      showSidebarAlert("Could not load playlists from server.");
      renderMainForNone();
    }

    /* View toggle */
    document.getElementById("viewCardsBtn").addEventListener("click", () => {
      setViewMode("cards");
      refreshUI();
    });

    document.getElementById("viewTableBtn").addEventListener("click", () => {
      setViewMode("table");
      refreshUI();
    });

    /* Sidebar: select playlist */
    document.getElementById("playlistList").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-playlist-id]");
      if (!btn) return;
      activeId = btn.getAttribute("data-playlist-id");
      setPlaylistIdToUrl(activeId);
      refreshUI();
    });

    /* New playlist modal open */
    document.getElementById("newPlaylistBtn").addEventListener("click", () => {
      clearNewPlaylistAlert();
      document.getElementById("playlistNameInput").value = "";
      bootstrap.Modal.getOrCreateInstance(document.getElementById("newPlaylistModal")).show();
    });

    /* Create playlist */
    document.getElementById("createPlaylistConfirmBtn").addEventListener("click", async () => {
      clearNewPlaylistAlert();
      const name = document.getElementById("playlistNameInput").value.trim();
      if (!name) {
        showNewPlaylistAlert("Please enter a playlist name.");
        return;
      }

      try {
        const created = await apiCreatePlaylist(name);
        playlists.push(created);
        playlists.forEach(normalizeVideos);

        activeId = created.id;
        setPlaylistIdToUrl(activeId);

        bootstrap.Modal.getOrCreateInstance(document.getElementById("newPlaylistModal")).hide();
        refreshUI();
      } catch (err) {
        console.error(err);
        showNewPlaylistAlert(String(err && err.message ? err.message : "Failed to create playlist."));
      }
    });

    /* Controls: filter/sort */
    document.getElementById("filterInput").addEventListener("input", refreshUI);
    document.getElementById("sortSelect").addEventListener("change", refreshUI);

    /* MP3 Upload */
    document.getElementById("uploadMp3Btn").addEventListener("click", async () => {
      clearMp3UploadAlert();

      const activePl = getActivePlaylist(playlists, activeId);
      if (!activePl) {
        showMp3UploadAlert("Please select a playlist first.", "danger");
        return;
      }

      const fileInput = document.getElementById("mp3FileInput");
      const titleInput = document.getElementById("mp3TitleInput");
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;
      const title = titleInput ? titleInput.value.trim() : "";

      if (!file) {
        showMp3UploadAlert("Please choose an MP3 file.", "danger");
        return;
      }

      const nameOk = String(file.name || "").toLowerCase().endsWith(".mp3");
      const mimeOk = file.type === "audio/mpeg" || file.type === "audio/mp3";
      if (!nameOk && !mimeOk) {
        showMp3UploadAlert("Only MP3 files are allowed.", "danger");
        return;
      }

      try {
        const item = await apiUploadMp3(activeId, file, title);
        activePl.videos.push(item);
        fileInput.value = "";
        if (titleInput) titleInput.value = "";
        showMp3UploadAlert("MP3 uploaded successfully.", "success");
        refreshUI();
      } catch (err) {
        console.error(err);
        showMp3UploadAlert(
          String(err && err.message ? err.message : "Failed to upload MP3."),
          "danger"
        );
      }
    });

    /* Main actions: cards play/remove */
    document.getElementById("videosRow").addEventListener("click", async (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;

      const action = el.getAttribute("data-action");
      const itemType = el.getAttribute("data-item-type") || "video";
      const itemId = el.getAttribute("data-item-id");

      const activePl = getActivePlaylist(playlists, activeId);
      if (!activePl) return;

      if (action === "play") {
        const title = el.getAttribute("data-title") || "";
        if (itemType === "mp3") {
          const fileUrl = el.getAttribute("data-file-url") || "";
          openAudio(fileUrl, title);
        } else {
          if (itemId) openPlayer(itemId, title);
        }
        return;
      }

      if (action === "remove") {
        try {
          if (itemType === "mp3") {
            await apiDeleteMp3(activeId, itemId);
            activePl.videos = activePl.videos.filter((v) => String(v.mp3Id) !== String(itemId));
          } else {
            await apiDeleteVideo(activeId, itemId);
            activePl.videos = activePl.videos.filter((v) => String(v.videoId) !== String(itemId));
          }
          refreshUI();
        } catch (err) {
          console.error(err);
          showSidebarAlert(String(err && err.message ? err.message : "Failed to remove item."));
        }
      }
    });

    /* Rating change: cards */
    document.getElementById("videosRow").addEventListener("change", async (e) => {
      const sel = e.target.closest('select[data-action="rate"]');
      if (!sel) return;

      const itemType = sel.getAttribute("data-item-type") || "video";
      const itemId = sel.getAttribute("data-item-id");
      if (!itemId) return;

      const newRating = Number(sel.value) || 0;

      const activePl = getActivePlaylist(playlists, activeId);
      if (!activePl) return;

      try {
        if (itemType === "mp3") {
          await apiSetMp3Rating(activeId, itemId, newRating);
          const v = activePl.videos.find((x) => String(x.mp3Id) === String(itemId));
          if (v) v.rating = newRating;
        } else {
          await apiSetRating(activeId, itemId, newRating);
          const v = activePl.videos.find((x) => String(x.videoId) === String(itemId));
          if (v) v.rating = newRating;
        }

        refreshUI();
      } catch (err) {
        console.error(err);
        showSidebarAlert(String(err && err.message ? err.message : "Failed to update rating."));
      }
    });

    /* Main actions: table play/remove */
    document.getElementById("videosTableBody").addEventListener("click", async (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;

      const action = el.getAttribute("data-action");
      const itemType = el.getAttribute("data-item-type") || "video";
      const itemId = el.getAttribute("data-item-id");

      const activePl = getActivePlaylist(playlists, activeId);
      if (!activePl) return;

      if (action === "play") {
        const title = el.getAttribute("data-title") || "";
        if (itemType === "mp3") {
          const fileUrl = el.getAttribute("data-file-url") || "";
          openAudio(fileUrl, title);
        } else {
          if (itemId) openPlayer(itemId, title);
        }
        return;
      }

      if (action === "remove") {
        try {
          if (itemType === "mp3") {
            await apiDeleteMp3(activeId, itemId);
            activePl.videos = activePl.videos.filter((v) => String(v.mp3Id) !== String(itemId));
          } else {
            await apiDeleteVideo(activeId, itemId);
            activePl.videos = activePl.videos.filter((v) => String(v.videoId) !== String(itemId));
          }
          refreshUI();
        } catch (err) {
          console.error(err);
          showSidebarAlert(String(err && err.message ? err.message : "Failed to remove item."));
        }
      }
    });

    /* Rating change: table */
    document.getElementById("videosTableBody").addEventListener("change", async (e) => {
      const sel = e.target.closest('select[data-action="rate"]');
      if (!sel) return;

      const itemType = sel.getAttribute("data-item-type") || "video";
      const itemId = sel.getAttribute("data-item-id");
      if (!itemId) return;

      const newRating = Number(sel.value) || 0;

      const activePl = getActivePlaylist(playlists, activeId);
      if (!activePl) return;

      try {
        if (itemType === "mp3") {
          await apiSetMp3Rating(activeId, itemId, newRating);
          const v = activePl.videos.find((x) => String(x.mp3Id) === String(itemId));
          if (v) v.rating = newRating;
        } else {
          await apiSetRating(activeId, itemId, newRating);
          const v = activePl.videos.find((x) => String(x.videoId) === String(itemId));
          if (v) v.rating = newRating;
        }
        refreshUI();
      } catch (err) {
        console.error(err);
        showSidebarAlert(String(err && err.message ? err.message : "Failed to update rating."));
      }
    });

    /* Delete playlist */
    document.getElementById("deletePlaylistBtn").addEventListener("click", async () => {
      if (!activeId) return;

      const ok = window.confirm("Delete this playlist?");
      if (!ok) return;

      try {
        await apiDeletePlaylist(activeId);
        playlists = playlists.filter((p) => String(p.id) !== String(activeId));

        activeId = playlists.length > 0 ? playlists[0].id : "";
        setPlaylistIdToUrl(activeId);
        refreshUI();
      } catch (err) {
        console.error(err);
        showSidebarAlert(String(err && err.message ? err.message : "Failed to delete playlist."));
      }
    });

    /* Play playlist (FIRST item in CURRENT order: filter + sort) */
    document.getElementById("playPlaylistBtn").addEventListener("click", () => {
      const pl = getActivePlaylist(playlists, activeId);
      if (!pl) return;
      normalizeVideos(pl);

      const ordered = applyFilterSort(pl);

      if (ordered.length === 0) {
        showSidebarAlert("No videos match the current filter.");
        return;
      }

      clearSidebarAlert();
      const first = ordered[0];

      if (String(first.type || "video") === "mp3") {
        openAudio(first.fileUrl, first.title);
      } else {
        openPlayer(first.videoId, first.title);
      }
    });

    /* Player modal cleanup */
    document.getElementById("playerModal").addEventListener("hidden.bs.modal", closePlayer);
  })();
});
