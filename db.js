/* ============================================
   GUARDIAN SA — localStorage "database" layer
   ------------------------------------------------
   This project is front-end only. There is no real
   server or database — user accounts and app data
   are stored in the browser's localStorage as JSON.
   Passwords are hashed (SHA-256 via the Web Crypto
   API) before storage, but this is a HACKATHON
   SIMULATION of backend security, not a production
   auth system. A real product would verify hashes
   server-side and use per-user salts.
   ============================================ */

const DB_KEYS = {
  USERS: 'guardiansa_users',
  SESSION: 'guardiansa_session',
  CONTACTS: 'guardiansa_contacts_', // + email
  HISTORY: 'guardiansa_history_',   // + email
};

/* ---------- low-level helpers ---------- */

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error('DB read failed for', key, err);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error('DB write failed for', key, err);
    return false;
  }
}

/* ---------- password hashing (SHA-256) ---------- */

async function hashPassword(plainText) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- users ---------- */

function getUsers() {
  return readJSON(DB_KEYS.USERS, []);
}

function saveUsers(users) {
  return writeJSON(DB_KEYS.USERS, users);
}

function findUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  return getUsers().find(u => u.email === normalized) || null;
}

async function createUser({ name, phone, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  if (findUserByEmail(normalizedEmail)) {
    throw new Error('EMAIL_TAKEN');
  }
  const passwordHash = await hashPassword(password);
  const user = {
    name: name.trim(),
    phone: phone.trim(),
    email: normalizedEmail,
    passwordHash,
    plan: 'Free',
    createdAt: new Date().toISOString(),
    settings: { gpsSharing: true, autoRecord: true, notifications: true },
  };
  const users = getUsers();
  users.push(user);
  saveUsers(users);
  seedHistoryForUser(normalizedEmail);
  return user;
}

async function verifyLogin(email, password) {
  const user = findUserByEmail(email);
  if (!user) throw new Error('NO_ACCOUNT');
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) throw new Error('WRONG_PASSWORD');
  return user;
}

function updateUser(email, updates) {
  const users = getUsers();
  const idx = users.findIndex(u => u.email === email.trim().toLowerCase());
  if (idx === -1) throw new Error('NO_ACCOUNT');
  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
  return users[idx];
}

/* ---------- session ---------- */

function setSession(email) {
  writeJSON(DB_KEYS.SESSION, { email: email.trim().toLowerCase(), at: Date.now() });
}

function getSession() {
  return readJSON(DB_KEYS.SESSION, null);
}

function clearSession() {
  localStorage.removeItem(DB_KEYS.SESSION);
}

function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  return findUserByEmail(session.email);
}

/** Redirect to login if no active session. Call at top of protected pages. */
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

/* ---------- trusted contacts ---------- */

function getContacts(email) {
  return readJSON(DB_KEYS.CONTACTS + email, []);
}

function saveContacts(email, contacts) {
  return writeJSON(DB_KEYS.CONTACTS + email, contacts);
}

function addContact(email, contact) {
  const contacts = getContacts(email);
  contacts.push({ id: crypto.randomUUID(), name: contact.name.trim(), phone: contact.phone.trim() });
  saveContacts(email, contacts);
  return contacts;
}

function removeContact(email, id) {
  const contacts = getContacts(email).filter(c => c.id !== id);
  saveContacts(email, contacts);
  return contacts;
}

/* ---------- incident history ---------- */

function getHistory(email) {
  return readJSON(DB_KEYS.HISTORY + email, []);
}

function saveHistory(email, history) {
  return writeJSON(DB_KEYS.HISTORY + email, history);
}

function addHistoryEntry(email, entry) {
  const history = getHistory(email);
  history.unshift(entry);
  saveHistory(email, history);
  return history;
}

function seedHistoryForUser(email) {
  // Pre-seeded demo incidents so History/Dashboard don't look empty on first login.
  const demo = [
    {
      id: crypto.randomUUID(),
      type: 'Drill',
      status: 'Resolved',
      location: 'Witbank CBD, Emalahleni',
      date: daysAgoISO(14),
      summary: 'Practice SOS trigger completed successfully. Response centre reached in 8s (simulated).',
    },
    {
      id: crypto.randomUUID(),
      type: 'False Alarm',
      status: 'Closed',
      location: 'N4 Highway, near Middelburg',
      date: daysAgoISO(41),
      summary: 'Power button triggered accidentally. Cancelled by user before dispatch.',
    },
  ];
  saveHistory(email, demo);
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/* ---------- plans ---------- */

const PLAN_DETAILS = {
  Free: {
    price: 'R0/mo',
    tagline: 'Core protection, always on.',
    features: ['Core SOS trigger', 'Live GPS location sharing', '1 trusted contact'],
  },
  Premium: {
    price: 'R79/mo',
    tagline: 'Full protection for one.',
    features: ['Unlimited trusted contacts', 'AI-powered threat detection', 'Cloud evidence storage', 'Live monitoring'],
  },
  Family: {
    price: 'R175/mo',
    tagline: 'Premium protection, shared.',
    features: ['Everything in Premium', 'Shared across your household', 'Family location overview'],
  },
};
