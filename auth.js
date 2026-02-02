"use strict";

const STORAGE_KEY_CURRENT_USER = "currentUser";
const STORAGE_KEY_USERS = "users";
const STORAGE_KEY_PLAYLISTS = "playlistsStore";

function getPlaylistsStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLAYLISTS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function savePlaylistsStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY_PLAYLISTS, JSON.stringify(store));
  } catch (_) {}
}

function getStoredUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (_) {}
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.username === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  } catch (_) {}
}

function setNavUser(user) {
  const nameEl = document.getElementById("navUserName");
  const imgEl = document.getElementById("navUserImg");
  const welcomeEl = document.getElementById("welcome");

  const displayName = user?.username || user?.firstName || "";

  if (nameEl) nameEl.textContent = displayName;

  if (imgEl) {
    if (user?.imageUrl) {
      imgEl.src = user.imageUrl;
      imgEl.classList.remove("d-none");
    } else {
      imgEl.src = "";
      imgEl.classList.add("d-none");
    }
  }

  if (welcomeEl) {
    welcomeEl.textContent = displayName ? `Welcome, ${displayName}!` : "";
  }

  const welcomeTextEl = document.getElementById("welcomeText");
  const welcomeImgEl = document.getElementById("welcomeImg");
  if (welcomeTextEl) welcomeTextEl.textContent = displayName ? `Welcome, ${displayName}!` : "";
  if (welcomeImgEl) {
    if (user?.imageUrl) {
      welcomeImgEl.src = user.imageUrl;
      welcomeImgEl.classList.remove("d-none");
    } else {
      welcomeImgEl.src = "";
      welcomeImgEl.classList.add("d-none");
    }
  }
}

async function initAuthUI({
  redirectIfMissing = false,
  redirectTo = "login.html",
} = {}) {
  const user = getCurrentUser();

  if (!user && redirectIfMissing) {
    window.location.href = redirectTo;
    return null;
  }

  if (user) setNavUser(user);

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      setCurrentUser(null);
      window.location.href = "login.html";
    });
  }

  return user;
}
