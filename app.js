/* ═══════════════════════════════════════════════════
   MENTLIFY — Firebase SPA (app.js)
   Modular Firebase v10  ·  No compat SDK
═══════════════════════════════════════════════════ */

// ── Modular Firebase imports ──────────────────────
import { initializeApp }           from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged,
         signInWithEmailAndPassword,
         signOut }                 from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc,
         getDocs, getDoc, addDoc,
         updateDoc, deleteDoc,
         query, where, orderBy,
         limit, serverTimestamp }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ── Firebase Config & Init ────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBDwxkMEdnFfKz2APaGzR7HBVoWKdOJoro",
  authDomain:        "mentlify-admin.firebaseapp.com",
  projectId:         "mentlify-admin",
  storageBucket:     "mentlify-admin.firebasestorage.app",
  messagingSenderId: "1091353856466",
  appId:             "1:1091353856466:web:bbb41295e7dcd26341200b",
  measurementId:     "G-5QQNN2VYQ0"
};

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

console.log("Firebase Connected Successfully");
async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "mentlify_upload");

  const res = await fetch("https://api.cloudinary.com/v1_1/deiqcdps2/image/upload", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.secure_url;
}

// ── Globals ───────────────────────────────────────
const WA = "918710022872";
let me = null;
let curTab = "";

// ══════════════════════════════════════════════════
//  DRAWER & MOBILE NAV
// ══════════════════════════════════════════════════
window.openDrawer = function () {
  const drawer = document.getElementById("drawer");
  if (drawer) { drawer.classList.add("open"); document.body.style.overflow = "hidden"; }
};
window.closeDrawer = function () {
  const drawer = document.getElementById("drawer");
  if (drawer) { drawer.classList.remove("open"); document.body.style.overflow = ""; }
};
window.toggleSB = () => document.getElementById("admSB")?.classList.toggle("open");

// Close drawer when clicking backdrop
document.addEventListener("click", e => {
  const drawer = document.getElementById("drawer");
  if (drawer && e.target.classList.contains("drw-bg")) window.closeDrawer();
});

// ══════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════
function toast(msg, type = "info", ms = 3200) {
  const w = document.getElementById("toastStack");
  if (!w) return;
  const d = document.createElement("div");
  d.className = "toast" + (type === "ok" ? " ok" : type === "err" ? " err" : "");
  const icon = type === "ok" ? "check-circle" : type === "err" ? "times-circle" : "info-circle";
  d.innerHTML = `<i class="fas fa-${icon}"></i>${msg}`;
  w.appendChild(d);
  setTimeout(() => {
    d.style.cssText = "opacity:0;transform:translateX(28px);transition:.28s";
    setTimeout(() => d.remove(), 280);
  }, ms);
}

// ── WhatsApp helper ───────────────────────────────
function wa(msg) { toast("Opening WhatsApp…"); setTimeout(() => window.open("https://wa.me/" + WA + "?text=" + msg, "_blank"), 350); }
window.offerCTA  = () => wa(encodeURIComponent("Hi Mentlify, I want to apply and get FREE personal mentor guidance!"));
window.laptopCTA = () => wa(encodeURIComponent("Hi Mentlify, I want to know about the special laptop reward for college admissions (valid till 25th May)!"));

// ══════════════════════════════════════════════════
//  ROUTING  (hash-based SPA)
// ══════════════════════════════════════════════════
window.addEventListener("hashchange", route);

onAuthStateChanged(auth, u => {
  me = u;
  updateAuthUI();
  route();
});

function route() {
  const h = location.hash || "#home";
  if (h.startsWith("#detail/")) { showDetail(h.slice(8)); return; }
  if (h.startsWith("#dash/"))   { if (!me) { location.hash = "#admin"; return; } showDash(h.slice(6)); return; }
  switch (h) {
    case "#home":      showView("vHome");   loadHomeFeatured();     break;
    case "#browse":    showView("vBrowse"); loadBrowse();           break;
    case "#colleges":  showView("vBrowse"); loadBrowse("college");  break;
    case "#schools":   showView("vBrowse"); loadBrowse("school");   break;
    case "#coaching":  showView("vBrowse"); loadBrowse("coaching"); break;
    case "#teachers":  showView("vBrowse"); loadBrowse("teacher");  break;
    case "#admin":     me ? (location.hash = "#dash/overview") : showView("vLogin"); break;
    case "#dashboard": if (!me) { location.hash = "#admin"; return; } showView("vDash"); showDash("overview"); break;
    default:           showView("vHome");   loadHomeFeatured();
  }
}

function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("on"));
  const el = document.getElementById(id);
  if (el) { el.classList.add("on"); window.scrollTo(0, 0); }
  const pub   = document.getElementById("pubNav");
  const waBtn = document.querySelector(".wa-float");
  if (id === "vDash") {
    if (pub)   pub.style.display   = "none";
    if (waBtn) waBtn.style.display = "none";
  } else {
    if (pub)   pub.style.display   = "";
    if (waBtn) waBtn.style.display = "";
  }
}

function updateAuthUI() {
  const el = document.getElementById("navAdm");
  if (el) el.textContent = me ? "Dashboard" : "Admin";
}

// ══════════════════════════════════════════════════
//  HOME
// ══════════════════════════════════════════════════
async function loadHomeFeatured() {
  try {
    const snap = await getDocs(query(collection(db, "institutions"), orderBy("createdAt", "desc"), limit(6)));
    renderCards(snap.docs.map(d => ({ id: d.id, ...d.data() })), "homeFeat");
    loadStats();
  } catch (e) { console.warn("loadHomeFeatured:", e.message); }
}

async function loadStats() {
  try {
    const snap = await getDocs(collection(db, "institutions"));
    let c = 0, s = 0, co = 0, t = 0;
    snap.forEach(d => {
      const tp = d.data().type || "";
      if (tp === "college") c++; else if (tp === "school") s++; else if (tp === "coaching") co++; else if (tp === "teacher") t++;
    });
    setText("stC", c + "+"); setText("stS", s + "+"); setText("stCo", co + "+"); setText("stT", snap.size + "+");
  } catch (e) { console.warn("loadStats:", e.message); }
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

// ══════════════════════════════════════════════════
//  BROWSE
// ══════════════════════════════════════════════════
async function loadBrowse(type = "all", q = "", city = "") {
  document.querySelectorAll(".tab-pill").forEach(p => p.classList.toggle("on", p.dataset.t === (type || "all")));
  window._browseType = type;
  const grid = document.getElementById("browseGrid");
  if (!grid) return;
  grid.innerHTML = `<div class="loader"><i class="fas fa-circle-notch spin"></i></div>`;
  try {
    const snap = await getDocs(query(collection(db, "institutions"), orderBy("createdAt", "desc")));
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (type && type !== "all") items = items.filter(i => i.type === type);
    if (q)    items = items.filter(i => (i.name + " " + (i.courses || []).join(" ")).toLowerCase().includes(q.toLowerCase()));
    if (city) items = items.filter(i => (i.location || "").toLowerCase().includes(city.toLowerCase()));
    items.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    const cnt = document.getElementById("browseCount");
    if (cnt) cnt.innerHTML = `Showing <strong>${items.length}</strong> result${items.length !== 1 ? "s" : ""}`;
    renderCards(items, "browseGrid");
  } catch (e) {
    grid.innerHTML = `<div class="empty-box"><i class="fas fa-exclamation-triangle"></i><p>Error loading data — check Firebase config &amp; rules.<br><small>${e.message}</small></p></div>`;
  }
}

window.doSearch = function () {
  const q    = (document.getElementById("srchQ")    || {}).value || "";
  const city = (document.getElementById("srchCity") || {}).value || "";
  const type = (document.getElementById("srchType") || {}).value || "all";
  loadBrowse(type, q, city);
};

// ══════════════════════════════════════════════════
//  RENDER INSTITUTION CARDS
// ══════════════════════════════════════════════════
function renderCards(items, gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  if (!items.length) {
    grid.innerHTML = `<div class="empty-box"><i class="fas fa-university"></i><p>No institutions found. Admin can add listings from the dashboard.</p></div>`;
    return;
  }
  const grads = [
    "linear-gradient(135deg,#1a56db,#7c3aed)", "linear-gradient(135deg,#059669,#0891b2)",
    "linear-gradient(135deg,#f59e0b,#ef4444)",  "linear-gradient(135deg,#8b5cf6,#6366f1)",
    "linear-gradient(135deg,#0ea5e9,#2563eb)",  "linear-gradient(135deg,#ec4899,#8b5cf6)"
  ];
  const tmap = { college: "tc", school: "ts", coaching: "tco", teacher: "tt" };
  grid.innerHTML = items.map((item, i) => {
    const img      = (item.images || [])[0] || "";
    const tp       = (item.type || "").toLowerCase();
    const courses  = item.courses || [];
    const rf       = Math.min(5, Math.round(parseFloat(item.rating) || 4.5));
    const stars    = "★".repeat(rf) + "☆".repeat(5 - rf);
    const grad     = grads[i % grads.length];
    const applyMsg = encodeURIComponent(`Hi Mentlify, I am interested in ${item.name || ""}, Code: ${item.code || ""}`);
    return `<div class="icard" onclick="location.hash='#detail/${item.id}'">
      <div class="icard-img" style="background:${grad}1a">
        ${img ? `<img src="${img}" alt="${item.name || ""}" loading="lazy">` : `<div class="icard-ph" style="background:${grad};width:100%;height:100%">${(item.name || "?")[0].toUpperCase()}</div>`}
        ${item.featured ? `<div class="feat-badge">⭐ Featured</div>` : ""}
        <div class="type-badge ${tmap[tp] || "tc"}">${item.type || "Institute"}</div>
      </div>
      <div class="icard-body">
        <div class="icard-name">${item.name || "Institute"}</div>
        <div class="icard-loc"><i class="fas fa-map-marker-alt"></i>${item.location || ""}</div>
        <div class="icard-stars">${stars} <span style="font-size:.7rem;color:var(--faint)">(${item.reviewCount || ""})</span></div>
        <div class="course-chips">${courses.slice(0, 3).map(c => `<span class="ctag">${typeof c === "object" ? c.name : c}</span>`).join("")}${courses.length > 3 ? `<span class="ctag">+${courses.length - 3}</span>` : ""}</div>
        <div class="icard-footer">
          <span class="icard-code">${item.code || ""}</span>
          <button class="btn btn-wa btn-sm" onclick="event.stopPropagation();wa('${applyMsg}')"><i class="fab fa-whatsapp"></i> Apply</button>
        </div>
      </div>
    </div>`;
  }).join("");
}

// ══════════════════════════════════════════════════
//  DETAIL PAGE
// ══════════════════════════════════════════════════
async function showDetail(id) {
  showView("vDetail");
  const wrap = document.getElementById("detWrap");
  wrap.innerHTML = `<div class="loader"><i class="fas fa-circle-notch spin"></i> Loading…</div>`;
  try {
    const snap = await getDoc(doc(db, "institutions", id));
    if (!snap.exists()) { wrap.innerHTML = `<p>Institution not found.</p>`; return; }
    renderDetail({ id: snap.id, ...snap.data() }, wrap);
  } catch (e) { wrap.innerHTML = `<p style="color:red">Error: ${e.message}</p>`; }
}

function renderDetail(d, wrap) {
  const images  = d.images || [];
  const courses = d.courses || [];
  const facs    = d.facilities ? d.facilities.split(",").map(f => f.trim()).filter(Boolean) : [];
  const rf      = Math.min(5, Math.round(parseFloat(d.rating) || 4.5));
  const stars   = "★".repeat(rf) + "☆".repeat(5 - rf);
  const applyMsg = encodeURIComponent(`Hi Mentlify, I am interested in ${d.name || ""}, Code: ${d.code || ""}`);

  const sliderHtml = images.length ? `
    <div class="slider">
      <div class="slide-track" id="slTrk">${images.map(u => `<div class="slide"><img src="${u}" alt="" loading="lazy"></div>`).join("")}</div>
      ${images.length > 1 ? `<button class="slarr sl-prev" onclick="slMov(-1)"><i class="fas fa-chevron-left"></i></button><button class="slarr sl-next" onclick="slMov(1)"><i class="fas fa-chevron-right"></i></button>` : ``}
      ${images.length > 1 ? `<div class="sldots">${images.map((_, i) => `<button class="sldot ${i === 0 ? "on" : ""}" onclick="slTo(${i})"></button>`).join("")}</div>` : ``}
    </div>` : "";

  const courseRows = courses.map(c => {
    const n  = typeof c === "object" ? c.name : c;
    const m  = typeof c === "object" ? c : {};
    const cm = encodeURIComponent(`Hi Mentlify, I want admission in ${n} at ${d.name || ""} (Code: ${d.code || ""})`);
    return `<tr><td><strong>${n}</strong></td><td>${m.duration || "—"}</td><td>${m.fees || "—"}</td><td>${m.eligibility || "—"}</td><td>${m.seats || "—"}</td><td><button class="btn btn-wa btn-sm" onclick="wa('${cm}')"><i class="fab fa-whatsapp"></i></button></td></tr>`;
  }).join("");

  wrap.innerHTML = `
    <button class="det-back" onclick="history.back()"><i class="fas fa-arrow-left"></i> Back</button>
    <div class="det-hero">
      <div class="det-top">
        <div class="det-logo">${images[0] ? `<img src="${images[0]}" alt="">` : `<div class="det-logo-ph">${(d.name || "?")[0].toUpperCase()}</div>`}</div>
        <div class="det-info">
          <h2>${d.name || ""}</h2>
          <div style="opacity:.84;font-size:.82rem;margin-bottom:4px">${d.location || ""}</div>
          <div style="font-size:.84rem">${stars} <strong>${d.rating || 4.5}</strong></div>
          <div class="det-meta">
            <div class="det-tag"><i class="fas fa-school"></i>${d.type || "Institute"}</div>
            ${d.estYear ? `<div class="det-tag"><i class="fas fa-calendar"></i>Est. ${d.estYear}</div>` : ""}
            ${d.code ? `<div class="det-tag"><i class="fas fa-hashtag"></i>${d.code}</div>` : ""}
          </div>
        </div>
      </div>
    </div>
    ${sliderHtml}
    ${d.videoUrl ? `<div class="det-video"><video controls playsinline preload="metadata"><source src="${d.videoUrl}">Your browser does not support video.</video></div>` : ""}
    ${d.description ? `<div class="ds"><h3><i class="fas fa-info-circle"></i> About</h3><p>${d.description}</p></div>` : ""}
    ${facs.length ? `<div class="ds"><h3><i class="fas fa-star"></i> Facilities</h3><div class="fac-pills">${facs.map(f => `<div class="fpill"><i class="fas fa-check-circle"></i>${f}</div>`).join("")}</div></div>` : ""}
    ${courses.length ? `<div class="ds"><h3><i class="fas fa-graduation-cap"></i> Courses &amp; Fees</h3><div style="overflow-x:auto"><table class="ctable"><thead><tr><th>Course</th><th>Duration</th><th>Fees</th><th>Eligibility</th><th>Seats</th><th></th></tr></thead><tbody>${courseRows}</tbody></table></div></div>` : ""}
    ${d.fees ? `<div class="ds"><h3><i class="fas fa-rupee-sign"></i> Fee Info</h3><p>${d.fees}</p></div>` : ""}
    ${d.contact ? `<div class="ds"><h3><i class="fas fa-phone"></i> Contact</h3><p>${d.contact}</p></div>` : ""}
    <div class="det-apply">
      <div><h4>Ready to apply at ${d.name || "this institution"}?</h4><p>Connect instantly on WhatsApp for admission guidance &amp; FREE mentor!</p></div>
      <button class="btn btn-wa" onclick="wa('${applyMsg}')"><i class="fab fa-whatsapp"></i> Book Now on WhatsApp</button>
    </div>`;

  window._slI = 0;
  window._slN = images.length;
}

window.slMov = function (dir) { window._slI = ((window._slI + dir) + window._slN) % window._slN; slTo(window._slI); };
window.slTo  = function (i)   { window._slI = i; const t = document.getElementById("slTrk"); if (t) t.style.transform = `translateX(-${i * 100}%)`; document.querySelectorAll(".sldot").forEach((d, j) => d.classList.toggle("on", j === i)); };

// ══════════════════════════════════════════════════
//  STUDENT LEAD FORM
// ══════════════════════════════════════════════════
window.submitLead = async function () {
  const n = getVal("lName"), p = getVal("lPhone"), c = getVal("lCourse"), b = getVal("lBudget"), ci = getVal("lCity");
  if (!n || !p || !c) { toast("Please fill all required fields", "err"); return; }
  if (p.replace(/\D/g, "").length < 10) { toast("Enter valid 10-digit number", "err"); return; }
  try {
    await addDoc(collection(db, "leads"), {
      name: n, phone: p, course: c, budget: b, city: ci,
      createdAt: serverTimestamp(), status: "new"
    });
    toast("Enquiry submitted! Opening WhatsApp…", "ok");
    const msg = encodeURIComponent(`Name: ${n}\nPhone: ${p}\nCourse: ${c}\nBudget: ${b}\nCity: ${ci}`);
    setTimeout(() => wa(msg), 700);
    ["lName", "lPhone", "lBudget", "lCity"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    document.getElementById("lCourse").value = "";
  } catch (e) { toast("Error: " + e.message, "err"); }
};

// ══════════════════════════════════════════════════
//  ADMIN LOGIN / LOGOUT
// ══════════════════════════════════════════════════
window.doLogin = async function () {
  const email = getVal("aEmail"), pass = getVal("aPass");
  const errEl = document.getElementById("aErr"), btn = document.getElementById("lBtn");
  if (!email || !pass) { errEl.style.display = "block"; errEl.textContent = "Enter email and password."; return; }
  btn.disabled = true; btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Logging in…`;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    toast("Welcome back!", "ok");
    location.hash = "#dashboard";
  } catch (e) {
    errEl.style.display = "block";
    errEl.textContent =
      (e.code === "auth/user-not-found" || e.code === "auth/wrong-password" || e.code === "auth/invalid-credential")
        ? "Invalid email or password."
        : e.code === "auth/too-many-requests"
          ? "Too many attempts. Please try again later."
          : e.message;
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-lock"></i> Login to Dashboard`;
  }
};

window.doLogout = async function () {
  await signOut(auth);
  toast("Logged out", "ok");
  location.hash = "#home";
};

// ══════════════════════════════════════════════════
//  ADMIN DASHBOARD
// ══════════════════════════════════════════════════
function showDash(sec) {
  showView("vDash");
  const emailEl = document.getElementById("dashUserEmail");
  if (emailEl) emailEl.textContent = me?.email || "Admin";
  document.querySelectorAll(".sb-menu a").forEach(a => a.classList.toggle("on", a.dataset.s === sec));
  const titleEl = document.getElementById("dashTitle");
  if (titleEl) titleEl.textContent = sec.charAt(0).toUpperCase() + sec.slice(1);
  const content = document.getElementById("dashContent");
  content.innerHTML = `<div class="loader"><i class="fas fa-circle-notch spin"></i> Loading…</div>`;
  curTab = sec;
  switch (sec) {
    case "overview": renderOverview(content); break;
    case "college":  renderInstTab(content, "college",  "Colleges");         break;
    case "school":   renderInstTab(content, "school",   "Schools");          break;
    case "coaching": renderInstTab(content, "coaching", "Coaching Centers"); break;
    case "teacher":  renderInstTab(content, "teacher",  "Tuition Teachers"); break;
    case "leads":    renderLeads(content);   break;
    default: content.innerHTML = "<p>Section not found.</p>";
  }
}
window.showDash = showDash;

async function renderOverview(c) {
  try {
    const [col, sch, coa, tea, lds] = await Promise.all([
      getDocs(query(collection(db, "institutions"), where("type", "==", "college"))),
      getDocs(query(collection(db, "institutions"), where("type", "==", "school"))),
      getDocs(query(collection(db, "institutions"), where("type", "==", "coaching"))),
      getDocs(query(collection(db, "institutions"), where("type", "==", "teacher"))),
      getDocs(collection(db, "leads")),
    ]);
    c.innerHTML = `<div class="adm-stats">
      <div class="astat"><div class="ai">🏫</div><span class="an">${col.size}</span><div class="al">Colleges</div></div>
      <div class="astat"><div class="ai">🏢</div><span class="an">${sch.size}</span><div class="al">Schools</div></div>
      <div class="astat"><div class="ai">📚</div><span class="an">${coa.size}</span><div class="al">Coaching</div></div>
      <div class="astat"><div class="ai">👩‍🏫</div><span class="an">${tea.size}</span><div class="al">Teachers</div></div>
      <div class="astat"><div class="ai">📥</div><span class="an">${lds.size}</span><div class="al">Leads</div></div>
    </div>
    <div class="adm-tbl-wrap"><div class="adm-tbl-head"><h3><i class="fas fa-bolt"></i> Quick Actions</h3></div>
    <div style="padding:16px;display:flex;flex-wrap:wrap;gap:9px">
      <button class="btn btn-grad btn-sm" onclick="showDash('college')"><i class="fas fa-university"></i> Colleges</button>
      <button class="btn btn-grad btn-sm" onclick="showDash('school')"><i class="fas fa-school"></i> Schools</button>
      <button class="btn btn-grad btn-sm" onclick="showDash('coaching')"><i class="fas fa-chalkboard-teacher"></i> Coaching</button>
      <button class="btn btn-grad btn-sm" onclick="showDash('teacher')"><i class="fas fa-user-tie"></i> Teachers</button>
      <button class="btn btn-grad btn-sm" onclick="showDash('leads')"><i class="fas fa-inbox"></i> Leads</button>
    </div></div>
    <div class="adm-tbl-wrap" style="margin-top:14px"><div class="adm-tbl-head"><h3><i class="fas fa-shield-alt"></i> Firestore Security Rules</h3></div>
    <div style="padding:16px;font-size:.79rem;background:#0f172a;color:#86efac;border-radius:0 0 12px 12px;font-family:monospace;line-height:1.7;overflow-x:auto">
rules_version = '2';<br>service cloud.firestore {<br>&nbsp;&nbsp;match /databases/{db}/documents {<br>&nbsp;&nbsp;&nbsp;&nbsp;match /institutions/{doc} {<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow read: if true;<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow write: if request.auth != null;<br>&nbsp;&nbsp;&nbsp;&nbsp;}<br>&nbsp;&nbsp;&nbsp;&nbsp;match /leads/{doc} {<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow read: if request.auth != null;<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow create: if true;<br>&nbsp;&nbsp;&nbsp;&nbsp;}<br>&nbsp;&nbsp;}<br>}
    </div></div>`;
  } catch (e) { c.innerHTML = `<p style="color:red">Error: ${e.message}</p>`; }
}

async function renderInstTab(c, type, title) {
  try {
    const snap  = await getDocs(query(collection(db, "institutions"), where("type", "==", type), orderBy("createdAt", "desc")));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    c.innerHTML = `<div class="adm-tbl-wrap">
      <div class="adm-tbl-head">
        <h3><i class="fas fa-list"></i> ${title} (${items.length})</h3>
        <button class="btn btn-grad btn-sm" onclick="openAddModal('${type}')"><i class="fas fa-plus"></i> Add New</button>
      </div>
      <div class="tbl-scroll"><table class="atbl">
        <thead><tr><th>Logo</th><th>Name</th><th>Location</th><th>Code</th><th>Featured</th><th>Actions</th></tr></thead>
        <tbody>${items.length ? items.map(it => {
          const img = (it.images || [])[0] || "";
          return `<tr>
            <td>${img
              ? `<img class="tbl-logo" src="${img}" alt="">`
              : `<div class="tbl-logo-ph">${(it.name || "?")[0].toUpperCase()}</div>`}</td>
            <td><div class="tbl-name">${it.name || ""}</div></td>
            <td>${it.location || ""}</td>
            <td><span class="icard-code">${it.code || ""}</span></td>
            <td>${it.featured ? `<span class="f-yes">★ Yes</span>` : `<span class="f-no">No</span>`}</td>
            <td><div class="tact">
              <button class="btn-edit" onclick="openEditModal('${it.id}')"><i class="fas fa-pen"></i> Edit</button>
              <button class="btn-del"  onclick="delInst('${it.id}','${type}')"><i class="fas fa-trash"></i></button>
            </div></td>
          </tr>`;
        }).join("") : `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--faint)">No ${title} yet. Click "Add New" to start.</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
  } catch (e) { c.innerHTML = `<p style="color:red">Error: ${e.message}</p>`; }
}

async function renderLeads(c) {
  try {
    const snap  = await getDocs(query(collection(db, "leads"), orderBy("createdAt", "desc"), limit(150)));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    c.innerHTML = `<div class="adm-tbl-wrap">
      <div class="adm-tbl-head"><h3><i class="fas fa-inbox"></i> Student Leads (${items.length})</h3></div>
      <div class="tbl-scroll"><table class="atbl">
        <thead><tr><th>Name</th><th>Phone</th><th>Course</th><th>Budget</th><th>City</th><th>Date</th><th>Action</th></tr></thead>
        <tbody>${items.length ? items.map(l => {
          const dt  = l.createdAt?.toDate?.();
          const ds  = dt ? dt.toLocaleDateString("en-IN") : "—";
          const msg = encodeURIComponent(`Hi ${l.name || ""}, this is Mentlify. You enquired about ${l.course || ""}. How can we assist?`);
          return `<tr>
            <td><strong>${l.name || ""}</strong></td><td>${l.phone || ""}</td><td>${l.course || ""}</td>
            <td>${l.budget || "—"}</td><td>${l.city || "—"}</td><td>${ds}</td>
            <td><button class="btn btn-wa btn-sm" onclick="wa('${msg}')"><i class="fab fa-whatsapp"></i></button></td>
          </tr>`;
        }).join("") : `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--faint)">No leads yet.</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
  } catch (e) { c.innerHTML = `<p style="color:red">Error: ${e.message}</p>`; }
}

// ══════════════════════════════════════════════════
//  INSTITUTION ADD / EDIT FORM
// ══════════════════════════════════════════════════
let fMode = "add", fDocId = null, fType = "", existImgs = [], selImgs = [], selVid = null;

function openAddModal(type) {
  fMode = "add"; fDocId = null; fType = type;
  existImgs = []; selImgs = []; selVid = null;
  resetForm(); setVal("fType", type);
  document.getElementById("modalTitle").textContent = "Add " + cap(type);
  document.getElementById("fOverlay").classList.add("open");
}
window.openAddModal = openAddModal;

window.openEditModal = async function (id) {
  try {
    const snap = await getDoc(doc(db, "institutions", id));
    if (!snap.exists()) { toast("Not found", "err"); return; }
    const d = snap.data();
    fMode = "edit"; fDocId = id; fType = d.type || "college";
    existImgs = d.images || []; selImgs = []; selVid = null;
    resetForm();
    setVal("fName",      d.name        || "");
    setVal("fType",      d.type        || "college");
    setVal("fLocation",  d.location    || "");
    setVal("fCode",      d.code        || "");
    setVal("fRating",    d.rating      || "");
    setVal("fEstYear",   d.estYear     || "");
    setVal("fDesc",      d.description || "");
    setVal("fFacilities",d.facilities  || "");
    setVal("fFees",      d.fees        || "");
    setVal("fContact",   d.contact     || "");
    setVal("fRevCount",  d.reviewCount || "");
    const fc = document.getElementById("fFeatured"); if (fc) fc.checked = !!d.featured;
    setVal("fCourses",   (d.courses || []).map(c => typeof c === "object" ? JSON.stringify(c) : c).join("\n") || "");
    refreshExistImgs();
    document.getElementById("modalTitle").textContent = "Edit — " + (d.name || "");
    document.getElementById("fOverlay").classList.add("open");
  } catch (e) { toast(e.message, "err"); }
};

function refreshExistImgs() {
  const ew = document.getElementById("exImgWrap");
  if (!ew) return;
  ew.innerHTML = existImgs.map((u, i) => `<div class="pitem"><img src="${u}" alt=""><button class="p-rm" onclick="rmExImg(${i})">×</button></div>`).join("");
}

window.rmExImg  = function (i) { existImgs.splice(i, 1); refreshExistImgs(); };
window.closeModal = function () { document.getElementById("fOverlay").classList.remove("open"); };

function resetForm() {
  document.getElementById("instFrm").reset();
  document.getElementById("imgPrvs").innerHTML   = "";
  document.getElementById("exImgWrap").innerHTML = "";
  document.getElementById("vPrv").style.display  = "none";
  document.getElementById("progWrap").style.display = "none";
}

// Wire up file inputs after DOM loads
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("fImgs").addEventListener("change", function () {
    selImgs = [...selImgs, ...Array.from(this.files)];
    const pw = document.getElementById("imgPrvs");
    Array.from(this.files).forEach(f => {
      const rd = new FileReader();
      rd.onload = e => {
        const div = document.createElement("div"); div.className = "pitem";
        div.innerHTML = `<img src="${e.target.result}" alt=""><button class="p-rm" onclick="this.parentElement.remove()">×</button>`;
        pw.appendChild(div);
      };
      rd.readAsDataURL(f);
    });
  });
  document.getElementById("fVid").addEventListener("change", function () {
    selVid = this.files[0];
    if (selVid) { const p = document.getElementById("vPrv"); p.src = URL.createObjectURL(selVid); p.style.display = "block"; }
  });
});

function parseCourses(raw) {
  return raw.split("\n").map(l => {
    l = l.trim(); if (!l) return null;
    try { return JSON.parse(l); } catch (_) { return { name: l, duration: "", fees: "", eligibility: "", seats: "" }; }
  }).filter(Boolean);
}
async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "mentlify_upload");

  const res = await fetch("https://api.cloudinary.com/v1_1/deiqcdps2/image/upload", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.secure_url;
}
async function uploadVideo(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "mentlify_upload");

  const res = await fetch("https://api.cloudinary.com/v1_1/deiqcdps2/video/upload", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.secure_url;
}

window.saveInst = async function () {
  const name = getVal("fName"), type = getVal("fType");
  if (!name || !type) { toast("Name and type are required", "err"); return; }
  const sb = document.getElementById("saveBtn");
  sb.disabled = true; sb.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Saving…`;
  const pw = document.getElementById("progWrap"), pf = document.getElementById("pFill"), pl = document.getElementById("pLbl");
  try {
    // Upload images to Cloudinary
let newImgURLs = [];

if (selImgs.length) {
  for (let i = 0; i < selImgs.length; i++) {
    const f = selImgs[i];
    const url = await uploadImage(f);
    newImgURLs.push(url);
  }
}

    // Upload video to Cloudinary
let videoUrl = "";

if (fMode === "edit" && fDocId) {
  const existing = await getDoc(doc(db, "institutions", fDocId));
  videoUrl = existing.data()?.videoUrl || "";
}

if (selVid) {
  videoUrl = await uploadVideo(selVid);
}

    pw.style.display = "none";

    const allImgs = [...existImgs, ...newImgURLs];
    const data = {
      name:        getVal("fName"),
      type:        getVal("fType"),
      location:    getVal("fLocation"),
      code:        getVal("fCode") || genCode(),
      rating:      parseFloat(getVal("fRating")) || 4.5,
      estYear:     getVal("fEstYear"),
      description: getVal("fDesc"),
      facilities:  getVal("fFacilities"),
      fees:        getVal("fFees"),
      contact:     getVal("fContact"),
      reviewCount: getVal("fRevCount"),
      featured:    document.getElementById("fFeatured").checked,
      images:      allImgs,
      videoUrl,
      courses:     parseCourses(getVal("fCourses")),
    };

    if (fMode === "add") {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "institutions"), data);
      toast("Institution added!", "ok");
    } else {
      data.updatedAt = serverTimestamp();
      await updateDoc(doc(db, "institutions", fDocId), data);
      toast("Institution updated!", "ok");
    }

    window.closeModal();
    showDash(data.type);
    if (document.getElementById("vHome")?.classList.contains("on")) loadHomeFeatured();

  } catch (e) {
    toast("Error: " + e.message, "err");
    console.error(e);
  } finally {
    sb.disabled = false;
    sb.innerHTML = `<i class="fas fa-save"></i> Save`;
  }
};

window.delInst = async function (id, type) {
  if (!confirm("Delete this institution? This cannot be undone.")) return;
  try {
    await deleteDoc(doc(db, "institutions", id));
    toast("Deleted", "ok");
    showDash(type);
  } catch (e) { toast(e.message, "err"); }
};

// ══════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════
function getVal(id) { const el = document.getElementById(id); return el ? (el.type === "checkbox" ? el.checked : el.value || "") : ""; }
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function genCode() { return "MENT" + Math.floor(100 + Math.random() * 900); }

// ══════════════════════════════════════════════════
//  COUNTER ANIMATION
// ══════════════════════════════════════════════════
function animCounters() {
  document.querySelectorAll(".stat-n[data-t]").forEach(el => {
    const tgt = parseInt(el.dataset.t); let c = 0; const step = tgt / (1800 / 16);
    const t = setInterval(() => {
      c = Math.min(c + step, tgt);
      el.textContent = tgt >= 1000 ? Math.floor(c).toLocaleString() + "+" : Math.floor(c) + (tgt > 5 ? "+" : "");
      if (c >= tgt) clearInterval(t);
    }, 16);
  });
}
const statsSec = document.querySelector(".stats-sec");
if (statsSec) new IntersectionObserver(ens => ens.forEach(e => { if (e.isIntersecting) animCounters(); }), { threshold: 0.3 }).observe(statsSec);
