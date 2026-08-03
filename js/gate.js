// Einfaches Passcode-Gate (client-seitig, siehe README für die Grenzen davon).

(function () {
  const STORAGE_KEY = "mtsv_passcode_ok";

  function isUnlocked() {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  }

  function unlock() {
    sessionStorage.setItem(STORAGE_KEY, "1");
  }

  function buildOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "gateOverlay";
    overlay.innerHTML = `
      <div class="card">
        <img src="assets/mtsv-logo.png" alt="MTSV Hohenwestedt" />
        <h2>Zugang</h2>
        <div class="field">
          <input type="password" id="gatePasscode" placeholder="Passcode" autocomplete="off" />
        </div>
        <button id="gateSubmit">Weiter</button>
        <div id="gateError"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector("#gatePasscode");
    const error = overlay.querySelector("#gateError");

    function tryUnlock() {
      if (input.value === window.APP_CONFIG.passcode) {
        unlock();
        document.body.classList.remove("gate-locked");
        overlay.remove();
      } else {
        error.textContent = "Falscher Passcode.";
      }
    }

    overlay.querySelector("#gateSubmit").addEventListener("click", tryUnlock);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryUnlock();
    });
    setTimeout(() => input.focus(), 50);
  }

  document.body.classList.add("gate-locked");
  if (isUnlocked()) {
    document.body.classList.remove("gate-locked");
  } else {
    document.addEventListener("DOMContentLoaded", buildOverlay);
  }
})();
