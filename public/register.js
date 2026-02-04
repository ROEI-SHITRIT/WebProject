"use strict";

/* ---------- Validation Helpers ---------- */

function isValidPassword(pw) {
  // Min 6 chars, at least 1 letter, 1 digit, 1 special (non-alphanumeric)
  if (typeof pw !== "string") return false;
  if (pw.length < 6) return false;

  const hasLetter = /[A-Za-z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);

  return hasLetter && hasDigit && hasSpecial;
}

function isNonEmpty(value) {
  return String(value || "").trim().length > 0;
}

function isValidHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/* ---------- UI Helpers ---------- */

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

/* ---------- Main ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");

  const usernameEl = document.getElementById("username");
  const firstNameEl = document.getElementById("firstName");
  const imageUrlEl = document.getElementById("imageUrl");
  const passwordEl = document.getElementById("password");
  const confirmEl = document.getElementById("confirmPassword");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const username = usernameEl.value.trim();
    const firstName = firstNameEl.value.trim();
    const imageUrl = imageUrlEl.value.trim();
    const password = passwordEl.value;
    const confirmPassword = confirmEl.value;

    // Required fields
    setInvalid(usernameEl, !isNonEmpty(username));
    setInvalid(firstNameEl, !isNonEmpty(firstName));
    setInvalid(imageUrlEl, !isNonEmpty(imageUrl));
    setInvalid(passwordEl, !isNonEmpty(password));
    setInvalid(confirmEl, !isNonEmpty(confirmPassword));

    if (
      !isNonEmpty(username) ||
      !isNonEmpty(firstName) ||
      !isNonEmpty(imageUrl) ||
      !isNonEmpty(password) ||
      !isNonEmpty(confirmPassword)
    ) {
      showAlert("Please fill in all required fields.");
      return;
    }

    // Image URL
    if (!isValidHttpUrl(imageUrl)) {
      setInvalid(imageUrlEl, true);
      showAlert("Image URL must be a valid http/https URL.");
      return;
    } else {
      setInvalid(imageUrlEl, false);
    }

    // Password rules
    if (!isValidPassword(password)) {
      setInvalid(passwordEl, true);
      showAlert(
        "Password must be at least 6 characters and include a letter, a number, and a special character."
      );
      return;
    } else {
      setInvalid(passwordEl, false);
    }

    // Confirm password
    if (password !== confirmPassword) {
      setInvalid(confirmEl, true);
      showAlert("Passwords do not match.");
      return;
    } else {
      setInvalid(confirmEl, false);
    }

    // ---------- API CALL ----------
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          firstName,
          imageUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "username_exists") {
          setInvalid(usernameEl, true);
          showAlert("Username already exists. Please choose a different username.");
          return;
        }

        showAlert("Registration failed. Please try again.");
        return;
      }

      // Success -> redirect to login
      window.location.href = "login.html";
    } catch (err) {
      console.error(err);
      showAlert("Server error. Please try again later.");
    }
  });

  // Clear validation state on typing
  [usernameEl, firstNameEl, imageUrlEl, passwordEl, confirmEl].forEach((el) => {
    el.addEventListener("input", () => {
      el.classList.remove("is-invalid");
      hideAlert();
    });
  });
});
