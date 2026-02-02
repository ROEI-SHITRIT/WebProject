"use strict";

function showAlert(msg) {
  const el = document.getElementById("formAlert");
  el.textContent = msg;
  el.classList.remove("d-none");
}

function hideAlert() {
  const el = document.getElementById("formAlert");
  el.textContent = "";
  el.classList.add("d-none");
}

function setInvalid(inputEl, isInvalid) {
  if (isInvalid) inputEl.classList.add("is-invalid");
  else inputEl.classList.remove("is-invalid");
}

function isNonEmpty(value) {
  return String(value || "").trim().length > 0;
}

function normalizeUsername(u) {
  return String(u || "").trim().toLowerCase();
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const usernameEl = document.getElementById("username");
  const passwordEl = document.getElementById("password");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    hideAlert();

    const username = usernameEl.value.trim();
    const password = passwordEl.value;

    setInvalid(usernameEl, !isNonEmpty(username));
    setInvalid(passwordEl, !isNonEmpty(password));

    if (!isNonEmpty(username) || !isNonEmpty(password)) {
      showAlert("Please fill in all required fields.");
      return;
    }

    const users = getStoredUsers();
    const u = normalizeUsername(username);

    const user = users.find(
      (x) =>
        normalizeUsername(x.username) === u &&
        String(x.password) === String(password)
    );

    if (!user) {
      setInvalid(usernameEl, true);
      setInvalid(passwordEl, true);
      showAlert("Invalid username or password.");
      return;
    }

    setCurrentUser({
      username: user.username,
      firstName: user.firstName,
      imageUrl: user.imageUrl,
    });
    window.location.href = "search.html";
  });

  [usernameEl, passwordEl].forEach((el) => {
    el.addEventListener("input", () => {
      el.classList.remove("is-invalid");
      hideAlert();
    });
  });
});
