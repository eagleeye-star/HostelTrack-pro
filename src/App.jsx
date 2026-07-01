import { useState, useEffect, useMemo } from "react";

const STORAGE_KEY = "hostelManagerPro_v1";
const LICENSE_KEY = "hostelManagerPro_v1_license";
const SETTINGS_KEY = "hostelManagerPro_v1_settings";
const TRIAL_DAYS = 14;
const VALID_KEYS = ["HOSTEL-DEMO-TRIAL-0001", "HOSTEL-AIFARMS-VIP-002"];

// ── PALETTE ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#15161b", card: "#1c1e26", surface: "#242631", border: "#33364296",
  border2: "#3a3d4a", text: "#ece9e2", muted: "#9a96a8", soft: "#c7c3d4",
  copper: "#c4763f", copperL: "#e0935f", gold: "#d4a23a",
  green: "#3fa66b", red: "#e0594f", blue: "#5b8dd6", purple: "#9b7ad6",
};
const ROLE_COLORS = { Owner: C.gold, Manager: C.copper, Receptionist: C.blue, Cashier: C.green };

// ── UTILS ────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const nowStr = () => new Date().toLocaleString();
const fmt = (n) => `GH₵ ${Number(n || 0).toFixed(2)}`;
const daysBetween = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
const addDays = (dateStr, n) => { const d = new Date(dateStr); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

// ── LICENSE HELPERS ────────────────────────────────────────────────────────
function daysLeft(expiry) { if (!expiry) return 0; return Math.max(0, Math.ceil((new Date(expiry) - new Date()) / 86400000)); }
function isExpired(expiry) { if (!expiry) return true; return new Date(expiry) < new Date(); }
function loadLicense() { try { const r = localStorage.getItem(LICENSE_KEY); if (r) return JSON.parse(r); } catch (_) {} return null; }
function saveLicense(lic) { try { localStorage.setItem(LICENSE_KEY, JSON.stringify(lic)); } catch (_) {} }

// ── SETTINGS (app name) ───────────────────────────────────────────────────
function loadSettings() {
  try { const r = localStorage.getItem(SETTINGS_KEY); if (r) return JSON.parse(r); } catch (_) {}
  return { appName: "HostelTrack Pro", tagline: "Multi-Property Hostel Management" };
}
function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (_) {} }

// ── SEED DATA ────────────────────────────────────────────────────────────────
const seedProperties = [
  { id: "PR001", name: "Lakeview Hostel", location: "East Legon, Accra", phone: "020-111-2233", icon: "🏨" },
  { id: "PR002", name: "Campus Stay Hostel", location: "Legon, Accra", phone: "020-444-5566", icon: "🏠" },
];

const seedRooms = [
  { id: "RM001", propertyId: "PR001", roomNo: "101", type: "Dorm",    beds: 6, ratePerNight: 60,  ratePerSemester: 3200 },
  { id: "RM002", propertyId: "PR001", roomNo: "102", type: "Private", beds: 1, ratePerNight: 180, ratePerSemester: 9500 },
  { id: "RM003", propertyId: "PR001", roomNo: "103", type: "Dorm",    beds: 4, ratePerNight: 65,  ratePerSemester: 3500 },
  { id: "RM004", propertyId: "PR002", roomNo: "A1",  type: "Dorm",    beds: 8, ratePerNight: 45,  ratePerSemester: 2400 },
  { id: "RM005", propertyId: "PR002", roomNo: "A2",  type: "Private", beds: 2, ratePerNight: 140, ratePerSemester: 7200 },
];

function genBeds(rooms) {
  const beds = [];
  rooms.forEach(r => {
    for (let i = 1; i <= r.beds; i++) {
      beds.push({ id: `${r.id}-B${i}`, roomId: r.id, propertyId: r.propertyId, bedLabel: r.beds === 1 ? "Room" : `Bed ${i}`, status: "available" });
    }
  });
  return beds;
}

const seedGuests = [
  { id: "G001", name: "Kwame Owusu", phone: "024-000-1111", idType: "Ghana Card", idNumber: "GHA-000111222-3", nationality: "Ghanaian", photo: "" },
  { id: "G002", name: "Sarah Mensah", phone: "020-222-3333", idType: "Passport", idNumber: "G1234567", nationality: "Ghanaian", photo: "" },
  { id: "G003", name: "James Okoro", phone: "+234-803-444-5555", idType: "Passport", idNumber: "A09876543", nationality: "Nigerian", photo: "" },
];

const seedStaff = [
  { id: "ST001", name: "Akosua Boateng", role: "Owner", pin: "1111", propertyId: null, status: "Active" },
  { id: "ST002", name: "Yaw Asante", role: "Manager", pin: "2222", propertyId: "PR001", status: "Active" },
  { id: "ST003", name: "Efua Darko", role: "Receptionist", pin: "3333", propertyId: "PR001", status: "Active" },
  { id: "ST004", name: "Kofi Adjei", role: "Cashier", pin: "4444", propertyId: "PR002", status: "Active" },
];

function seedBookings(rooms, guests) {
  const r1 = rooms[0], g1 = guests[0];
  return [
    { id: "BK001", propertyId: r1.propertyId, roomId: r1.id, bedId: `${r1.id}-B1`, guestId: g1.id, checkIn: today(), checkOut: addDays(today(), 3), ratePerNight: r1.ratePerNight, status: "checked-in", createdBy: "ST003", createdAt: nowStr() },
  ];
}

const ROLE_ACCESS = {
  Owner: ["dashboard", "properties", "rooms", "bookings", "guests", "billing", "expenses", "staff", "reports", "backup"],
  Manager: ["dashboard", "rooms", "bookings", "guests", "billing", "expenses", "reports", "backup"],
  Receptionist: ["dashboard", "rooms", "bookings", "guests"],
  Cashier: ["dashboard", "billing", "expenses"],
};

const MODULES = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "properties", label: "Properties", icon: "🏘️" },
  { id: "rooms", label: "Rooms & Beds", icon: "🛏️" },
  { id: "bookings", label: "Bookings", icon: "📋" },
  { id: "guests", label: "Guests", icon: "🧳" },
  { id: "billing", label: "Billing", icon: "💳" },
  { id: "expenses", label: "Expenses", icon: "🧾" },
  { id: "staff", label: "Staff", icon: "👥" },
  { id: "reports", label: "Reports", icon: "📈" },
  { id: "backup", label: "Backup & Restore", icon: "💾" },
];

function loadData() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch (_) {}
  const rooms = seedRooms;
  const beds = genBeds(rooms);
  const bookings = seedBookings(rooms, seedGuests);
  // mark seeded booking's bed occupied
  beds.forEach(b => { if (b.id === bookings[0].bedId) b.status = "occupied"; });
  return {
    properties: seedProperties, rooms, beds, guests: seedGuests, staff: seedStaff,
    bookings, payments: [], expenses: [
      { id: "EX001", propertyId: "PR001", category: "Utilities", description: "Electricity bill - June", amount: 420, date: today(), addedBy: "ST002" },
      { id: "EX002", propertyId: "PR002", category: "Supplies", description: "Cleaning supplies", amount: 95, date: today(), addedBy: "ST004" },
    ],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// LICENSE SCREEN
// ════════════════════════════════════════════════════════════════════════════
function LicenseScreen({ onActivate, appName }) {
  const [mode, setMode] = useState("trial");
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");

  const startTrial = () => {
    const expiry = new Date(); expiry.setDate(expiry.getDate() + TRIAL_DAYS);
    const lic = { type: "trial", key: null, expiry: expiry.toISOString(), issued: new Date().toISOString() };
    saveLicense(lic); onActivate(lic);
  };

  const activateKey = () => {
    const k = key.toUpperCase().trim();
    if (!k) { setErr("Enter a license key."); return; }
    const validFormat = /^HOSTEL-[A-Z0-9]{2,8}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(k) || VALID_KEYS.includes(k);
    if (!validFormat) { setErr("Invalid license key. Format: HOSTEL-XXXX-XXXX-XXXX"); return; }
    const planSeg = k.split("-")[1] || "";
    let days = 365;
    if (planSeg === "TRIAL") days = TRIAL_DAYS;
    else if (planSeg === "1M") days = 30;
    else if (planSeg === "6M") days = 182;
    else if (planSeg === "12M") days = 365;
    else if (/^\d+Y$/.test(planSeg)) days = Math.round(parseInt(planSeg) * 365);
    const expiry = new Date(); expiry.setDate(expiry.getDate() + days);
    const lic = { type: "licensed", key: k, expiry: expiry.toISOString(), issued: new Date().toISOString() };
    saveLicense(lic); onActivate(lic);
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.bg} 0%, #261c14 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 16, padding: "32px 30px", width: "min(94vw,420px)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔑</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.copperL, fontFamily: "Georgia, serif" }}>{appName}</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>Multi-Property Hostel Management</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button onClick={() => { setMode("trial"); setErr(""); }} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `2px solid ${C.border2}`, background: mode === "trial" ? C.copper : "transparent", color: mode === "trial" ? "#fff" : C.muted, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Free Trial</button>
          <button onClick={() => { setMode("activate"); setErr(""); }} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `2px solid ${C.border2}`, background: mode === "activate" ? C.copper : "transparent", color: mode === "activate" ? "#fff" : C.muted, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Activate License</button>
        </div>

        {mode === "trial" && (
          <div>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 14px" }}>
              Start a <strong>{TRIAL_DAYS}-day free trial</strong>. Manage every property, room, booking, guest, and ledger entry with no restrictions. No card required.
            </p>
            <div style={{ background: "#3a2a14", border: `1px solid ${C.gold}`, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: "#f0d9a8" }}>
              Trial includes full access. Purchase a license before expiry to keep your records.
            </div>
            <button onClick={startTrial} style={{ width: "100%", padding: "13px 0", background: `linear-gradient(135deg, ${C.copper}, ${C.copperL})`, color: "#fff", border: "none", borderRadius: 9, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              Start Free Trial
            </button>
          </div>
        )}

        {mode === "activate" && (
          <div>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 10px" }}>Enter your license key to activate.</p>
            <input value={key} onChange={e => { setKey(e.target.value.toUpperCase()); setErr(""); }} onKeyDown={e => e.key === "Enter" && activateKey()}
              placeholder="HOSTEL-XXXX-XXXX-XXXX"
              style={{ width: "100%", padding: 11, border: `2px solid ${C.border2}`, borderRadius: 8, fontSize: 14, textAlign: "center", boxSizing: "border-box", letterSpacing: 2, marginBottom: 8, fontFamily: "monospace", background: C.surface, color: C.text, outline: "none" }} />
            {err && <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{err}</div>}
            <button onClick={activateKey} style={{ width: "100%", padding: "13px 0", background: `linear-gradient(135deg, ${C.copper}, ${C.copperL})`, color: "#fff", border: "none", borderRadius: 9, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              Activate
            </button>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 12, textAlign: "center" }}>
              To purchase a license, contact: gilbert@aifarms.gh
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LicenseExpiredScreen({ license, onRenew, appName }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#7f1d1d 0%,#991b1b 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 16, padding: "32px 30px", width: "min(94vw,420px)", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>⏰</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#f87171", marginBottom: 6 }}>
          {license.type === "trial" ? "Trial Expired" : "License Expired"}
        </div>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>
          Your {license.type === "trial" ? "free trial" : "license"} ended on {new Date(license.expiry).toLocaleDateString()}.
          Activate a new license key to keep using {appName}.
        </p>
        <button onClick={onRenew} style={{ width: "100%", padding: "13px 0", background: "#991b1b", color: "#fff", border: "none", borderRadius: 9, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
          Activate License
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STAFF LOGIN
// ════════════════════════════════════════════════════════════════════════════
function StaffLogin({ staff, properties, onLogin, appName }) {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  const handleLogin = () => {
    if (!selected) return;
    if (selected.pin !== pin) { setErr("Wrong PIN."); setPin(""); return; }
    onLogin(selected);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter','Segoe UI',sans-serif", padding: 16 }}>
      <div style={{ width: "min(94vw,480px)", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 6 }}>🔑</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: C.copperL, fontFamily: "Georgia, serif", marginBottom: 4 }}>{appName}</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 28 }}>Select your name and enter your PIN</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10, marginBottom: 24 }}>
          {staff.filter(s => s.status === "Active").map(s => {
            const propName = s.propertyId ? properties.find(p => p.id === s.propertyId)?.name : "All Properties";
            return (
              <button key={s.id} onClick={() => { setSelected(s); setPin(""); setErr(""); }}
                style={{
                  background: selected?.id === s.id ? ROLE_COLORS[s.role] + "33" : C.card,
                  border: `2px solid ${selected?.id === s.id ? ROLE_COLORS[s.role] : C.border2}`,
                  borderRadius: 12, padding: "14px 10px", cursor: "pointer",
                }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{s.role === "Owner" ? "👑" : s.role === "Manager" ? "🧑‍💼" : s.role === "Cashier" ? "💰" : "🛎️"}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{s.name}</div>
                <div style={{ fontSize: 11, color: ROLE_COLORS[s.role], fontWeight: 600 }}>{s.role}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{propName}</div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div style={{ background: C.card, borderRadius: 16, padding: 24, border: `1px solid ${C.border2}` }}>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>Welcome, <b style={{ color: C.text }}>{selected.name}</b>. Enter your PIN:</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 14 }}>
              {[0, 1, 2, 3].map(i => <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: pin.length > i ? ROLE_COLORS[selected.role] : C.border2 }} />)}
            </div>
            <input autoFocus type="password" maxLength={6} value={pin}
              onChange={e => { setPin(e.target.value); setErr(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{ width: "100%", padding: "12px 0", textAlign: "center", fontSize: 26, letterSpacing: 12, marginBottom: 8, background: C.surface, border: `2px solid ${err ? C.red : C.border2}`, borderRadius: 12, color: C.text, boxSizing: "border-box", outline: "none" }}
              placeholder="••••" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, margin: "12px 0" }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) => (
                <button key={i} onClick={() => { if (k === "⌫") setPin(p => p.slice(0, -1)); else if (k !== "") setPin(p => p.length < 6 ? p + k : p); }}
                  style={{ background: C.surface, color: k === "⌫" ? C.red : C.text, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "13px 0", fontSize: 17, fontWeight: 700, cursor: k === "" ? "default" : "pointer", opacity: k === "" ? 0 : 1 }}>{k}</button>
              ))}
            </div>
            {err && <div style={{ color: C.red, fontSize: 13, padding: "8px 12px", background: "#7f1d1d44", borderRadius: 8, marginBottom: 10 }}>⚠️ {err}</div>}
            <button onClick={handleLogin} style={{ width: "100%", background: pin.length >= 4 ? ROLE_COLORS[selected.role] : C.surface, color: pin.length >= 4 ? "#16161b" : C.muted, border: "none", borderRadius: 10, padding: "12px 0", fontWeight: 800, cursor: pin.length >= 4 ? "pointer" : "default", fontSize: 15 }}>Sign In →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SMALL UI HELPERS ──────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "10px 16px", minWidth: 130 }}>
      <div style={{ fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 5 }}>{icon} {label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}
function Badge({ children, bg, color }) { return <span style={{ background: bg, color, borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "2px 10px" }}>{children}</span>; }
function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 14, padding: "22px 24px", width: wide ? "min(94vw,640px)" : "min(94vw,460px)", maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.copperL }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.muted }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.soft, marginBottom: 5 }}>{label}</label>{children}</div>;
}
const inputStyle = { width: "100%", padding: "9px 11px", border: `1px solid ${C.border2}`, borderRadius: 7, fontSize: 13, background: C.surface, color: C.text, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const btnPrimary = { background: C.copper, color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const btnGhost = { background: "transparent", color: C.muted, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" };

// ════════════════════════════════════════════════════════════════════════════
// SETTINGS MODAL — rename app
// ════════════════════════════════════════════════════════════════════════════
function SettingsModal({ settings, onSave, onClose }) {
  const [name, setName] = useState(settings.appName);
  const [tagline, setTagline] = useState(settings.tagline);
  return (
    <Modal title="⚙️ App Settings" onClose={onClose}>
      <Field label="App Name">
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lakeview Hostel Manager" />
      </Field>
      <Field label="Tagline">
        <input style={inputStyle} value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Multi-Property Hostel Management" />
      </Field>
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button style={btnGhost} onClick={onClose}>Cancel</button>
        <button style={{ ...btnPrimary, flex: 1 }} onClick={() => { onSave({ appName: name.trim() || "HostelTrack Pro", tagline: tagline.trim() }); onClose(); }}>Save Changes</button>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
function Dashboard({ db, scopeProperties, currentUser }) {
  const canBackup = ROLE_ACCESS[currentUser.role]?.includes("backup");
  const beds = db.beds.filter(b => scopeProperties.includes(b.propertyId));
  const occupied = beds.filter(b => b.status === "occupied").length;
  const total = beds.length;
  const occRate = total ? Math.round((occupied / total) * 100) : 0;
  const activeBookings = db.bookings.filter(b => scopeProperties.includes(b.propertyId) && b.status === "checked-in");
  const todayCheckIns = db.bookings.filter(b => scopeProperties.includes(b.propertyId) && b.checkIn === today());
  const todayCheckOuts = db.bookings.filter(b => scopeProperties.includes(b.propertyId) && b.checkOut === today() && b.status === "checked-in");
  const todayRevenue = db.payments.filter(p => scopeProperties.includes(p.propertyId) && p.date === today()).reduce((s, p) => s + p.amount, 0);
  const monthExpenses = db.expenses.filter(e => scopeProperties.includes(e.propertyId) && e.date.slice(0, 7) === today().slice(0, 7)).reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      {canBackup && (
        <div style={{ background: "#1d2a36", border: `1px solid ${C.blue}55`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: C.soft }}>
          💾 <span>All data lives only in this browser. Visit <strong style={{ color: C.blue }}>Backup & Restore</strong> regularly to download a copy and keep your records safe long-term.</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <StatCard label="Occupancy" value={`${occRate}%`} color={C.copper} icon="🛏️" />
        <StatCard label="Occupied Beds" value={`${occupied}/${total}`} color={C.gold} icon="🔑" />
        <StatCard label="Active Bookings" value={activeBookings.length} color={C.blue} icon="📋" />
        <StatCard label="Today's Revenue" value={fmt(todayRevenue)} color={C.green} icon="💰" />
        <StatCard label="This Month Expenses" value={fmt(monthExpenses)} color={C.red} icon="🧾" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontWeight: 800, color: C.copperL, marginBottom: 12, fontSize: 14 }}>Today's Check-ins ({todayCheckIns.length})</div>
          {todayCheckIns.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>No check-ins scheduled today.</div>}
          {todayCheckIns.map(b => {
            const g = db.guests.find(x => x.id === b.guestId);
            return <div key={b.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13, color: C.text }}>{g?.name} — {db.rooms.find(r => r.id === b.roomId)?.roomNo}</div>;
          })}
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontWeight: 800, color: C.copperL, marginBottom: 12, fontSize: 14 }}>Today's Check-outs ({todayCheckOuts.length})</div>
          {todayCheckOuts.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>No check-outs scheduled today.</div>}
          {todayCheckOuts.map(b => {
            const g = db.guests.find(x => x.id === b.guestId);
            return <div key={b.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13, color: C.text }}>{g?.name} — {db.rooms.find(r => r.id === b.roomId)?.roomNo}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PROPERTIES
// ════════════════════════════════════════════════════════════════════════════
function Properties({ db, setDb, toast }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", phone: "", icon: "🏨" });

  const save = () => {
    if (!form.name.trim()) { toast("Property name required", "err"); return; }
    setDb(p => ({ ...p, properties: [...p.properties, { id: "PR" + uid(), ...form }] }));
    toast("Property added"); setModal(false); setForm({ name: "", location: "", phone: "", icon: "🏨" });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.copperL, fontFamily: "Georgia, serif" }}>Properties</h2>
        <button style={btnPrimary} onClick={() => setModal(true)}>+ Add Property</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
        {db.properties.map(p => {
          const rooms = db.rooms.filter(r => r.propertyId === p.id);
          const beds = db.beds.filter(b => b.propertyId === p.id);
          const occ = beds.filter(b => b.status === "occupied").length;
          return (
            <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>{p.icon}</div>
              <div style={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{p.location} · {p.phone}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Badge bg={C.surface} color={C.soft}>{rooms.length} rooms</Badge>
                <Badge bg={C.surface} color={C.soft}>{occ}/{beds.length} beds occupied</Badge>
              </div>
            </div>
          );
        })}
      </div>
      {modal && (
        <Modal title="Add Property" onClose={() => setModal(false)}>
          <Field label="Icon (emoji)"><input style={inputStyle} value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} /></Field>
          <Field label="Property Name"><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Riverside Hostel" /></Field>
          <Field label="Location"><input style={inputStyle} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Osu, Accra" /></Field>
          <Field label="Phone"><input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="020-000-0000" /></Field>
          <button style={{ ...btnPrimary, width: "100%" }} onClick={save}>Save Property</button>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ROOMS & BEDS
// ════════════════════════════════════════════════════════════════════════════
function Rooms({ db, setDb, scopeProperties, toast }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ propertyId: scopeProperties[0] || "", roomNo: "", type: "Dorm", beds: 4, ratePerNight: 50, ratePerSemester: 0 });
  const rooms = db.rooms.filter(r => scopeProperties.includes(r.propertyId));

  const save = () => {
    if (!form.roomNo.trim()) { toast("Room number required", "err"); return; }
    const newRoom = { id: "RM" + uid(), ...form, beds: Number(form.beds), ratePerNight: Number(form.ratePerNight), ratePerSemester: Number(form.ratePerSemester) };
    const newBeds = [];
    for (let i = 1; i <= newRoom.beds; i++) newBeds.push({ id: `${newRoom.id}-B${i}`, roomId: newRoom.id, propertyId: newRoom.propertyId, bedLabel: newRoom.beds === 1 ? "Room" : `Bed ${i}`, status: "available" });
    setDb(p => ({ ...p, rooms: [...p.rooms, newRoom], beds: [...p.beds, ...newBeds] }));
    toast("Room added"); setModal(false);
  };

  const statusColor = { available: C.green, occupied: C.red, cleaning: C.gold, maintenance: C.muted };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.copperL, fontFamily: "Georgia, serif" }}>Rooms & Beds</h2>
        <button style={btnPrimary} onClick={() => setModal(true)}>+ Add Room</button>
      </div>

      {db.properties.filter(p => scopeProperties.includes(p.id)).map(prop => (
        <div key={prop.id} style={{ marginBottom: 26 }}>
          <div style={{ fontWeight: 800, color: C.text, marginBottom: 10 }}>{prop.icon} {prop.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
            {rooms.filter(r => r.propertyId === prop.id).map(r => {
              const beds = db.beds.filter(b => b.roomId === r.id);
              return (
                <div key={r.id} style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 800, color: C.text }}>Room {r.roomNo}</span>
                    <Badge bg={C.surface} color={C.soft}>{r.type}</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                    {fmt(r.ratePerNight)}/night
                    {r.ratePerSemester > 0 && <span style={{ marginLeft: 8, color: C.gold }}>· {fmt(r.ratePerSemester)}/semester</span>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {beds.map(b => (
                      <span key={b.id} title={b.bedLabel} style={{
                        width: 30, height: 30, borderRadius: 6, background: statusColor[b.status] + "33",
                        border: `1.5px solid ${statusColor[b.status]}`, color: statusColor[b.status],
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800,
                      }}>{b.bedLabel.replace("Bed ", "").replace("Room", "R")}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {modal && (
        <Modal title="Add Room" onClose={() => setModal(false)}>
          <Field label="Property">
            <select style={inputStyle} value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })}>
              {db.properties.filter(p => scopeProperties.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Room Number"><input style={inputStyle} value={form.roomNo} onChange={e => setForm({ ...form, roomNo: e.target.value })} placeholder="e.g. 104" /></Field>
          <Field label="Type">
            <select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option>Dorm</option><option>Private</option><option>Family</option>
            </select>
          </Field>
          <Field label="Number of Beds"><input type="number" min={1} style={inputStyle} value={form.beds} onChange={e => setForm({ ...form, beds: e.target.value })} /></Field>
          <Field label="Rate per Night (GH₵)"><input type="number" min={0} style={inputStyle} value={form.ratePerNight} onChange={e => setForm({ ...form, ratePerNight: e.target.value })} /></Field>
          <Field label="Rate per Semester (GH₵)"><input type="number" min={0} style={inputStyle} value={form.ratePerSemester} onChange={e => setForm({ ...form, ratePerSemester: e.target.value })} placeholder="0 if not applicable" /></Field>
          <button style={{ ...btnPrimary, width: "100%" }} onClick={save}>Save Room</button>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// GUESTS
// ════════════════════════════════════════════════════════════════════════════
function Guests({ db, setDb, toast }) {
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", idType: "Ghana Card", idNumber: "", nationality: "" });

  const save = () => {
    if (!form.name.trim()) { toast("Guest name required", "err"); return; }
    setDb(p => ({ ...p, guests: [...p.guests, { id: "G" + uid(), ...form }] }));
    toast("Guest added"); setModal(false); setForm({ name: "", phone: "", idType: "Ghana Card", idNumber: "", nationality: "" });
  };

  const filtered = db.guests.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.phone.includes(search) || g.idNumber.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, color: C.copperL, fontFamily: "Georgia, serif" }}>Guests</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <input style={{ ...inputStyle, width: 200 }} placeholder="Search name, phone, ID…" value={search} onChange={e => setSearch(e.target.value)} />
          <button style={btnPrimary} onClick={() => setModal(true)}>+ Add Guest</button>
        </div>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.surface, color: C.muted, textAlign: "left" }}>
              <th style={{ padding: "10px 14px" }}>Name</th><th>Phone</th><th>ID Type</th><th>ID Number</th><th>Nationality</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(g => (
              <tr key={g.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "10px 14px", color: C.text, fontWeight: 600 }}>{g.name}</td>
                <td style={{ color: C.soft }}>{g.phone}</td>
                <td style={{ color: C.soft }}>{g.idType}</td>
                <td style={{ color: C.soft, fontFamily: "monospace" }}>{g.idNumber}</td>
                <td style={{ color: C.soft }}>{g.nationality}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Add Guest" onClose={() => setModal(false)}>
          <Field label="Full Name"><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone"><input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="ID Type">
            <select style={inputStyle} value={form.idType} onChange={e => setForm({ ...form, idType: e.target.value })}>
              <option>Ghana Card</option><option>Passport</option><option>Voter ID</option><option>Driver's License</option>
            </select>
          </Field>
          <Field label="ID Number"><input style={inputStyle} value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} /></Field>
          <Field label="Nationality"><input style={inputStyle} value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} /></Field>
          <button style={{ ...btnPrimary, width: "100%" }} onClick={save}>Save Guest</button>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BOOKINGS
// ════════════════════════════════════════════════════════════════════════════
function Bookings({ db, setDb, scopeProperties, currentUser, toast }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ propertyId: scopeProperties[0] || "", roomId: "", bedId: "", guestId: "", checkIn: today(), checkOut: addDays(today(), 1) });
  const [filterStatus, setFilterStatus] = useState("all");

  const bookings = db.bookings.filter(b => scopeProperties.includes(b.propertyId) && (filterStatus === "all" || b.status === filterStatus));
  const availableBeds = db.beds.filter(b => b.propertyId === form.propertyId && b.roomId === form.roomId && b.status === "available");

  const checkIn = () => {
    if (!form.guestId || !form.bedId) { toast("Select guest and bed", "err"); return; }
    const room = db.rooms.find(r => r.id === form.roomId);
    const booking = { id: "BK" + uid(), propertyId: form.propertyId, roomId: form.roomId, bedId: form.bedId, guestId: form.guestId, checkIn: form.checkIn, checkOut: form.checkOut, ratePerNight: room.ratePerNight, status: "checked-in", createdBy: currentUser.id, createdAt: nowStr() };
    setDb(p => ({
      ...p,
      bookings: [...p.bookings, booking],
      beds: p.beds.map(b => b.id === form.bedId ? { ...b, status: "occupied" } : b),
    }));
    toast("Guest checked in"); setModal(false);
  };

  const checkOut = (b) => {
    setDb(p => ({
      ...p,
      bookings: p.bookings.map(x => x.id === b.id ? { ...x, status: "checked-out" } : x),
      beds: p.beds.map(bed => bed.id === b.bedId ? { ...bed, status: "cleaning" } : bed),
    }));
    toast("Guest checked out");
  };

  const statusColor = { "checked-in": C.green, "checked-out": C.muted, "reserved": C.blue };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, color: C.copperL, fontFamily: "Georgia, serif" }}>Bookings</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <select style={inputStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All status</option><option value="checked-in">Checked-in</option><option value="checked-out">Checked-out</option>
          </select>
          <button style={btnPrimary} onClick={() => setModal(true)}>+ New Check-in</button>
        </div>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.surface, color: C.muted, textAlign: "left" }}>
              <th style={{ padding: "10px 14px" }}>Guest</th><th>Room/Bed</th><th>Check-in</th><th>Check-out</th><th>Nights</th><th>Rate</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => {
              const g = db.guests.find(x => x.id === b.guestId);
              const room = db.rooms.find(r => r.id === b.roomId);
              const bed = db.beds.find(x => x.id === b.bedId);
              const nights = daysBetween(b.checkIn, b.checkOut);
              return (
                <tr key={b.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 14px", color: C.text, fontWeight: 600 }}>{g?.name}</td>
                  <td style={{ color: C.soft }}>{room?.roomNo} · {bed?.bedLabel}</td>
                  <td style={{ color: C.soft }}>{b.checkIn}</td>
                  <td style={{ color: C.soft }}>{b.checkOut}</td>
                  <td style={{ color: C.soft }}>{nights}</td>
                  <td style={{ color: C.soft }}>{fmt(b.ratePerNight)}</td>
                  <td><Badge bg={statusColor[b.status] + "22"} color={statusColor[b.status]}>{b.status}</Badge></td>
                  <td>{b.status === "checked-in" && <button onClick={() => checkOut(b)} style={{ ...btnGhost, padding: "5px 10px", fontSize: 11 }}>Check-out</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="New Check-in" onClose={() => setModal(false)}>
          <Field label="Property">
            <select style={inputStyle} value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value, roomId: "", bedId: "" })}>
              {db.properties.filter(p => scopeProperties.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Room">
            <select style={inputStyle} value={form.roomId} onChange={e => setForm({ ...form, roomId: e.target.value, bedId: "" })}>
              <option value="">Select room…</option>
              {db.rooms.filter(r => r.propertyId === form.propertyId).map(r => <option key={r.id} value={r.id}>{r.roomNo} ({r.type}, {fmt(r.ratePerNight)}/night{r.ratePerSemester > 0 ? `, ${fmt(r.ratePerSemester)}/sem` : ""})</option>)}
            </select>
          </Field>
          <Field label="Bed">
            <select style={inputStyle} value={form.bedId} onChange={e => setForm({ ...form, bedId: e.target.value })}>
              <option value="">Select bed…</option>
              {availableBeds.map(b => <option key={b.id} value={b.id}>{b.bedLabel}</option>)}
            </select>
          </Field>
          <Field label="Guest">
            <select style={inputStyle} value={form.guestId} onChange={e => setForm({ ...form, guestId: e.target.value })}>
              <option value="">Select guest…</option>
              {db.guests.map(g => <option key={g.id} value={g.id}>{g.name} ({g.idType}: {g.idNumber})</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Check-in"><input type="date" style={inputStyle} value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })} /></Field>
            <Field label="Check-out"><input type="date" style={inputStyle} value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })} /></Field>
          </div>
          <button style={{ ...btnPrimary, width: "100%" }} onClick={checkIn}>Confirm Check-in</button>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BILLING
// ════════════════════════════════════════════════════════════════════════════
function Billing({ db, setDb, scopeProperties, currentUser, toast }) {
  const [modal, setModal] = useState(null);
  const [method, setMethod] = useState("Cash");
  const [amount, setAmount] = useState("");

  const activeBookings = db.bookings.filter(b => scopeProperties.includes(b.propertyId) && b.status === "checked-in");

  const billFor = (b) => {
    const nights = daysBetween(b.checkIn, b.checkOut);
    const total = nights * b.ratePerNight;
    const paid = db.payments.filter(p => p.bookingId === b.id).reduce((s, p) => s + p.amount, 0);
    return { nights, total, paid, balance: total - paid };
  };

  const recordPayment = (b, bill) => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast("Enter a valid amount", "err"); return; }
    setDb(p => ({ ...p, payments: [...p.payments, { id: "PM" + uid(), bookingId: b.id, propertyId: b.propertyId, amount: amt, method, date: today(), receivedBy: currentUser.id }] }));
    toast("Payment recorded"); setModal(null); setAmount("");
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 16px", color: C.copperL, fontFamily: "Georgia, serif" }}>Billing</h2>
      <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.surface, color: C.muted, textAlign: "left" }}>
              <th style={{ padding: "10px 14px" }}>Guest</th><th>Room</th><th>Nights</th><th>Total</th><th>Paid</th><th>Balance</th><th></th>
            </tr>
          </thead>
          <tbody>
            {activeBookings.map(b => {
              const g = db.guests.find(x => x.id === b.guestId);
              const room = db.rooms.find(r => r.id === b.roomId);
              const bill = billFor(b);
              return (
                <tr key={b.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 14px", color: C.text, fontWeight: 600 }}>{g?.name}</td>
                  <td style={{ color: C.soft }}>{room?.roomNo}</td>
                  <td style={{ color: C.soft }}>{bill.nights}</td>
                  <td style={{ color: C.soft }}>{fmt(bill.total)}</td>
                  <td style={{ color: C.green }}>{fmt(bill.paid)}</td>
                  <td style={{ color: bill.balance > 0 ? C.red : C.green, fontWeight: 700 }}>{fmt(bill.balance)}</td>
                  <td>{bill.balance > 0 && <button style={{ ...btnGhost, padding: "5px 10px", fontSize: 11 }} onClick={() => setModal(b)}>Record Payment</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (() => {
        const bill = billFor(modal); const g = db.guests.find(x => x.id === modal.guestId);
        return (
          <Modal title={`Record Payment — ${g?.name}`} onClose={() => setModal(null)}>
            <div style={{ background: C.surface, borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Total Due</span><span style={{ color: C.text, fontWeight: 700 }}>{fmt(bill.total)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Already Paid</span><span style={{ color: C.green }}>{fmt(bill.paid)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Balance</span><span style={{ color: C.red, fontWeight: 800 }}>{fmt(bill.balance)}</span></div>
            </div>
            <Field label="Amount (GH₵)"><input type="number" style={inputStyle} value={amount} onChange={e => setAmount(e.target.value)} placeholder={bill.balance} /></Field>
            <Field label="Method">
              <select style={inputStyle} value={method} onChange={e => setMethod(e.target.value)}>
                <option>Cash</option><option>Mobile Money</option><option>Card</option><option>Bank Transfer</option>
              </select>
            </Field>
            <button style={{ ...btnPrimary, width: "100%" }} onClick={() => recordPayment(modal, bill)}>Confirm Payment</button>
          </Modal>
        );
      })()}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// EXPENSES
// ════════════════════════════════════════════════════════════════════════════
function Expenses({ db, setDb, scopeProperties, currentUser, toast }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ propertyId: scopeProperties[0] || "", category: "Utilities", description: "", amount: "" });
  const expenses = db.expenses.filter(e => scopeProperties.includes(e.propertyId)).sort((a, b) => b.date.localeCompare(a.date));

  const save = () => {
    if (!form.description.trim() || !Number(form.amount)) { toast("Description and amount required", "err"); return; }
    setDb(p => ({ ...p, expenses: [...p.expenses, { id: "EX" + uid(), ...form, amount: Number(form.amount), date: today(), addedBy: currentUser.id }] }));
    toast("Expense recorded"); setModal(false); setForm({ propertyId: scopeProperties[0] || "", category: "Utilities", description: "", amount: "" });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.copperL, fontFamily: "Georgia, serif" }}>Expenses</h2>
        <button style={btnPrimary} onClick={() => setModal(true)}>+ Add Expense</button>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ background: C.surface, color: C.muted, textAlign: "left" }}><th style={{ padding: "10px 14px" }}>Date</th><th>Property</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>
            {expenses.map(e => (
              <tr key={e.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "10px 14px", color: C.soft }}>{e.date}</td>
                <td style={{ color: C.soft }}>{db.properties.find(p => p.id === e.propertyId)?.name}</td>
                <td><Badge bg={C.surface} color={C.gold}>{e.category}</Badge></td>
                <td style={{ color: C.text }}>{e.description}</td>
                <td style={{ color: C.red, fontWeight: 700 }}>{fmt(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Add Expense" onClose={() => setModal(false)}>
          <Field label="Property">
            <select style={inputStyle} value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })}>
              {db.properties.filter(p => scopeProperties.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select style={inputStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option>Utilities</option><option>Supplies</option><option>Maintenance</option><option>Salaries</option><option>Marketing</option><option>Other</option>
            </select>
          </Field>
          <Field label="Description"><input style={inputStyle} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Amount (GH₵)"><input type="number" style={inputStyle} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></Field>
          <button style={{ ...btnPrimary, width: "100%" }} onClick={save}>Save Expense</button>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STAFF
// ════════════════════════════════════════════════════════════════════════════
function Staff({ db, setDb, toast }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", role: "Receptionist", pin: "", propertyId: "" });

  const save = () => {
    if (!form.name.trim() || form.pin.length < 4) { toast("Name and 4-digit PIN required", "err"); return; }
    setDb(p => ({ ...p, staff: [...p.staff, { id: "ST" + uid(), ...form, propertyId: form.propertyId || null, status: "Active" }] }));
    toast("Staff added"); setModal(false); setForm({ name: "", role: "Receptionist", pin: "", propertyId: "" });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: C.copperL, fontFamily: "Georgia, serif" }}>Staff</h2>
        <button style={btnPrimary} onClick={() => setModal(true)}>+ Add Staff</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
        {db.staff.map(s => (
          <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 800, color: C.text }}>{s.name}</div>
            <Badge bg={ROLE_COLORS[s.role] + "22"} color={ROLE_COLORS[s.role]}>{s.role}</Badge>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{s.propertyId ? db.properties.find(p => p.id === s.propertyId)?.name : "All Properties"}</div>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title="Add Staff" onClose={() => setModal(false)}>
          <Field label="Name"><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Role">
            <select style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option>Manager</option><option>Receptionist</option><option>Cashier</option>
            </select>
          </Field>
          <Field label="Property (leave blank for all)">
            <select style={inputStyle} value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })}>
              <option value="">All Properties</option>
              {db.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="4-digit PIN"><input style={inputStyle} maxLength={6} value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} /></Field>
          <button style={{ ...btnPrimary, width: "100%" }} onClick={save}>Save Staff</button>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// REPORTS
// ════════════════════════════════════════════════════════════════════════════
function Reports({ db, scopeProperties }) {
  const revenue = db.payments.filter(p => scopeProperties.includes(p.propertyId)).reduce((s, p) => s + p.amount, 0);
  const expenses = db.expenses.filter(e => scopeProperties.includes(e.propertyId)).reduce((s, e) => s + e.amount, 0);
  const net = revenue - expenses;
  const byProperty = db.properties.filter(p => scopeProperties.includes(p.id)).map(p => {
    const rev = db.payments.filter(pm => pm.propertyId === p.id).reduce((s, pm) => s + pm.amount, 0);
    const exp = db.expenses.filter(e => e.propertyId === p.id).reduce((s, e) => s + e.amount, 0);
    return { ...p, rev, exp, net: rev - exp };
  });

  return (
    <div>
      <h2 style={{ margin: "0 0 16px", color: C.copperL, fontFamily: "Georgia, serif" }}>Reports</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Total Revenue" value={fmt(revenue)} color={C.green} icon="💰" />
        <StatCard label="Total Expenses" value={fmt(expenses)} color={C.red} icon="🧾" />
        <StatCard label="Net Profit" value={fmt(net)} color={net >= 0 ? C.gold : C.red} icon="📈" />
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ background: C.surface, color: C.muted, textAlign: "left" }}><th style={{ padding: "10px 14px" }}>Property</th><th>Revenue</th><th>Expenses</th><th>Net</th></tr></thead>
          <tbody>
            {byProperty.map(p => (
              <tr key={p.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "10px 14px", color: C.text, fontWeight: 600 }}>{p.icon} {p.name}</td>
                <td style={{ color: C.green }}>{fmt(p.rev)}</td>
                <td style={{ color: C.red }}>{fmt(p.exp)}</td>
                <td style={{ color: p.net >= 0 ? C.gold : C.red, fontWeight: 700 }}>{fmt(p.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BACKUP & RESTORE
// ════════════════════════════════════════════════════════════════════════════
function Backup({ db, setDb, settings, toast }) {
  const [confirmRestore, setConfirmRestore] = useState(null); // holds parsed file data awaiting confirm
  const [fileError, setFileError] = useState("");

  const stats = [
    ["Properties", db.properties.length],
    ["Rooms", db.rooms.length],
    ["Beds", db.beds.length],
    ["Guests", db.guests.length],
    ["Bookings", db.bookings.length],
    ["Payments", db.payments.length],
    ["Expenses", db.expenses.length],
    ["Staff", db.staff.length],
  ];

  const downloadBackup = () => {
    const payload = {
      app: settings.appName,
      exportedAt: new Date().toISOString(),
      version: 1,
      data: db,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${settings.appName.replace(/\s+/g, "-")}-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Backup file downloaded");
  };

  const onFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.data || !parsed.data.properties) {
          setFileError("This doesn't look like a valid backup file.");
          return;
        }
        setConfirmRestore(parsed);
      } catch (err) {
        setFileError("Could not read this file. Make sure it's a backup .json file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // allow re-selecting same file later
  };

  const doRestore = () => {
    setDb(confirmRestore.data);
    toast("Data restored from backup");
    setConfirmRestore(null);
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 6px", color: C.copperL, fontFamily: "Georgia, serif" }}>Backup & Restore</h2>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 20px", maxWidth: 600, lineHeight: 1.6 }}>
        All data here is stored only on this device's browser. To keep your records safe long-term — across years, devices, or in case this browser's storage is ever cleared — download a backup file regularly and store it somewhere safe (Google Drive, email, a USB drive).
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Export */}
        <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 800, color: C.text, marginBottom: 4, fontSize: 14 }}>⬇️ Export Backup</div>
          <p style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>Download everything as a single .json file.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {stats.map(([label, val]) => (
              <div key={label} style={{ background: C.surface, borderRadius: 7, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                <div style={{ fontSize: 14, color: C.text, fontWeight: 700 }}>{val}</div>
              </div>
            ))}
          </div>
          <button style={{ ...btnPrimary, width: "100%" }} onClick={downloadBackup}>⬇️ Download Backup File</button>
        </div>

        {/* Import */}
        <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 800, color: C.text, marginBottom: 4, fontSize: 14 }}>⬆️ Restore from Backup</div>
          <p style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>
            Choose a previously downloaded backup file. This will replace all current data in the app with the contents of the file.
          </p>
          <div style={{ background: "#3a2a14", border: `1px solid ${C.gold}`, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: "#f0d9a8" }}>
            ⚠️ Restoring overwrites everything currently in the app. Export a fresh backup first if you want to keep what's here now.
          </div>
          <label style={{ ...btnGhost, width: "100%", boxSizing: "border-box", display: "block", textAlign: "center", cursor: "pointer" }}>
            Choose Backup File…
            <input type="file" accept="application/json" onChange={onFilePicked} style={{ display: "none" }} />
          </label>
          {fileError && <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>{fileError}</div>}
        </div>
      </div>

      {confirmRestore && (
        <Modal title="Confirm Restore" onClose={() => setConfirmRestore(null)}>
          <p style={{ fontSize: 13, color: C.soft, lineHeight: 1.6, marginBottom: 14 }}>
            This backup was exported from <strong style={{ color: C.text }}>{confirmRestore.app || "this app"}</strong> on{" "}
            <strong style={{ color: C.text }}>{new Date(confirmRestore.exportedAt).toLocaleString()}</strong>.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[
              ["Properties", confirmRestore.data.properties?.length || 0],
              ["Guests", confirmRestore.data.guests?.length || 0],
              ["Bookings", confirmRestore.data.bookings?.length || 0],
              ["Payments", confirmRestore.data.payments?.length || 0],
            ].map(([label, val]) => (
              <div key={label} style={{ background: C.surface, borderRadius: 7, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: C.muted }}>{label}</div>
                <div style={{ fontSize: 14, color: C.text, fontWeight: 700 }}>{val}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: C.red, marginBottom: 16 }}>This will replace all data currently in the app. This cannot be undone.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={btnGhost} onClick={() => setConfirmRestore(null)}>Cancel</button>
            <button style={{ ...btnPrimary, flex: 1, background: C.red }} onClick={doRestore}>Yes, Restore This Backup</button>
          </div>
        </Modal>
      )}
    </div>
  );
}


export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [license, setLicense] = useState(loadLicense);
  const [db, setDb] = useState(loadData);
  const [currentUser, setCurrentUser] = useState(null);
  const [active, setActive] = useState("dashboard");
  const [sideOpen, setSideOpen] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const updateSettings = (newSettings) => { setSettings(newSettings); saveSettings(newSettings); };

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (_) {} }, [db]);

  const toast = (msg, type = "ok") => { setToastMsg({ msg, type }); setTimeout(() => setToastMsg(null), 2800); };

  // ── License gate ──────────────────────────────────────────────────────
  if (!license) return <LicenseScreen onActivate={setLicense} appName={settings.appName} />;
  if (isExpired(license.expiry)) return <LicenseExpiredScreen license={license} onRenew={() => setLicense(null)} appName={settings.appName} />;

  // ── Staff login gate ──────────────────────────────────────────────────
  if (!currentUser) return <StaffLogin staff={db.staff} properties={db.properties} onLogin={setCurrentUser} appName={settings.appName} />;

  const scopeProperties = currentUser.propertyId ? [currentUser.propertyId] : db.properties.map(p => p.id);
  const allowedModules = ROLE_ACCESS[currentUser.role] || [];
  const visibleModules = MODULES.filter(m => allowedModules.includes(m.id));

  const renderModule = () => {
    if (!allowedModules.includes(active)) return <div style={{ padding: 40, textAlign: "center", color: C.red }}>Access denied for your role.</div>;
    const shared = { db, setDb, scopeProperties, currentUser, toast };
    switch (active) {
      case "dashboard": return <Dashboard {...shared} />;
      case "properties": return <Properties {...shared} />;
      case "rooms": return <Rooms {...shared} />;
      case "bookings": return <Bookings {...shared} />;
      case "guests": return <Guests {...shared} />;
      case "billing": return <Billing {...shared} />;
      case "expenses": return <Expenses {...shared} />;
      case "staff": return <Staff {...shared} />;
      case "reports": return <Reports {...shared} />;
      case "backup": return <Backup db={db} setDb={setDb} settings={settings} toast={toast} />;
      default: return null;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: sideOpen ? 220 : 64, background: C.card, borderRight: `1px solid ${C.border2}`, flexShrink: 0, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflow: "hidden", transition: "width .18s" }}>
        <div style={{ padding: "16px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: C.copper, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🔑</div>
          {sideOpen && <div style={{ overflow: "hidden" }}>
            <div style={{ color: C.copperL, fontWeight: 800, fontSize: 13, fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>{settings.appName}</div>
            <div style={{ color: C.muted, fontSize: 10, whiteSpace: "nowrap" }}>{settings.tagline}</div>
          </div>}
        </div>

        {sideOpen && (
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,.02)" }}>
            <div style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{currentUser.name}</div>
            <Badge bg={ROLE_COLORS[currentUser.role] + "22"} color={ROLE_COLORS[currentUser.role]}>{currentUser.role}</Badge>
            {license.type === "trial" && <div style={{ marginTop: 6, fontSize: 10, color: C.gold, background: "rgba(212,162,58,.15)", borderRadius: 8, padding: "2px 7px", display: "inline-block" }}>Trial: {daysLeft(license.expiry)}d left</div>}
          </div>
        )}

        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {visibleModules.map(m => (
            <button key={m.id} onClick={() => setActive(m.id)} style={{ width: "100%", background: active === m.id ? "rgba(196,118,63,.18)" : "none", border: "none", borderLeft: active === m.id ? `3px solid ${C.copper}` : "3px solid transparent", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: active === m.id ? C.copperL : C.soft, textAlign: "left", fontSize: 13, fontWeight: active === m.id ? 700 : 400 }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{m.icon}</span>
              {sideOpen && <span style={{ whiteSpace: "nowrap" }}>{m.label}</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding: "8px 14px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
          {currentUser.role === "Owner" && (
            <button onClick={() => setShowSettings(true)} style={{ width: "100%", background: "transparent", border: `1px solid ${C.border2}`, color: C.muted, padding: "7px 0", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
              {sideOpen ? "⚙️ Settings" : "⚙️"}
            </button>
          )}
          <button onClick={() => setCurrentUser(null)} style={{ width: "100%", background: "rgba(224,89,79,.12)", border: `1px solid ${C.red}`, color: C.red, padding: "7px 0", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
            {sideOpen ? "🔓 Switch User" : "🔓"}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ padding: "10px 22px", borderBottom: `1px solid ${C.border2}`, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setSideOpen(s => !s)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18 }}>☰</button>
          <span style={{ color: C.muted, fontSize: 12 }}>{currentUser.propertyId ? db.properties.find(p => p.id === currentUser.propertyId)?.name : "All Properties"}</span>
        </div>
        <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          {renderModule()}
        </div>
      </div>

      {toastMsg && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 999, background: toastMsg.type === "err" ? C.red : C.green, color: "#fff", padding: "11px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>{toastMsg.msg}</div>
      )}

      {showSettings && <SettingsModal settings={settings} onSave={updateSettings} onClose={() => setShowSettings(false)} />}
    </div>
  );
}
