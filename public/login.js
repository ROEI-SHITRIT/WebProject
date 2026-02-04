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

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const usernameEl = document.getElementById("username");
  const passwordEl = document.getElementById("password");

  form.addEventListener("submit", async (e) => {
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

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInvalid(usernameEl, true);
        setInvalid(passwordEl, true);

        if (data.error === "invalid_credentials") {
          showAlert("Invalid username or password.");
        } else {
          showAlert("Login failed. Please try again.");
        }
        return;
      }

      // Success: session cookie is now set by the server
      window.location.href = "search.html";
    } catch (err) {
      console.error(err);
      showAlert("Server error. Please try again later.");
    }
  });

  [usernameEl, passwordEl].forEach((el) => {
    el.addEventListener("input", () => {
      el.classList.remove("is-invalid");
      hideAlert();
    });
  });
});
