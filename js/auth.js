/* ==========================================================
   billDsmart – Demo-Login
   ACHTUNG: Reiner Prototyp. Zugangsdaten stehen hier im Klartext
   und sind für alle sichtbar. Für ein echtes Produkt braucht es
   einen Server mit sicherer Anmeldung.
   ========================================================== */

const BDS_USERS = {
  "private.client@gmail.com": { password: "12345678", role: "client" },
  "constructor@gmail.com": { password: "87654321", role: "contractor" },
};

const Auth = (() => {
  const KEY = "billDsmart-session";
  let memory = null; // Fallback, falls der Browser keinen Speicher erlaubt

  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return memory; }
  };
  const write = (value) => {
    memory = value;
    try {
      if (value) localStorage.setItem(KEY, JSON.stringify(value));
      else localStorage.removeItem(KEY);
    } catch (e) { /* Speicher nicht verfügbar */ }
  };

  return {
    login(email, password) {
      const key = String(email || "").trim().toLowerCase();
      const user = BDS_USERS[key];
      if (!user || user.password !== password) return null;
      const session = { email: key, role: user.role, since: Date.now() };
      write(session);
      return session;
    },
    session: read,
    logout() { write(null); },
    users: BDS_USERS,
  };
})();
