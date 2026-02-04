"use strict";

/**
 * Part B auth:
 * - current user comes from server session (cookie)
 * - GET /api/me
 * - POST /api/logout
 */

// Returns { user } where user is null or { username, firstName, imageUrl }
async function fetchMe() {
  const res = await fetch("/api/me", { method: "GET" });
  if (!res.ok) return { user: null };
  return res.json();
}

async function apiLogout() {
  try {
    await fetch("/api/logout", { method: "POST" });
  } catch {
    // ignore
  }
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
}

// initAuthUI keeps same API as your Part A so you won't change other files a lot
async function initAuthUI({
  redirectIfMissing = false,
  redirectTo = "login.html",
} = {}) {
  const { user } = await fetchMe();

  if (!user && redirectIfMissing) {
    window.location.href = redirectTo;
    return null;
  }

  if (user) setNavUser(user);

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await apiLogout();
      window.location.href = "login.html";
    });
  }

  return user;
}

// Backwards-compatible helper if you used it elsewhere
async function getCurrentUser() {
  const { user } = await fetchMe();
  return user;
}
