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
  // verwendet.
  //
  // Rechte-Hierarchie: der normale "passcode" schaltet NUR die Trainer-Seite
  // frei. Der "adminPasscode" ist ein Master-Code, der sowohl Trainer- als
  // auch Generator-Seite freischaltet (dafür je einen eigenen
  // sessionStorage-Eintrag, damit ein Trainer-Passcode allein NICHT auch den
  // Generator freischaltet).
  const mode = window.GATE_MODE === "admin" ? "admin" : "trainer";
  const STORAGE_KEY_TRAINER = "mtsv_passcode_ok_trainer";
  const STORAGE_KEY_ADMIN = "mtsv_passcode_ok_admin";
  const storageKey = mode === "admin" ? STORAGE_KEY_ADMIN : STORAGE_KEY_TRAINER;
  const title = mode === "admin" ? "Generator-Zugang" : "Zugang";
  const placeholder = "Passcode";

  function isUnlocked() {
    return sessionStorage.getItem(storageKey) === "1";
  }

  function checkPasscode(value) {
    if (value === window.APP_CONFIG.adminPasscode) {
      // Admin-Code gilt überall: Trainer- und Generator-Seite freischalten.
      sessionStorage.setItem(STORAGE_KEY_ADMIN, "1");
      sessionStorage.setItem(STORAGE_KEY_TRAINER, "1");
      return true;
    }
    if (mode === "trainer" && value === window.APP_CONFIG.passcode) {
      sessionStorage.setItem(STORAGE_KEY_TRAINER, "1");
      return true;
    }
    return false;
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
      if (checkPasscode(input.value)) {
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
