import { useState, useEffect, useRef } from "react";
import { auth as authAPI, samples as samplesAPI, biobanks as biobanksAPI, requests as requestsAPI, favorites as favoritesAPI, messages as messagesAPI, threads as threadsAPI, supabase } from "./lib/supabase";

// ── Mock Data ──────────────────────────────────────────────
const BIOBANKS_DATA = [
  { id: "bb1", name: "NordicBio Repository", location: "Stockholm, Sweden", rating: 4.8, samples: 12400, specialties: ["Oncology", "Neurology"], verified: true, bio: "Leading Nordic biobank specializing in oncology and neurological specimen collection since 2008.", contact: "info@nordicbio.se", certifications: ["ISO 20387", "CAP Accredited"], founded: "2008", responseTime: "< 24h", reviews: 47 },
  { id: "bb2", name: "Pacific Tissue Collective", location: "San Francisco, USA", rating: 4.6, samples: 8900, specialties: ["Cardiology", "Immunology"], verified: true, bio: "West Coast tissue repository focused on cardiovascular and autoimmune disease research.", contact: "samples@pacifictissue.org", certifications: ["ISO 20387"], founded: "2012", responseTime: "< 48h", reviews: 31 },
  { id: "bb3", name: "Berlin BioBank Alliance", location: "Berlin, Germany", rating: 4.9, samples: 21000, specialties: ["Oncology", "Rare Disease"], verified: true, bio: "Germany's premier biobank network with the largest rare disease specimen catalog in Europe.", contact: "research@berlinbba.de", certifications: ["ISO 20387", "ISBER Best Practices"], founded: "2005", responseTime: "< 24h", reviews: 63 },
  { id: "bb4", name: "Tokyo Life Sciences Bank", location: "Tokyo, Japan", rating: 4.7, samples: 15600, specialties: ["Genomics", "Neurology"], verified: true, bio: "Asia-Pacific genomics-focused biorepository with deep neurological disease collections.", contact: "tlsb@tokyolife.jp", certifications: ["ISO 20387"], founded: "2010", responseTime: "< 36h", reviews: 38 },
  { id: "bb5", name: "Maple Leaf Biorepository", location: "Toronto, Canada", rating: 4.5, samples: 6700, specialties: ["Immunology", "Infectious Disease"], verified: false, bio: "Canadian biobank specializing in infectious disease and immunological research specimens.", contact: "info@mapleleafbio.ca", certifications: ["ISBER Best Practices"], founded: "2015", responseTime: "< 48h", reviews: 19 },
];

const SAMPLES_DATA = [
  { id: "s1", biobankId: "bb1", type: "Tissue", subtype: "FFPE", disease: "Breast Cancer", organ: "Breast", preservation: "Formalin-Fixed", quantity: 340, unit: "blocks", price: 85, consent: "Broad Research", matchedData: ["Clinical", "Genomic"], availability: "In Stock" },
  { id: "s2", biobankId: "bb1", type: "Blood", subtype: "Serum", disease: "Alzheimer's Disease", organ: "Brain", preservation: "Frozen -80°C", quantity: 1200, unit: "aliquots", price: 45, consent: "Disease-Specific", matchedData: ["Clinical"], availability: "In Stock" },
  { id: "s3", biobankId: "bb2", type: "Tissue", subtype: "Fresh Frozen", disease: "Myocardial Infarction", organ: "Heart", preservation: "Frozen -80°C", quantity: 89, unit: "specimens", price: 150, consent: "Broad Research", matchedData: ["Clinical", "Imaging"], availability: "Limited" },
  { id: "s4", biobankId: "bb3", type: "DNA", subtype: "Genomic DNA", disease: "Colorectal Cancer", organ: "Colon", preservation: "Frozen -20°C", quantity: 560, unit: "samples", price: 120, consent: "Broad Research", matchedData: ["Clinical", "Genomic", "Proteomic"], availability: "In Stock" },
  { id: "s5", biobankId: "bb3", type: "Tissue", subtype: "FFPE", disease: "Huntington's Disease", organ: "Brain", preservation: "Formalin-Fixed", quantity: 45, unit: "blocks", price: 200, consent: "Disease-Specific", matchedData: ["Clinical", "Genomic"], availability: "Limited" },
  { id: "s6", biobankId: "bb4", type: "Blood", subtype: "Plasma", disease: "Parkinson's Disease", organ: "Brain", preservation: "Frozen -80°C", quantity: 890, unit: "aliquots", price: 55, consent: "Broad Research", matchedData: ["Clinical"], availability: "In Stock" },
  { id: "s7", biobankId: "bb4", type: "RNA", subtype: "Total RNA", disease: "Glioblastoma", organ: "Brain", preservation: "Frozen -80°C", quantity: 210, unit: "samples", price: 175, consent: "Broad Research", matchedData: ["Clinical", "Genomic"], availability: "In Stock" },
  { id: "s8", biobankId: "bb5", type: "Tissue", subtype: "Fresh Frozen", disease: "Lupus", organ: "Kidney", preservation: "Frozen -80°C", quantity: 120, unit: "specimens", price: 130, consent: "Disease-Specific", matchedData: ["Clinical", "Immunological"], availability: "In Stock" },
  { id: "s9", biobankId: "bb2", type: "Blood", subtype: "Whole Blood", disease: "Rheumatoid Arthritis", organ: "Systemic", preservation: "EDTA", quantity: 450, unit: "tubes", price: 35, consent: "Broad Research", matchedData: ["Clinical", "Immunological"], availability: "In Stock" },
  { id: "s10", biobankId: "bb1", type: "DNA", subtype: "cfDNA", disease: "Lung Cancer", organ: "Lung", preservation: "Frozen -20°C", quantity: 180, unit: "samples", price: 250, consent: "Broad Research", matchedData: ["Clinical", "Genomic"], availability: "Limited" },
];

const MESSAGES_DATA = [
  { id: "m1", threadId: "t1", from: "researcher", fromName: "Dr. Sarah Chen", text: "Hi, I'm interested in 20 FFPE blocks for our HER2+ breast cancer IHC study. Could you confirm the fixation time?", time: "Mar 20, 09:14" },
  { id: "m2", threadId: "t1", from: "biobank", fromName: "NordicBio Repository", text: "Hello Dr. Chen! Yes, fixation time is 24-48 hours in 10% NBF. All blocks are from surgical resections. Shall I prepare a quote?", time: "Mar 20, 11:30" },
  { id: "m3", threadId: "t1", from: "researcher", fromName: "Dr. Sarah Chen", text: "That's perfect. Yes please, and could you include the associated clinical data?", time: "Mar 20, 14:05" },
  { id: "m4", threadId: "t2", from: "researcher", fromName: "Prof. James Okafor", text: "We need 50 colorectal cancer gDNA samples for WES. What's the average concentration and purity?", time: "Mar 18, 08:22" },
  { id: "m5", threadId: "t2", from: "biobank", fromName: "Berlin BioBank Alliance", text: "Prof. Okafor, average concentration is 50ng/uL with A260/280 ratios of 1.8-2.0. All samples have matched clinical and proteomic data. MTA has been approved.", time: "Mar 18, 13:45" },
];

const THREADS_DATA = [
  { id: "t1", researcherId: "u1", biobankId: "bb1", sampleId: "s1", status: "active", lastMessage: "That's perfect. Yes please...", lastDate: "Mar 20" },
  { id: "t2", researcherId: "u2", biobankId: "bb3", sampleId: "s4", status: "active", lastMessage: "MTA has been approved.", lastDate: "Mar 18" },
];

const REQUESTS_DATA = [
  { id: "r1", researcher: "Dr. Sarah Chen", institution: "MIT", sampleId: "s1", quantity: 20, status: "pending", date: "2026-03-20", message: "Need FFPE blocks for IHC staining study on HER2+ breast cancer.", threadId: "t1" },
  { id: "r2", researcher: "Prof. James Okafor", institution: "UCL", sampleId: "s4", quantity: 50, status: "approved", date: "2026-03-18", message: "Genomic DNA for whole-exome sequencing in colorectal cancer cohort.", threadId: "t2" },
  { id: "r3", researcher: "Dr. Yuki Tanaka", institution: "Kyoto University", sampleId: "s7", quantity: 15, status: "pending", date: "2026-03-22", message: "RNA-seq analysis of GBM tumor microenvironment.", threadId: null },
];

const MY_REQUESTS = [
  { id: "mr1", sampleId: "s1", biobankId: "bb1", quantity: 20, status: "pending", date: "2026-03-20" },
  { id: "mr2", sampleId: "s4", biobankId: "bb3", quantity: 50, status: "approved", date: "2026-03-18" },
  { id: "mr3", sampleId: "s6", biobankId: "bb4", quantity: 100, status: "shipped", date: "2026-03-10" },
  { id: "mr4", sampleId: "s8", biobankId: "bb5", quantity: 30, status: "rejected", date: "2026-03-05" },
  { id: "mr5", sampleId: "s3", biobankId: "bb2", quantity: 10, status: "delivered", date: "2026-02-28" },
];

const statusColors = { pending: "#f59e0b", approved: "#00e5a0", shipped: "#3b82f6", delivered: "#10b981", rejected: "#ef4444" };
const statusLabels = { pending: "Pending", approved: "Approved", shipped: "Shipped", delivered: "Delivered", rejected: "Declined" };

// ── Icons (SVG components) ─────────────────────────────────
const mkI = (d, w = 18) => <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const I = {
  search: mkI(<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>),
  flask: mkI(<><path d="M9 3h6M10 3v6.5L4 18a1 1 0 0 0 .87 1.5h14.26A1 1 0 0 0 20 18l-6-8.5V3"/></>),
  bank: mkI(<><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M12 11v4M8 11v4M16 11v4"/></>),
  check: mkI(<><polyline points="20 6 9 17 4 12"/></>, 14),
  star: <svg width="14" height="14" viewBox="0 0 24 24" fill="#00e5a0" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  cart: mkI(<><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>),
  dna: mkI(<><path d="M2 15c6.667-6 13.333 0 20-6M2 9c6.667 6 13.333 0 20 6"/><path d="M7 21V3M17 21V3"/></>, 20),
  close: mkI(<><path d="M18 6L6 18M6 6l12 12"/></>),
  inbox: mkI(<><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>),
  chart: mkI(<><path d="M18 20V10M12 20V4M6 20v-6"/></>),
  send: mkI(<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>, 16),
  msg: mkI(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>),
  user: mkI(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>),
  lock: mkI(<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>),
  plus: mkI(<><path d="M12 5v14M5 12h14"/></>),
  edit: mkI(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>, 16),
  back: mkI(<><path d="M19 12H5M12 19l-7-7 7-7"/></>),
  shield: mkI(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>),
  globe: mkI(<><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>, 16),
  logout: mkI(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>),
  checkCircle: mkI(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>),
  heart: (f) => <svg width="16" height="16" viewBox="0 0 24 24" fill={f?"#ef4444":"none"} stroke={f?"#ef4444":"currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  sliders: mkI(<><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></>, 16),
  list: mkI(<><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>, 16),
  award: mkI(<><circle cx="12" cy="8" r="7"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/></>),
  mapPin: mkI(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>, 16),
  clock: mkI(<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>, 16),
};

// ── Theme ──────────────────────────────────────────────────
const T = {
  bg: "#0a0e17", surface: "#111827", surfaceLight: "#1a2236",
  border: "#1e293b", borderLight: "#2a3a52",
  text: "#e2e8f0", textMuted: "#8892a8",
  accent: "#00e5a0", accentDim: "rgba(0,229,160,0.1)", accentGlow: "rgba(0,229,160,0.25)",
  warning: "#f59e0b", danger: "#ef4444", info: "#3b82f6",
};
const typeColors = { Tissue: "#8b5cf6", Blood: "#ef4444", DNA: "#3b82f6", RNA: "#f59e0b" };

// ── Shared Styles ──────────────────────────────────────────
const btnP = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 20px", borderRadius: 8, border: "none", background: T.accent, color: T.bg, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s" };
const btnS = { ...btnP, background: "transparent", color: T.accent, border: `1px solid ${T.accent}` };
const btnG = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: "transparent", color: T.textMuted, fontSize: 13, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s" };
const crd = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, transition: "border-color 0.2s" };
const inp = { padding: "12px 16px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surfaceLight, color: T.text, fontSize: 14, outline: "none", fontFamily: "inherit" };
const tg = { display: "inline-block", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: T.surfaceLight, color: T.textMuted };
const cl = { padding: "12px 16px" };
const lb = { fontSize: 12, color: T.textMuted, marginBottom: 6, display: "block", fontWeight: 500, letterSpacing: "0.5px" };

const Chip = ({items, selected, onSelect, multi}) => (
  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
    {items.map(item => {
      const a = multi ? selected.includes(item) : selected === item;
      return <button key={item} onClick={() => onSelect(item)} style={{padding:"7px 13px",borderRadius:8,border:`1px solid ${a?T.accent:T.border}`,background:a?T.accentDim:"transparent",color:a?T.accent:T.textMuted,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>{item}</button>;
    })}
  </div>
);

// ── Main App ───────────────────────────────────────────────
export default function BioVault() {
  const [view, setView] = useState("landing");
  const [fadeIn, setFadeIn] = useState(true);
  const [user, setUser] = useState(null);
  const [samples, setSamples] = useState(SAMPLES_DATA);
  const [messages, setMessages] = useState(MESSAGES_DATA);
  const [threads] = useState(THREADS_DATA);
  const [requests, setRequests] = useState(REQUESTS_DATA);
  const [favorites, setFavorites] = useState([]);
  const [viewBiobank, setViewBiobank] = useState(null);
  const [dbReady, setDbReady] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const profile = await authAPI.getProfile();
          if (profile) setUser(profile);
        } catch (e) { console.log("Profile fetch error:", e); }
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load samples from Supabase
  useEffect(() => {
    samplesAPI.list().then(data => {
      if (data && data.length > 0) {
        // Map Supabase data to our format
        const mapped = data.map(s => ({
          id: s.id,
          biobankId: s.biobank_id,
          type: s.type,
          subtype: s.subtype,
          disease: s.disease,
          organ: s.organ,
          preservation: s.preservation,
          quantity: s.quantity,
          unit: s.unit,
          price: Number(s.price),
          consent: s.consent,
          matchedData: s.matched_data || [],
          availability: s.availability,
          // Attach biobank info if joined
          _biobank: s.biobanks || null,
        }));
        setSamples(mapped);
        setDbReady(true);
      }
    }).catch(() => {
      console.log("Using mock data (Supabase not connected yet)");
    });
  }, []);

  // Load favorites when user logs in
  useEffect(() => {
    if (user && dbReady) {
      favoritesAPI.list().then(data => {
        if (data) setFavorites(data.map(f => f.sample_id));
      }).catch(() => {});
    }
  }, [user, dbReady]);

  const nav = (v) => { setFadeIn(false); setTimeout(() => { setView(v); setFadeIn(true); window.scrollTo(0, 0); }, 200); };

  const login = (u) => { setUser(u); nav(u.role === "researcher" ? "researcher" : "biobank"); };

  const logout = () => {
    authAPI.signOut().catch(() => {});
    setUser(null);
    nav("landing");
  };

  const toggleFav = (id) => {
    setFavorites(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
    if (user) { favoritesAPI.toggle(id).catch(() => {}); }
  };

  const openBB = (bb) => { setViewBiobank(bb); nav("biobankProfile"); };

  return (
    <div style={{ background: T.bg, color: T.text, minHeight: "100vh", fontFamily: "'JetBrains Mono','SF Mono',monospace", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:${T.bg}} ::-webkit-scrollbar-thumb{background:${T.borderLight};border-radius:3px}
        ::selection{background:${T.accentGlow};color:${T.accent}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px ${T.accentGlow}}50%{box-shadow:0 0 40px ${T.accentGlow},0 0 60px rgba(0,229,160,0.1)}}
        @keyframes gridMove{from{transform:translateY(0)}to{transform:translateY(40px)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        input,textarea,select{font-family:inherit} input::placeholder,textarea::placeholder{color:${T.textMuted};opacity:0.6}
        input[type=range]{-webkit-appearance:none;background:${T.border};height:4px;border-radius:2px;outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${T.accent};cursor:pointer}
      `}</style>
      <div style={{ position: "fixed", inset: 0, opacity: 0.03, backgroundImage: `linear-gradient(${T.accent} 1px,transparent 1px),linear-gradient(90deg,${T.accent} 1px,transparent 1px)`, backgroundSize: "40px 40px", animation: "gridMove 8s linear infinite", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1, opacity: fadeIn ? 1 : 0, transition: "opacity 0.2s ease" }}>
        {view === "landing" && <Landing onNav={nav} user={user} logout={logout} />}
        {view === "auth" && <AuthScreen onLogin={login} onNav={nav} />}
        {view === "researcher" && <ResearcherView onNav={nav} user={user} logout={logout} samples={samples} messages={messages} setMessages={setMessages} threads={threads} favorites={favorites} toggleFav={toggleFav} openBB={openBB} />}
        {view === "biobank" && <BiobankDash onNav={nav} user={user} logout={logout} samples={samples} setSamples={setSamples} requests={requests} setRequests={setRequests} messages={messages} setMessages={setMessages} threads={threads} />}
        {view === "profile" && <ProfilePage onNav={nav} user={user} logout={logout} />}
        {view === "biobankProfile" && viewBiobank && <BBProfile onNav={nav} user={user} logout={logout} bb={viewBiobank} samples={samples} favorites={favorites} toggleFav={toggleFav} />}
      </div>
    </div>
  );
}

// ── NavBar ─────────────────────────────────────────────────
function NavBar({ onNav, user, logout, extra }) {
  return (
    <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${T.border}`, backdropFilter: "blur(12px)", background: "rgba(10,14,23,0.85)", position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => onNav("landing")}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg,${T.accent},#00b880)`, display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0e17" strokeWidth="2.5"><path d="M2 15c6.667-6 13.333 0 20-6M2 9c6.667 6 13.333 0 20 6"/><path d="M7 21V3M17 21V3"/></svg></div>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700 }}>Bio<span style={{ color: T.accent }}>Vault</span></span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {extra}
        {user ? (
          <>
            <button onClick={() => onNav("profile")} style={{ ...btnG, gap: 5 }}>{I.user}<span style={{ fontSize: 12 }}>{user.name.split(" ")[0]}</span></button>
            <button onClick={logout} style={{ ...btnG, color: T.danger }}>{I.logout}</button>
          </>
        ) : (
          <button onClick={() => onNav("auth")} style={{ ...btnP, padding: "8px 18px" }}>{I.lock}<span style={{ marginLeft: 4 }}>Sign In</span></button>
        )}
      </div>
    </nav>
  );
}

// ── Landing ────────────────────────────────────────────────
function Landing({ onNav, user, logout }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <NavBar onNav={onNav} user={user} logout={logout} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
        <div style={{ animation: loaded ? "slideUp 0.6s ease forwards" : "none", opacity: loaded ? 1 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32, justifyContent: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg,${T.accent},#00b880)`, display: "flex", alignItems: "center", justifyContent: "center", animation: "glow 3s ease-in-out infinite" }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0a0e17" strokeWidth="2"><path d="M2 15c6.667-6 13.333 0 20-6M2 9c6.667 6 13.333 0 20 6"/><path d="M7 21V3M17 21V3"/></svg></div>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 42, fontWeight: 700, letterSpacing: "-1px" }}>Bio<span style={{ color: T.accent }}>Vault</span></span>
          </div>
        </div>
        <div style={{ animation: loaded ? "slideUp 0.8s ease forwards" : "none", opacity: loaded ? 1 : 0 }}>
          <p style={{ fontSize: 13, color: T.accent, letterSpacing: 4, textTransform: "uppercase", marginBottom: 16, fontWeight: 500 }}>The Biospecimen Marketplace</p>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(26px,5vw,48px)", fontWeight: 300, lineHeight: 1.2, maxWidth: 620, marginBottom: 16 }}>Connect researchers with <span style={{ color: T.accent, fontWeight: 600 }}>biological samples</span> worldwide</h1>
          <p style={{ color: T.textMuted, fontSize: 14, maxWidth: 460, margin: "0 auto 48px", lineHeight: 1.7 }}>Search biobank inventories, request samples, and manage compliance — all in one platform.</p>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", animation: loaded ? "slideUp 1s ease forwards" : "none", opacity: loaded ? 1 : 0 }}>
          <button onClick={() => onNav(user ? "researcher" : "auth")} style={{ ...btnP, padding: "16px 32px", fontSize: 15 }}>{I.search}<span style={{ marginLeft: 8 }}>Find Samples</span></button>
          <button onClick={() => onNav(user ? "biobank" : "auth")} style={{ ...btnS, padding: "16px 32px", fontSize: 15 }}>{I.bank}<span style={{ marginLeft: 8 }}>Biobank Dashboard</span></button>
        </div>
        <div style={{ display: "flex", gap: 48, marginTop: 64, animation: loaded ? "slideUp 1.2s ease forwards" : "none", opacity: loaded ? 1 : 0, flexWrap: "wrap", justifyContent: "center" }}>
          {[{ v: "64,600+", l: "Samples Listed" }, { v: "5", l: "Partner Biobanks" }, { v: "12", l: "Disease Areas" }].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, color: T.accent }}>{s.v}</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Auth Screen ────────────────────────────────────────────
function AuthScreen({ onLogin, onNav }) {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("researcher");
  const [form, setForm] = useState({ name: "", email: "", password: "", institution: "", biobankName: "", location: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  const submit = async () => {
    setError("");
    if (!form.email || !form.password) return setError("Email and password are required.");
    if (mode === "signup" && !form.name) return setError("Name is required.");
    if (mode === "signup" && role === "researcher" && !form.institution) return setError("Institution is required.");
    if (mode === "signup" && role === "biobank" && !form.biobankName) return setError("Biobank name is required.");
    setLoading(true);
    try {
      if (mode === "signup") {
        await authAPI.signUp({
          email: form.email,
          password: form.password,
          name: form.name,
          role,
          institution: form.institution,
          biobankName: form.biobankName,
          location: form.location,
        });
        // Profile is auto-created by the DB trigger
        const profile = await authAPI.getProfile();
        onLogin(profile || { id: "new", name: form.name, email: form.email, role, institution: form.institution, joined: "March 2026" });
      } else {
        await authAPI.signIn({ email: form.email, password: form.password });
        const profile = await authAPI.getProfile();
        if (profile) {
          onLogin(profile);
        } else {
          setError("Could not load profile. Try again.");
        }
      }
    } catch (e) {
      setError(e.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <NavBar onNav={onNav} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ ...crd, maxWidth: 440, width: "100%", padding: 36, animation: "slideUp 0.5s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, justifyContent: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${T.accent},#00b880)`, display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0e17" strokeWidth="2.5"><path d="M2 15c6.667-6 13.333 0 20-6M2 9c6.667 6 13.333 0 20 6"/><path d="M7 21V3M17 21V3"/></svg></div>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700 }}>Bio<span style={{ color: T.accent }}>Vault</span></span>
          </div>

          <div style={{ display: "flex", marginBottom: 24, borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}` }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} style={{ flex: 1, padding: "12px 0", border: "none", background: mode === m ? T.accentDim : "transparent", color: mode === m ? T.accent : T.textMuted, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s" }}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={lb}>I am a...</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ id: "researcher", icon: I.flask, text: "Researcher" }, { id: "biobank", icon: I.bank, text: "Biobank" }].map(r => (
                <button key={r.id} onClick={() => setRole(r.id)} style={{ flex: 1, padding: "14px 12px", borderRadius: 8, border: `1px solid ${role === r.id ? T.accent : T.border}`, background: role === r.id ? T.accentDim : "transparent", color: role === r.id ? T.accent : T.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s", fontWeight: role === r.id ? 600 : 400 }}>
                  {r.icon} {r.text}
                </button>
              ))}
            </div>
          </div>

          {mode === "signup" && <div style={{ marginBottom: 14 }}><label style={lb}>Full Name *</label><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Dr. Jane Smith" style={{ ...inp, width: "100%" }} /></div>}
          <div style={{ marginBottom: 14 }}><label style={lb}>Email *</label><input value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@institution.edu" type="email" style={{ ...inp, width: "100%" }} /></div>
          <div style={{ marginBottom: 14 }}><label style={lb}>Password *</label><input value={form.password} onChange={e => set("password", e.target.value)} placeholder="••••••••" type="password" style={{ ...inp, width: "100%" }} /></div>

          {mode === "signup" && role === "researcher" && <div style={{ marginBottom: 14 }}><label style={lb}>Institution *</label><input value={form.institution} onChange={e => set("institution", e.target.value)} placeholder="MIT, Harvard, etc." style={{ ...inp, width: "100%" }} /></div>}
          {mode === "signup" && role === "biobank" && (
            <>
              <div style={{ marginBottom: 14 }}><label style={lb}>Biobank Name *</label><input value={form.biobankName} onChange={e => set("biobankName", e.target.value)} placeholder="Your Biobank Name" style={{ ...inp, width: "100%" }} /></div>
              <div style={{ marginBottom: 14 }}><label style={lb}>Location</label><input value={form.location} onChange={e => set("location", e.target.value)} placeholder="City, Country" style={{ ...inp, width: "100%" }} /></div>
            </>
          )}

          {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: T.danger, fontSize: 13, marginBottom: 14 }}>{error}</div>}

          <button onClick={submit} disabled={loading} style={{ ...btnP, width: "100%", padding: "14px 0", fontSize: 14, marginTop: 4, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Authenticating..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
          {mode === "login" && <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: T.textMuted }}>Demo: enter any email & password to explore</p>}
        </div>
      </div>
    </div>
  );
}

// ── Researcher View ────────────────────────────────────────
function ResearcherView({ onNav, user, logout, samples, messages, setMessages, threads, favorites, toggleFav, openBB }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedSample, setSelectedSample] = useState(null);
  const [showRequest, setShowRequest] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [cart, setCart] = useState([]);
  const [requestSent, setRequestSent] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 300]);
  const [presFilter, setPresFilter] = useState([]);
  const [dataFilter, setDataFilter] = useState([]);

  const types = ["All", "Tissue", "Blood", "DNA", "RNA"];
  const preservations = ["Formalin-Fixed", "Frozen -80°C", "Frozen -20°C", "EDTA"];
  const dataTypes = ["Clinical", "Genomic", "Proteomic", "Imaging", "Immunological"];

  const filtered = samples.filter(s => {
    const mS = search === "" || [s.disease, s.organ, s.subtype, s.type].some(f => f.toLowerCase().includes(search.toLowerCase()));
    const mT = typeFilter === "All" || s.type === typeFilter;
    const mP = s.price >= priceRange[0] && s.price <= priceRange[1];
    const mPr = presFilter.length === 0 || presFilter.includes(s.preservation);
    const mD = dataFilter.length === 0 || dataFilter.some(d => s.matchedData.includes(d));
    return mS && mT && mP && mPr && mD;
  });
  const getBB = (id) => BIOBANKS_DATA.find(b => b.id === id);
  const addCart = (s) => { if (!cart.find(c => c.id === s.id)) setCart([...cart, s]); };
  const [reqMsg, setReqMsg] = useState("");
  const sendReq = () => {
    // Save to DB in background
    cart.forEach(s => {
      requestsAPI.create({
        sampleId: s.id,
        biobankId: s.biobankId || s.biobank_id,
        quantity: 1,
        message: reqMsg,
      }).catch(e => console.log("Request save:", e));
    });
    setRequestSent(true);
    setTimeout(() => { setRequestSent(false); setShowRequest(false); setCart([]); setReqMsg(""); }, 2000);
  };
  const clearF = () => { setPriceRange([0, 300]); setPresFilter([]); setDataFilter([]); };
  const afc = (priceRange[0] > 0 || priceRange[1] < 300 ? 1 : 0) + (presFilter.length > 0 ? 1 : 0) + (dataFilter.length > 0 ? 1 : 0);

  return (
    <div style={{ minHeight: "100vh" }}>
      <NavBar onNav={onNav} user={user} logout={logout} extra={
        <>
          <button onClick={() => setShowTracker(true)} style={btnG}>{I.list}</button>
          <button onClick={() => setShowFavorites(true)} style={{ ...btnG, position: "relative" }}>{I.heart(favorites.length > 0)}{favorites.length > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: T.danger, color: "#fff", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{favorites.length}</span>}</button>
          <button onClick={() => setShowMessages(true)} style={{ ...btnG, position: "relative" }}>{I.msg}<span style={{ position: "absolute", top: -1, right: 0, width: 7, height: 7, borderRadius: "50%", background: T.accent }} /></button>
          <button onClick={() => setShowRequest(true)} style={{ ...btnG, position: "relative" }}>{I.cart}{cart.length > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: T.accent, color: T.bg, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{cart.length}</span>}</button>
          <button onClick={() => onNav("biobank")} style={btnG}>Dashboard</button>
        </>
      } />
      <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Discover Biospecimens</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.textMuted }}>{I.search}</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search disease, organ, type..." style={{ ...inp, paddingLeft: 42, width: "100%" }} />
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {types.map(t => (
                <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${typeFilter === t ? T.accent : T.border}`, background: typeFilter === t ? T.accentDim : "transparent", color: typeFilter === t ? T.accent : T.textMuted, cursor: "pointer", fontSize: 12, fontFamily: "inherit", transition: "all 0.2s" }}>{t}</button>
              ))}
              <button onClick={() => setShowFilters(!showFilters)} style={{ ...btnG, border: `1px solid ${afc > 0 ? T.accent : T.border}`, color: afc > 0 ? T.accent : T.textMuted, borderRadius: 8, padding: "10px 14px" }}>{I.sliders} Filters{afc > 0 && <span style={{ width: 18, height: 18, borderRadius: "50%", background: T.accent, color: T.bg, fontSize: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, marginLeft: 4 }}>{afc}</span>}</button>
            </div>
          </div>
          {showFilters && (
            <div style={{ ...crd, padding: 20, marginBottom: 12, animation: "slideUp 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif" }}>Advanced Filters</span>
                <button onClick={clearF} style={{ ...btnG, fontSize: 12, color: T.danger }}>Clear All</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                <div>
                  <label style={lb}>Price: ${priceRange[0]} - ${priceRange[1]}</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: T.textMuted }}>$0</span>
                    <input type="range" min={0} max={300} step={10} value={priceRange[1]} onChange={e => setPriceRange([priceRange[0], Math.max(+e.target.value, priceRange[0])])} style={{ flex: 1 }} />
                    <span style={{ fontSize: 11, color: T.textMuted }}>$300</span>
                  </div>
                </div>
                <div>
                  <label style={lb}>Preservation</label>
                  <Chip items={preservations} selected={presFilter} onSelect={p => setPresFilter(presFilter.includes(p) ? presFilter.filter(x => x !== p) : [...presFilter, p])} multi />
                </div>
                <div>
                  <label style={lb}>Data Type</label>
                  <Chip items={dataTypes} selected={dataFilter} onSelect={d => setDataFilter(dataFilter.includes(d) ? dataFilter.filter(x => x !== d) : [...dataFilter, d])} multi />
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>{filtered.length} samples found</div>

        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((sample, i) => {
            const bb = getBB(sample.biobankId);
            const inCart = cart.find(c => c.id === sample.id);
            const isFav = favorites.includes(sample.id);
            return (
              <div key={sample.id} style={{ ...crd, animation: `slideUp 0.4s ease ${i * 0.04}s both`, display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center", cursor: "pointer" }} onClick={() => setSelectedSample(sample)}>
                <div>
                  <div style={{ display: "flex", gap: 5, marginBottom: 7, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ ...tg, background: typeColors[sample.type], color: "#fff" }}>{sample.type}</span>
                    <span style={tg}>{sample.subtype}</span>
                    <span style={{ ...tg, background: sample.availability === "In Stock" ? "rgba(0,229,160,0.15)" : "rgba(245,158,11,0.15)", color: sample.availability === "In Stock" ? T.accent : T.warning }}>{sample.availability}</span>
                    <button onClick={e => { e.stopPropagation(); toggleFav(sample.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex" }}>{I.heart(isFav)}</button>
                  </div>
                  <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 5 }}>{sample.disease}</h3>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: T.textMuted, fontSize: 12 }}>
                    <span>{sample.organ}</span><span>{sample.quantity} {sample.unit}</span><span>{sample.consent}</span>
                  </div>
                  <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.textMuted }}>
                    {bb.verified && <span style={{ color: T.accent, display: "flex", alignItems: "center", gap: 3 }}>{I.check} Verified</span>}
                    <span onClick={e => { e.stopPropagation(); openBB(bb); }} style={{ cursor: "pointer", textDecoration: "underline", textDecorationColor: T.borderLight, textUnderlineOffset: 2 }}>{bb.name}</span>
                    <span>·</span><span>{bb.location}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, color: T.accent }}>${sample.price}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 10 }}>per unit</div>
                  <button onClick={e => { e.stopPropagation(); addCart(sample); }} style={{ ...btnP, padding: "7px 14px", fontSize: 12, opacity: inCart ? 0.5 : 1 }}>{inCart ? "Added ✓" : "Add to Cart"}</button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ textAlign: "center", padding: 60, color: T.textMuted }}>No matches. <button onClick={clearF} style={{ ...btnG, display: "inline", color: T.accent }}>Clear filters</button></div>}
        </div>
      </div>

      {selectedSample && <Modal onClose={() => setSelectedSample(null)}><SampleDetail sample={selectedSample} biobank={getBB(selectedSample.biobankId)} onAdd={() => { addCart(selectedSample); setSelectedSample(null); }} inCart={!!cart.find(c => c.id === selectedSample.id)} isFav={favorites.includes(selectedSample.id)} toggleFav={() => toggleFav(selectedSample.id)} onViewBB={() => { setSelectedSample(null); openBB(getBB(selectedSample.biobankId)); }} /></Modal>}

      {showRequest && (
        <Modal onClose={() => setShowRequest(false)}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 18 }}>Sample Request</h3>
          {requestSent ? (
            <div style={{ textAlign: "center", padding: 36 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: T.accent }}>{I.checkCircle}</div>
              <p style={{ color: T.accent, fontSize: 15, fontWeight: 600 }}>Request sent!</p>
              <p style={{ color: T.textMuted, fontSize: 13, marginTop: 6 }}>Biobanks will respond within 48 hours.</p>
            </div>
          ) : cart.length === 0 ? (
            <p style={{ color: T.textMuted, textAlign: "center", padding: 36 }}>Your cart is empty.</p>
          ) : (
            <>
              {cart.map(s => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                  <div><div style={{ fontSize: 13, fontWeight: 500 }}>{s.disease} — {s.subtype}</div><div style={{ fontSize: 12, color: T.textMuted }}>{getBB(s.biobankId).name}</div></div>
                  <button onClick={() => setCart(cart.filter(c => c.id !== s.id))} style={{ ...btnG, color: T.danger, padding: 4 }}>{I.close}</button>
                </div>
              ))}
              <textarea value={reqMsg} onChange={e => setReqMsg(e.target.value)} placeholder="Message to biobank(s)..." style={{ ...inp, width: "100%", minHeight: 70, marginTop: 14, resize: "vertical" }} />
              <button onClick={sendReq} style={{ ...btnP, width: "100%", marginTop: 14, padding: "13px 0", fontSize: 14 }}>{I.send}<span style={{ marginLeft: 8 }}>Send Request</span></button>
            </>
          )}
        </Modal>
      )}

      {showMessages && <Modal onClose={() => setShowMessages(false)}><MsgPanel messages={messages} setMessages={setMessages} threads={threads} role="researcher" userName={user?.name || "Researcher"} /></Modal>}

      {showFavorites && (
        <Modal onClose={() => setShowFavorites(false)}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 18 }}>Saved Samples</h3>
          {favorites.length === 0 ? <p style={{ color: T.textMuted, textAlign: "center", padding: 36 }}>No saved samples. Click the heart icon to save.</p> : (
            favorites.map(fId => {
              const s = samples.find(x => x.id === fId);
              if (!s) return null;
              const bb = getBB(s.biobankId);
              return (
                <div key={fId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 5, marginBottom: 4 }}>
                      <span style={{ ...tg, background: typeColors[s.type], color: "#fff", fontSize: 11 }}>{s.type}</span>
                      <span style={{ ...tg, fontSize: 11 }}>{s.subtype}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{s.disease}</div>
                    <div style={{ fontSize: 12, color: T.textMuted }}>{bb.name} · ${s.price}/unit</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => addCart(s)} style={{ ...btnP, padding: "6px 12px", fontSize: 11 }}>Add</button>
                    <button onClick={() => toggleFav(fId)} style={{ ...btnG, color: T.danger, padding: 4 }}>{I.close}</button>
                  </div>
                </div>
              );
            })
          )}
        </Modal>
      )}

      {showTracker && (
        <Modal onClose={() => setShowTracker(false)}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 18 }}>My Requests</h3>
          {MY_REQUESTS.map((r, i) => {
            const s = SAMPLES_DATA.find(x => x.id === r.sampleId);
            const bb = BIOBANKS_DATA.find(x => x.id === r.biobankId);
            const sc = statusColors[r.status];
            const steps = ["pending", "approved", "shipped", "delivered"];
            const si = steps.indexOf(r.status);
            const rej = r.status === "rejected";
            return (
              <div key={r.id} style={{ padding: 16, background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, marginBottom: 10, animation: `slideUp 0.3s ease ${i * 0.06}s both` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{s ? s.disease + " — " + s.subtype : "Sample"}</div>
                    <div style={{ fontSize: 12, color: T.textMuted }}>{bb ? bb.name : ""} · Qty: {r.quantity} · {r.date}</div>
                  </div>
                  <span style={{ ...tg, background: `${sc}22`, color: sc, fontWeight: 600 }}>{statusLabels[r.status]}</span>
                </div>
                {!rej && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "12px 0 4px" }}>
                      {steps.map((step, idx) => {
                        const done = idx <= si;
                        const cur = idx === si;
                        return (
                          <div key={step} style={{ display: "flex", alignItems: "center", flex: idx < steps.length - 1 ? 1 : "none" }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: done ? T.accent : T.border, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: cur ? `0 0 8px ${T.accentGlow}` : "none" }}>
                              {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.bg} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                            </div>
                            {idx < steps.length - 1 && <div style={{ flex: 1, height: 2, background: idx < si ? T.accent : T.border }} />}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textMuted, marginTop: 4, padding: "0 2px" }}>
                      {steps.map(step => <span key={step} style={{ textTransform: "capitalize" }}>{step}</span>)}
                    </div>
                  </div>
                )}
                {rej && <p style={{ fontSize: 12, color: T.danger, marginTop: 8 }}>Declined. Submit a new request or contact the biobank.</p>}
              </div>
            );
          })}
        </Modal>
      )}
    </div>
  );
}

function SampleDetail({ sample, biobank, onAdd, inCart, isFav, toggleFav, onViewBB }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center" }}>
        <span style={{ ...tg, background: typeColors[sample.type], color: "#fff" }}>{sample.type}</span><span style={tg}>{sample.subtype}</span>
        {toggleFav && <div style={{ marginLeft: "auto" }}><button onClick={toggleFav} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>{I.heart(isFav)}</button></div>}
      </div>
      <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 19, fontWeight: 600, marginBottom: 5 }}>{sample.disease}</h3>
      <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 18 }}>
        {onViewBB ? <span onClick={onViewBB} style={{ cursor: "pointer", textDecoration: "underline", textDecorationColor: T.borderLight, textUnderlineOffset: 2 }}>{biobank.name}</span> : biobank.name} · {biobank.location}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
        {[["Organ", sample.organ], ["Preservation", sample.preservation], ["Quantity", `${sample.quantity} ${sample.unit}`], ["Consent", sample.consent], ["Availability", sample.availability], ["Price", `$${sample.price}/unit`]].map(([l, v], i) => (
          <div key={i} style={{ padding: 10, background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 3 }}>{l}</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>Matched Data</div>
        <div style={{ display: "flex", gap: 5 }}>{sample.matchedData.map(d => <span key={d} style={{ ...tg, background: T.accentDim, color: T.accent }}>{d}</span>)}</div>
      </div>
      <button onClick={onAdd} disabled={inCart} style={{ ...btnP, width: "100%", padding: "13px 0", fontSize: 14, opacity: inCart ? 0.5 : 1 }}>{inCart ? "In Cart ✓" : "Add to Request Cart"}</button>
    </div>
  );
}

// ── Messaging ──────────────────────────────────────────────
function MsgPanel({ messages, setMessages, threads, role, userName }) {
  const [activeThread, setActiveThread] = useState(null);
  const [newMsg, setNewMsg] = useState("");
  const endRef = useRef(null);
  const tMsgs = activeThread ? messages.filter(m => m.threadId === activeThread) : [];
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [tMsgs.length, activeThread]);

  const send = () => {
    if (!newMsg.trim() || !activeThread) return;
    setMessages([...messages, { id: "m" + Date.now(), threadId: activeThread, from: role, fromName: userName, text: newMsg.trim(), time: "Just now" }]);
    setNewMsg("");
  };

  return (
    <div>
      <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 14 }}>Messages</h3>
      {!activeThread ? (
        threads.length === 0 ? <p style={{ color: T.textMuted, textAlign: "center", padding: 36 }}>No conversations yet.</p> : (
          threads.map(t => {
            const sample = SAMPLES_DATA.find(s => s.id === t.sampleId);
            const bb = BIOBANKS_DATA.find(b => b.id === t.biobankId);
            return (
              <div key={t.id} onClick={() => setActiveThread(t.id)} style={{ padding: 14, borderRadius: 10, border: `1px solid ${T.border}`, marginBottom: 8, cursor: "pointer", background: T.bg, transition: "border-color 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{role === "researcher" ? bb?.name : "Researcher"}</span>
                  <span style={{ fontSize: 11, color: T.textMuted }}>{t.lastDate}</span>
                </div>
                <div style={{ fontSize: 12, color: T.accent, marginBottom: 3 }}>{sample?.disease} — {sample?.subtype}</div>
                <div style={{ fontSize: 12, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.lastMessage}</div>
              </div>
            );
          })
        )
      ) : (
        <div>
          <button onClick={() => setActiveThread(null)} style={{ ...btnG, marginBottom: 10, padding: "6px 0" }}>{I.back} Back</button>
          <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 14, padding: 2 }}>
            {tMsgs.map(m => (
              <div key={m.id} style={{ marginBottom: 10, display: "flex", flexDirection: "column", alignItems: m.from === role ? "flex-end" : "flex-start" }}>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 3 }}>{m.fromName} · {m.time}</div>
                <div style={{ padding: "9px 13px", borderRadius: 12, maxWidth: "85%", fontSize: 13, lineHeight: 1.6, background: m.from === role ? T.accentDim : T.surfaceLight, color: m.from === role ? T.accent : T.text, border: `1px solid ${m.from === role ? "rgba(0,229,160,0.2)" : T.border}` }}>{m.text}</div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Type a message..." style={{ ...inp, flex: 1 }} />
            <button onClick={send} style={{ ...btnP, padding: "10px 14px" }}>{I.send}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Biobank Dashboard ──────────────────────────────────────
function BiobankDash({ onNav, user, logout, samples, setSamples, requests, setRequests, messages, setMessages, threads }) {
  const [tab, setTab] = useState("overview");
  const myBB = BIOBANKS_DATA[0];
  const mySamples = samples.filter(s => s.biobankId === myBB.id);
  const updateReq = (id, st) => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: st } : r));
    requestsAPI.updateStatus(id, st).catch(e => console.log("Status update:", e));
  };

  const tabs = [
    { id: "overview", l: "Overview", icon: I.chart },
    { id: "inventory", l: "Inventory", icon: I.flask },
    { id: "add", l: "Add Sample", icon: I.plus },
    { id: "requests", l: "Requests", icon: I.inbox, badge: requests.filter(r => r.status === "pending").length },
    { id: "messages", l: "Messages", icon: I.msg, badge: 2 },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <NavBar onNav={onNav} user={user} logout={logout} extra={<button onClick={() => onNav("researcher")} style={btnG}>Marketplace</button>} />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <aside style={{ width: 200, borderRight: `1px solid ${T.border}`, padding: "18px 8px", flexShrink: 0, overflowY: "auto" }}>
          <div style={{ fontSize: 10, color: T.textMuted, padding: "0 12px", marginBottom: 8, letterSpacing: 1.5, textTransform: "uppercase" }}>Dashboard</div>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 12px", borderRadius: 8, border: "none", background: tab === t.id ? T.accentDim : "transparent", color: tab === t.id ? T.accent : T.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "inherit", marginBottom: 2, transition: "all 0.2s", textAlign: "left" }}>
              {t.icon}{t.l}
              {t.badge > 0 && <span style={{ marginLeft: "auto", background: T.accent, color: T.bg, borderRadius: 10, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>{t.badge}</span>}
            </button>
          ))}
        </aside>
        <main style={{ flex: 1, padding: "24px 24px", overflowY: "auto" }}>
          {tab === "overview" && <OverviewTab bb={myBB} samples={mySamples} requests={requests} />}
          {tab === "inventory" && <InventoryTab samples={mySamples} onAdd={() => setTab("add")} />}
          {tab === "add" && <AddSampleForm bb={myBB} samples={samples} setSamples={setSamples} onDone={() => setTab("inventory")} />}
          {tab === "requests" && <RequestsTab requests={requests} onUpdate={updateReq} />}
          {tab === "messages" && <MsgPanel messages={messages} setMessages={setMessages} threads={threads} role="biobank" userName={myBB.name} />}
        </main>
      </div>
    </div>
  );
}

function OverviewTab({ bb, samples, requests }) {
  const stats = [
    { l: "Total Samples", v: bb.samples.toLocaleString(), c: T.accent },
    { l: "Listed", v: samples.length, c: T.info },
    { l: "Pending", v: requests.filter(r => r.status === "pending").length, c: T.warning },
    { l: "Fulfilled", v: requests.filter(r => r.status === "approved").length, c: T.accent },
  ];
  return (
    <div>
      <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 5 }}>Welcome, {bb.name}</h2>
      <p style={{ color: T.textMuted, fontSize: 12, marginBottom: 22 }}>{bb.location} · {I.star} {bb.rating} · {bb.verified && "Verified"}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ ...crd, padding: 16, animation: `slideUp 0.4s ease ${i * 0.1}s both` }}>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 5 }}>{s.l}</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 700, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ ...crd, padding: 18, marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Request Activity (7 days)</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90 }}>
          {[35, 52, 28, 67, 45, 80, 62].map((h, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", height: h, background: `linear-gradient(to top,${T.accent},rgba(0,229,160,0.3))`, borderRadius: "3px 3px 0 0", animation: `slideUp 0.5s ease ${i * 0.05}s both` }} />
              <span style={{ fontSize: 10, color: T.textMuted }}>{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InventoryTab({ samples, onAdd }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600 }}>Inventory</h2>
        <button onClick={onAdd} style={btnP}>{I.plus} Add Sample</button>
      </div>
      <div style={{ borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ background: T.surfaceLight }}>
            {["Type", "Disease", "Organ", "Qty", "Price", "Status"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 500, color: T.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {samples.map(s => (
              <tr key={s.id} style={{ borderTop: `1px solid ${T.border}` }}>
                <td style={cl}><span style={{ ...tg, background: typeColors[s.type], color: "#fff", fontSize: 11 }}>{s.type}</span></td>
                <td style={cl}>{s.disease}</td>
                <td style={cl}>{s.organ}</td>
                <td style={cl}>{s.quantity}</td>
                <td style={cl}>${s.price}</td>
                <td style={cl}><span style={{ color: s.availability === "In Stock" ? T.accent : T.warning }}>{s.availability}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Add Sample Form ────────────────────────────────────────
function AddSampleForm({ bb, samples, setSamples, onDone }) {
  const [form, setForm] = useState({ type: "Tissue", subtype: "", disease: "", organ: "", preservation: "", quantity: "", unit: "samples", price: "", consent: "Broad Research", matchedData: [], availability: "In Stock" });
  const [success, setSuccess] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });
  const toggleD = (d) => set("matchedData", form.matchedData.includes(d) ? form.matchedData.filter(x => x !== d) : [...form.matchedData, d]);

  const subtypes = {
    Tissue: ["FFPE", "Fresh Frozen", "OCT Embedded", "Cryopreserved"],
    Blood: ["Serum", "Plasma", "Whole Blood", "Buffy Coat", "PBMCs"],
    DNA: ["Genomic DNA", "cfDNA", "ctDNA", "Plasmid DNA"],
    RNA: ["Total RNA", "mRNA", "miRNA", "lncRNA"],
  };

  const submit = () => {
    if (!form.subtype || !form.disease || !form.organ || !form.quantity || !form.price) return;
    const localSample = { ...form, id: "s" + Date.now(), biobankId: bb.id, quantity: parseInt(form.quantity), price: parseInt(form.price), matchedData: form.matchedData };
    setSamples([...samples, localSample]);
    // Save to DB in background
    samplesAPI.create({
      biobank_id: bb.id,
      type: form.type, subtype: form.subtype, disease: form.disease, organ: form.organ,
      preservation: form.preservation, quantity: parseInt(form.quantity), unit: form.unit,
      price: parseInt(form.price), consent: form.consent, matched_data: form.matchedData,
      availability: form.availability,
    }).catch(e => console.log("Sample save:", e));
    setSuccess(true);
    setTimeout(() => { setSuccess(false); onDone(); }, 1500);
  };

  if (success) return (
    <div style={{ textAlign: "center", padding: 50, animation: "slideUp 0.4s ease" }}>
      <div style={{ width: 60, height: 60, borderRadius: "50%", background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: T.accent }}>{I.checkCircle}</div>
      <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, color: T.accent }}>Sample Listed!</h3>
      <p style={{ color: T.textMuted, marginTop: 8, fontSize: 13 }}>Now visible to researchers worldwide.</p>
    </div>
  );

  const Chip = ({ items, selected, onSelect, multi }) => (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {items.map(item => {
        const active = multi ? selected.includes(item) : selected === item;
        return <button key={item} onClick={() => onSelect(item)} style={{ padding: "7px 13px", borderRadius: 8, border: `1px solid ${active ? T.accent : T.border}`, background: active ? T.accentDim : "transparent", color: active ? T.accent : T.textMuted, cursor: "pointer", fontSize: 12, fontFamily: "inherit", transition: "all 0.15s" }}>{item}</button>;
      })}
    </div>
  );

  return (
    <div>
      <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 4 }}>List New Sample</h2>
      <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 22 }}>Make your specimen discoverable to researchers.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div><label style={lb}>Sample Type *</label><Chip items={["Tissue", "Blood", "DNA", "RNA"]} selected={form.type} onSelect={v => { set("type", v); set("subtype", ""); }} /></div>
        <div><label style={lb}>Subtype *</label><Chip items={subtypes[form.type] || []} selected={form.subtype} onSelect={v => set("subtype", v)} /></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div><label style={lb}>Disease / Condition *</label><input value={form.disease} onChange={e => set("disease", e.target.value)} placeholder="e.g., Breast Cancer" style={{ ...inp, width: "100%" }} /></div>
        <div><label style={lb}>Organ / Tissue *</label><input value={form.organ} onChange={e => set("organ", e.target.value)} placeholder="e.g., Breast" style={{ ...inp, width: "100%" }} /></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div><label style={lb}>Preservation</label>
          <select value={form.preservation} onChange={e => set("preservation", e.target.value)} style={{ ...inp, width: "100%" }}>
            <option value="">Select...</option>
            {["Formalin-Fixed", "Frozen -80°C", "Frozen -20°C", "Liquid Nitrogen", "EDTA", "Cryopreserved", "RNAlater"].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div><label style={lb}>Consent Type</label>
          <select value={form.consent} onChange={e => set("consent", e.target.value)} style={{ ...inp, width: "100%" }}>
            {["Broad Research", "Disease-Specific", "Restricted", "Commercial OK"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div><label style={lb}>Quantity *</label><input type="number" value={form.quantity} onChange={e => set("quantity", e.target.value)} placeholder="100" style={{ ...inp, width: "100%" }} /></div>
        <div><label style={lb}>Unit</label>
          <select value={form.unit} onChange={e => set("unit", e.target.value)} style={{ ...inp, width: "100%" }}>
            {["samples", "blocks", "aliquots", "specimens", "tubes", "vials"].map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div><label style={lb}>Price (USD) *</label><input type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder="per unit" style={{ ...inp, width: "100%" }} /></div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={lb}>Matched Data Available</label>
        <Chip items={["Clinical", "Genomic", "Proteomic", "Imaging", "Immunological", "Metabolomic"]} selected={form.matchedData} onSelect={toggleD} multi />
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={lb}>Availability</label>
        <Chip items={["In Stock", "Limited", "Pre-order"]} selected={form.availability} onSelect={v => set("availability", v)} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={submit} style={{ ...btnP, padding: "13px 28px", fontSize: 14 }}>{I.plus} List Sample</button>
        <button onClick={onDone} style={{ ...btnS, padding: "13px 28px", fontSize: 14 }}>Cancel</button>
      </div>
    </div>
  );
}

function RequestsTab({ requests, onUpdate }) {
  const sc = { pending: T.warning, approved: T.accent, rejected: T.danger };
  return (
    <div>
      <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 18 }}>Sample Requests</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {requests.map((r, i) => {
          const s = SAMPLES_DATA.find(x => x.id === r.sampleId);
          return (
            <div key={r.id} style={{ ...crd, animation: `slideUp 0.4s ease ${i * 0.06}s both` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{r.researcher}</div>
                  <div style={{ fontSize: 12, color: T.textMuted }}>{r.institution} · {r.date}</div>
                </div>
                <span style={{ ...tg, background: `${sc[r.status]}22`, color: sc[r.status], textTransform: "capitalize" }}>{r.status}</span>
              </div>
              <div style={{ padding: 10, background: T.bg, borderRadius: 8, marginBottom: 10, border: `1px solid ${T.border}`, fontSize: 13 }}>
                <strong>{s?.disease}</strong> — {s?.subtype} · Qty: {r.quantity}
              </div>
              <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 12, lineHeight: 1.5 }}>{r.message}</p>
              {r.status === "pending" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => onUpdate(r.id, "approved")} style={{ ...btnP, padding: "7px 16px", fontSize: 12 }}>Approve</button>
                  <button onClick={() => onUpdate(r.id, "rejected")} style={{ ...btnS, padding: "7px 16px", fontSize: 12, borderColor: T.danger, color: T.danger }}>Decline</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Profile Page ───────────────────────────────────────────
function ProfilePage({ onNav, user, logout }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", institution: user?.institution || "", location: user?.location || "", bio: "Biomedical researcher focused on translational oncology and precision medicine." });
  const set = (k, v) => setForm({ ...form, [k]: v });
  const isR = user?.role === "researcher";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <NavBar onNav={onNav} user={user} logout={logout} extra={
        <button onClick={() => onNav(isR ? "researcher" : "biobank")} style={btnG}>{I.back} Back</button>
      } />
      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "32px 20px" }}>
        <div style={{ maxWidth: 580, width: "100%" }}>
          <div style={{ ...crd, padding: 24, marginBottom: 16, animation: "slideUp 0.4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg,${T.accent},#00b880)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: T.bg, fontFamily: "'Space Grotesk',sans-serif", flexShrink: 0 }}>
                {(user?.name || "U").split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 600, marginBottom: 3 }}>{user?.name}</h2>
                <div style={{ display: "flex", gap: 10, color: T.textMuted, fontSize: 12, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>{isR ? I.flask : I.bank} {isR ? "Researcher" : "Biobank Admin"}</span>
                  {user?.institution && <span>{user.institution}</span>}
                  {user?.location && <span style={{ display: "flex", alignItems: "center", gap: 3 }}>{I.globe} {user.location}</span>}
                </div>
              </div>
              <button onClick={() => setEditing(!editing)} style={btnG}>{I.edit}</button>
            </div>

            {editing ? (
              <div style={{ animation: "fadeIn 0.3s ease" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div><label style={lb}>Full Name</label><input value={form.name} onChange={e => set("name", e.target.value)} style={{ ...inp, width: "100%" }} /></div>
                  <div><label style={lb}>Email</label><input value={form.email} onChange={e => set("email", e.target.value)} style={{ ...inp, width: "100%" }} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div><label style={lb}>{isR ? "Institution" : "Biobank"}</label><input value={form.institution} onChange={e => set("institution", e.target.value)} style={{ ...inp, width: "100%" }} /></div>
                  <div><label style={lb}>Location</label><input value={form.location} onChange={e => set("location", e.target.value)} style={{ ...inp, width: "100%" }} /></div>
                </div>
                <div style={{ marginBottom: 12 }}><label style={lb}>Bio</label><textarea value={form.bio} onChange={e => set("bio", e.target.value)} rows={3} style={{ ...inp, width: "100%", resize: "vertical" }} /></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { authAPI.updateProfile({ name: form.name, email: form.email, institution: form.institution, location: form.location, bio: form.bio }).catch(() => {}); setEditing(false); }} style={{ ...btnP, padding: "9px 20px", fontSize: 13 }}>Save</button>
                  <button onClick={() => setEditing(false)} style={{ ...btnS, padding: "9px 20px", fontSize: 13 }}>Cancel</button>
                </div>
              </div>
            ) : (
              <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.7 }}>{form.bio}</p>
            )}
          </div>

          <div style={{ ...crd, padding: 20, marginBottom: 16, animation: "slideUp 0.5s ease" }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Activity</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {(isR ? [
                { l: "Requests Sent", v: "12", c: T.info },
                { l: "Samples Received", v: "8", c: T.accent },
                { l: "Active Threads", v: "3", c: T.warning },
              ] : [
                { l: "Samples Listed", v: "3", c: T.info },
                { l: "Requests In", v: "24", c: T.accent },
                { l: "Fulfillment", v: "92%", c: T.accent },
              ]).map((s, i) => (
                <div key={i} style={{ textAlign: "center", padding: 14, background: T.bg, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...crd, padding: 20, animation: "slideUp 0.6s ease" }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>{I.shield} Security</h3>
            {[
              { t: "Password", d: "Last changed 30 days ago", btn: "Change", style: btnS },
              { t: "Two-Factor Auth", d: "Not enabled", btn: "Enable", style: btnP },
              { t: "Member Since", d: user?.joined || "March 2026" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? `1px solid ${T.border}` : "none" }}>
                <div><div style={{ fontSize: 13 }}>{item.t}</div><div style={{ fontSize: 12, color: T.textMuted }}>{item.d}</div></div>
                {item.btn && <button style={{ ...item.style, padding: "7px 14px", fontSize: 12 }}>{item.btn}</button>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────
// ── Biobank Public Profile ─────────────────────────────────
function BBProfile({ onNav, user, logout, bb, samples, favorites, toggleFav }) {
  if (!bb) return null;
  const bbS = samples.filter(s => s.biobankId === bb.id);
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <NavBar onNav={onNav} user={user} logout={logout} extra={
        <button onClick={() => onNav("researcher")} style={btnG}>{I.back} Marketplace</button>
      } />
      <div style={{ padding: "28px 20px", maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <div style={{ ...crd, padding: 28, marginBottom: 20, animation: "slideUp 0.4s ease" }}>
          <div style={{ display: "flex", gap: 20, alignItems: "start", flexWrap: "wrap" }}>
            <div style={{ width: 72, height: 72, borderRadius: 16, background: `linear-gradient(135deg,${T.accent},#00b880)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: T.bg, fontFamily: "'Space Grotesk',sans-serif", flexShrink: 0 }}>
              {bb.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700 }}>{bb.name}</h2>
                {bb.verified && <span style={{ background: T.accentDim, color: T.accent, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>{I.check} Verified</span>}
              </div>
              <div style={{ display: "flex", gap: 16, color: T.textMuted, fontSize: 13, flexWrap: "wrap", marginBottom: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>{I.mapPin} {bb.location}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>{I.star} {bb.rating} ({bb.reviews} reviews)</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>{I.clock} {bb.responseTime}</span>
              </div>
              <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.7 }}>{bb.bio}</p>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 20 }}>
          {[{ l: "Specimens", v: bb.samples.toLocaleString(), c: T.accent }, { l: "Listed", v: bbS.length, c: T.info }, { l: "Founded", v: bb.founded, c: "#8b5cf6" }, { l: "Specialties", v: bb.specialties.length, c: T.warning }].map((s, i) => (
            <div key={i} style={{ ...crd, padding: 16, textAlign: "center", animation: `slideUp 0.4s ease ${i * 0.08}s both` }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ ...crd, padding: 18 }}>
            <h4 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>{I.award} Certifications</h4>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {bb.certifications.map(c => <span key={c} style={{ ...tg, background: T.accentDim, color: T.accent, padding: "6px 12px" }}>{c}</span>)}
            </div>
          </div>
          <div style={{ ...crd, padding: 18 }}>
            <h4 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>{I.flask} Specialties</h4>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {bb.specialties.map(s => <span key={s} style={{ ...tg, background: "rgba(139,92,246,0.15)", color: "#8b5cf6", padding: "6px 12px" }}>{s}</span>)}
            </div>
          </div>
        </div>

        <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Catalog ({bbS.length} samples)</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {bbS.map((s, i) => {
            const isFav = favorites.includes(s.id);
            return (
              <div key={s.id} style={{ ...crd, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", animation: `slideUp 0.3s ease ${i * 0.05}s both` }}>
                <div>
                  <div style={{ display: "flex", gap: 5, marginBottom: 5 }}>
                    <span style={{ ...tg, background: typeColors[s.type], color: "#fff", fontSize: 11 }}>{s.type}</span>
                    <span style={{ ...tg, fontSize: 11 }}>{s.subtype}</span>
                    <span style={{ ...tg, fontSize: 11, background: s.availability === "In Stock" ? "rgba(0,229,160,0.15)" : "rgba(245,158,11,0.15)", color: s.availability === "In Stock" ? T.accent : T.warning }}>{s.availability}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{s.disease}</div>
                  <div style={{ fontSize: 12, color: T.textMuted }}>{s.organ} · {s.quantity} {s.unit} · {s.consent}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: T.accent }}>${s.price}</div>
                  <button onClick={() => toggleFav(s.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>{I.heart(isFav)}</button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ ...crd, padding: 18, textAlign: "center", marginTop: 20 }}>
          <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 10 }}>Interested in samples from this biobank?</p>
          <button onClick={() => onNav("researcher")} style={{ ...btnP, padding: "12px 28px" }}>Browse & Request Samples</button>
        </div>
      </div>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, maxWidth: 520, width: "100%", maxHeight: "85vh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
        <button onClick={onClose} style={{ ...btnG, float: "right", padding: 4 }}>{I.close}</button>
        <div style={{ clear: "both" }}>{children}</div>
      </div>
    </div>
  );
}
