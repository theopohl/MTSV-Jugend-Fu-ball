// Einfaches Passcode-Gate (client-seitig, siehe README für die Grenzen davon).
//
// WICHTIG: Das hier ist nur eine leichte, optische Trennung zwischen
// "Trainer" (normaler passcode) und "Generator/Admin" (adminPasscode) im
// Browser. Es ist KEIN echter Zugriffsschutz: Der Supabase anon/publishable
// Key steht offen in config.js / im Quellcode. Wer diesen Key kennt, kommt
// über die Supabase-REST-API weiterhin an alle Daten, unabhängig vom
// Passcode. Für eine echte Trennung der Rechte bräuchte es Supabase-Auth
// (echte Logins) statt eines gemeinsamen Passcodes. Siehe README, Abschnitt
// "Grenzen des Passcode-Schutzes".

(function () {
  // Jede Seite setzt window.GATE_MODE ("trainer" oder "admin") vor dem
  // Einbinden dieses Skripts. Ohne Angabe wird der normale Trainer-Passcode
  // verwendet. Jeder Modus hat einen eigenen sessionStorage-Eintrag, damit
  // ein Freischalten der Trainer-Seite NICHT automatisch den Generator
  // freischaltet (und umgekehrt).
  const mode = window.GATE_MODE === "admin" ? "admin" : "trainer";
  const STORAGE_KEY = "mtsv_passcode_ok_" + mode;
  const expectedPasscode =
    mode === "admin" ? window.APP_CONFIG.adminPasscode : window.APP_CONFIG.passcode;
  const title = mode === "admin" ? "Generator-Zugang" : "Trainer-Zugang";
  const placeholder = mode === "admin" ? "Admin-Passcode" : "Trainer-Passcode";

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
        <h2>${title}</h2>
        <div class="field">
          <input type="password" id="gatePasscode" placeholder="${placeholder}" autocomplete="off" />
        </div>
        <button id="gateSubmit">Weiter</button>
        <div id="gateError"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector("#gatePasscode");
    const error = overlay.querySelector("#gateError");

    function tryUnlock() {
      if (input.value === expectedPasscode) {
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
