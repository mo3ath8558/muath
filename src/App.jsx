import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDXx_NmEFWP537_RSdz1OwqsaGhGpoVHLg",
  authDomain: "planning-c9b2d.firebaseapp.com",
  projectId: "planning-c9b2d",
  storageBucket: "planning-c9b2d.firebasestorage.app",
  messagingSenderId: "1077902449302",
  appId: "1:1077902449302:web:c5626da29f3ee3c43000b7",
  measurementId: "G-44QF2K6B8Z"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const WEEK_LABELS = ["الأول", "الثاني", "الثالث", "الرابع"];
const MONTH_LABELS = ["الشهر الأول", "الشهر الثاني", "الشهر الثالث"];
const Q_LABELS = ["Q1", "Q2", "Q3", "Q4"];

const NAV = [
  { key: "weekly",    label: "أسبوعي",    icon: "📅" },
  { key: "monthly",   label: "شهري",      icon: "🗓️" },
  { key: "quarterly", label: "ربع سنوي",  icon: "📊" },
  { key: "yearly",    label: "سنوي",      icon: "🏆" },
];

const COLORS = {
  weekly:    { bg: "#0f172a", accent: "#38bdf8", card: "#1e293b", border: "#334155", sub: "#263347" },
  monthly:   { bg: "#0f0f1a", accent: "#a78bfa", card: "#1a1a2e", border: "#2d2d4a", sub: "#22223a" },
  quarterly: { bg: "#0a1a0f", accent: "#4ade80", card: "#0f2a17", border: "#1a4a2a", sub: "#163520" },
  yearly:    { bg: "#1a0f0a", accent: "#fb923c", card: "#2a1a0f", border: "#4a2a1a", sub: "#351f0f" },
};

// معرف ثابت لجهازك — كل البيانات تحفظ تحت هذا المعرف في Firestore
function getDeviceId() {
  let id = localStorage.getItem("planner_device_id");
  if (!id) {
    id = "user_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("planner_device_id", id);
  }
  return id;
}
const DEVICE_ID = getDeviceId();

// Hook يحفظ في localStorage فوراً + يزامن مع Firestore في الخلفية
function useStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; } catch { return initial; }
  });
  const loaded = useRef(false);

  // تحميل البيانات من Firestore عند أول مرة
  useEffect(() => {
    (async () => {
      try {
        const ref = doc(db, "planners", DEVICE_ID, "data", key);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const remote = snap.data().value;
          setVal(JSON.parse(remote));
          localStorage.setItem(key, remote);
        }
      } catch (e) { /* تجاهل الخطأ — يبقى يعمل من localStorage */ }
      loaded.current = true;
    })();
  }, []);

  const set = (v) => {
    setVal(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
    try {
      const ref = doc(db, "planners", DEVICE_ID, "data", key);
      setDoc(ref, { value: JSON.stringify(v), updatedAt: Date.now() });
    } catch (e) { /* تجاهل خطأ الشبكة */ }
  };

  return [val, set];
}

function ProgressBar({ tasks, accent }) {
  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontFamily: "inherit" }}>{done}/{tasks.length} مكتملة</span>
        <span style={{ color: accent, fontSize: "11px", fontWeight: "bold" }}>{pct}%</span>
      </div>
      <div style={{ height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: "linear-gradient(90deg, " + accent + ", rgba(255,255,255,0.4))", borderRadius: "10px", transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete, onEdit, accent }) {
  const [editing, setEditing] = useState(false);
  const [txt, setTxt] = useState(task.text);
  const save = () => { if (txt.trim()) onEdit(txt.trim()); setEditing(false); };
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px", padding: "8px 11px",
      background: task.done ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)",
      borderRadius: "8px", marginBottom: "6px", border: "1px solid rgba(255,255,255,0.05)"
    }}>
      <button onClick={onToggle} style={{
        width: "17px", height: "17px", borderRadius: "50%", flexShrink: 0, cursor: "pointer",
        border: "2px solid " + (task.done ? accent : "rgba(255,255,255,0.2)"),
        background: task.done ? accent : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        {task.done && <span style={{ color: "#fff", fontSize: "9px", fontWeight: "bold" }}>✓</span>}
      </button>
      {editing ? (
        <input value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => e.key === "Enter" && save()}
          autoFocus style={{
            flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid " + accent,
            borderRadius: "5px", color: "#fff", padding: "3px 7px", fontSize: "12px", fontFamily: "inherit", outline: "none", direction: "rtl"
          }} />
      ) : (
        <span style={{
          flex: 1, fontSize: "13px", fontFamily: "inherit",
          color: task.done ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.82)",
          textDecoration: task.done ? "line-through" : "none"
        }}>{task.text}</span>
      )}
      {task.priority && !editing && (
        <span style={{
          fontSize: "9px", padding: "1px 6px", borderRadius: "20px", flexShrink: 0,
          background: task.priority === "عالية" ? "rgba(239,68,68,0.12)" : task.priority === "متوسطة" ? "rgba(234,179,8,0.12)" : "rgba(34,197,94,0.12)",
          color: task.priority === "عالية" ? "#ef4444" : task.priority === "متوسطة" ? "#eab308" : "#22c55e",
        }}>{task.priority}</span>
      )}
      {editing
        ? <button onClick={save} style={{ background: accent, border: "none", color: "#fff", cursor: "pointer", borderRadius: "5px", padding: "2px 9px", fontSize: "11px", fontFamily: "inherit" }}>حفظ</button>
        : <>
            <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.18)", cursor: "pointer", fontSize: "12px", padding: "0 2px" }}
              onMouseEnter={e => e.target.style.color = accent} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.18)"}>✎</button>
            <button onClick={onDelete} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.18)", cursor: "pointer", fontSize: "14px", padding: "0 2px" }}
              onMouseEnter={e => e.target.style.color = "#ef4444"} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.18)"}>×</button>
          </>
      }
    </div>
  );
}

function AddTaskForm({ onAdd, accent, placeholder }) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("متوسطة");
  const handle = () => {
    if (!text.trim()) return;
    onAdd({ id: Date.now(), text: text.trim(), done: false, priority });
    setText("");
  };
  return (
    <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
      <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()}
        placeholder={placeholder || "أضف مهمة..."} style={{
          flex: 1, minWidth: "130px", padding: "8px 11px", borderRadius: "8px",
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)",
          color: "#fff", outline: "none", fontSize: "12px", fontFamily: "inherit", direction: "rtl"
        }} />
      <select value={priority} onChange={e => setPriority(e.target.value)} style={{
        padding: "8px 7px", borderRadius: "8px", background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.09)", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: "11px"
      }}>
        <option>عالية</option><option>متوسطة</option><option>منخفضة</option>
      </select>
      <button onClick={handle} style={{
        padding: "8px 14px", borderRadius: "8px", background: accent, border: "none",
        color: "#fff", cursor: "pointer", fontWeight: "bold", fontSize: "12px", fontFamily: "inherit"
      }}>+ أضف</button>
    </div>
  );
}

function CollapsibleCard({ title, subtitle, badge, accent, card, border, sub, children, defaultOpen, highlight }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div style={{
      background: card, borderRadius: "14px",
      border: "1px solid " + (highlight ? accent + "66" : border),
      marginBottom: "12px", overflow: "hidden"
    }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", background: highlight ? accent + "0d" : "none", border: "none", cursor: "pointer", textAlign: "right"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: open ? accent : "rgba(255,255,255,0.4)", fontSize: "10px" }}>{open ? "▼" : "▶"}</span>
          <div>
            <div style={{ color: highlight ? accent : "#fff", fontSize: "14px", fontFamily: "inherit", fontWeight: "600" }}>{title}</div>
            {subtitle && <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", fontFamily: "inherit", marginTop: "2px" }}>{subtitle}</div>}
          </div>
        </div>
        {badge !== undefined && (
          <span style={{ background: accent + "22", color: accent, fontSize: "11px", padding: "2px 10px", borderRadius: "20px", fontFamily: "inherit" }}>{badge}</span>
        )}
      </button>
      {open && (
        <div style={{ padding: "0 18px 16px", borderTop: "1px solid " + border, background: sub }}>
          <div style={{ paddingTop: "14px" }}>{children}</div>
        </div>
      )}
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "16px 0 12px" }}>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", fontFamily: "inherit", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}

// ── AI Analyze Button ──────────────────────────────────────
function AIAnalyzeButton({ accent, prompt, onResult }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const text = data && data.content && data.content[0] && data.content[0].text;
      if (text) onResult(text);
      else setError("حدث خطأ، حاول مجدداً");
    } catch(e) {
      setError("تعذر الاتصال");
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
      <button onClick={analyze} disabled={loading} style={{
        display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px",
        background: loading ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, " + accent + ", rgba(255,255,255,0.25))",
        border: "none", color: loading ? "rgba(255,255,255,0.3)" : "#fff",
        cursor: loading ? "not-allowed" : "pointer", fontSize: "12px", fontFamily: "inherit", fontWeight: "bold",
        whiteSpace: "nowrap", transition: "all 0.2s"
      }}>
        {loading ? "⟳ جاري التحليل..." : "✨ تحليل بالذكاء الاصطناعي"}
      </button>
      {error && <span style={{ color: "#ef4444", fontSize: "11px", fontFamily: "inherit" }}>{error}</span>}
    </div>
  );
}

// ── Weekly View ────────────────────────────────────────────
function WeeklyView({ colors, weeklyTasks, setWeeklyTasks, monthlyTasks, setMonthlyTasks, setActiveView }) {
  const { accent, card, border, sub } = colors;
  const now = new Date();
  const currentWeekIdx = Math.min(Math.floor((now.getDate() - 1) / 7), 3);

  const [transferSummary, setTransferSummary] = useStorage("weekly_transfer_summary", "");
  const [transferred, setTransferred] = useStorage("weekly_transferred", false);

  const toggle   = (wKey, day, id) => setWeeklyTasks(p => { const w = p[wKey] || { days: {} }; return { ...p, [wKey]: { ...w, days: { ...w.days, [day]: (w.days[day] || []).map(t => t.id === id ? { ...t, done: !t.done } : t) } } }; });
  const del      = (wKey, day, id) => setWeeklyTasks(p => { const w = p[wKey] || { days: {} }; return { ...p, [wKey]: { ...w, days: { ...w.days, [day]: (w.days[day] || []).filter(t => t.id !== id) } } }; });
  const editTask = (wKey, day, id, text) => setWeeklyTasks(p => { const w = p[wKey] || { days: {} }; return { ...p, [wKey]: { ...w, days: { ...w.days, [day]: (w.days[day] || []).map(t => t.id === id ? { ...t, text } : t) } } }; });
  const addTask  = (wKey, day, task) => setWeeklyTasks(p => { const w = p[wKey] || { days: {} }; return { ...p, [wKey]: { ...w, days: { ...w.days, [day]: [...(w.days[day] || []), task] } } }; });

  const doTransfer = () => {
    if (!transferSummary.trim()) return;
    const entry = {
      id: Date.now(), summary: transferSummary,
      weeks: [0,1,2,3].map(i => ({ label: "الأسبوع " + WEEK_LABELS[i], data: weeklyTasks["w" + i] || { days: {} } }))
    };
    setMonthlyTasks(prev => {
      const slots = prev.slots || [null, null, null];
      const idx = slots.findIndex(s => !s);
      if (idx === -1) return prev;
      const newSlots = [...slots];
      newSlots[idx] = entry;
      return { ...prev, slots: newSlots };
    });
    setTransferred(true);
    setActiveView("monthly");
  };

  // build AI prompt from all weeks
  const buildPrompt = () => {
    const parts = [0,1,2,3].map(wi => {
      const wData = weeklyTasks["w" + wi] || { days: {} };
      const all = DAYS.flatMap(d => wData.days[d] || []);
      if (!all.length) return null;
      const done = all.filter(t => t.done).map(t => t.text).join("، ") || "لا يوجد";
      const notDone = all.filter(t => !t.done).map(t => t.text).join("، ") || "لا يوجد";
      return "الأسبوع " + WEEK_LABELS[wi] + ": منجز: " + done + " | غير منجز: " + notDone;
    }).filter(Boolean).join("\n");
    return "أنت مساعد إنتاجية. لديك مهام الشهر:\n\n" + parts + "\n\nاكتب ملخصاً احترافياً موجزاً (4-6 جمل) بالعربية يشمل: أبرز الإنجازات، ما لم يكتمل، وتوصية للشهر القادم. اكتب مباشرة بدون مقدمات.";
  };

  return (
    <div>
      {[0,1,2,3].map(wi => {
        const wKey = "w" + wi;
        const wData = weeklyTasks[wKey] || { days: {} };
        const allTasks = DAYS.flatMap(d => wData.days[d] || []);
        const done = allTasks.filter(t => t.done).length;
        const isCurrent = wi === currentWeekIdx;

        return (
          <CollapsibleCard key={wKey}
            title={"الأسبوع " + WEEK_LABELS[wi]}
            badge={done + "/" + allTasks.length}
            accent={accent} card={card} border={border} sub={sub}
            defaultOpen={isCurrent} highlight={isCurrent}>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
              {DAYS.map(day => {
                const dayTasks = wData.days[day] || [];
                return (
                  <div key={day} style={{ background: card, borderRadius: "10px", padding: "12px", border: "1px solid " + border }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ color: "#fff", fontSize: "12px", fontFamily: "inherit", fontWeight: "600" }}>{day}</span>
                      <span style={{ color: accent, fontSize: "10px" }}>{dayTasks.filter(t => t.done).length}/{dayTasks.length}</span>
                    </div>
                    {dayTasks.length > 0 && <ProgressBar tasks={dayTasks} accent={accent} />}
                    <AddTaskForm onAdd={t => addTask(wKey, day, t)} accent={accent} placeholder={"مهمة ليوم " + day + "..."} />
                    {dayTasks.map(t => (
                      <TaskItem key={t.id} task={t} accent={accent}
                        onToggle={() => toggle(wKey, day, t.id)}
                        onDelete={() => del(wKey, day, t.id)}
                        onEdit={txt => editTask(wKey, day, t.id, txt)} />
                    ))}
                    {dayTasks.length === 0 && (
                      <p style={{ color: "rgba(255,255,255,0.15)", fontSize: "11px", textAlign: "center", fontFamily: "inherit", margin: "4px 0 8px" }}>لا توجد مهام</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleCard>
        );
      })}

      <Divider label="نقل إلى الشهري" />
      <div style={{ background: accent + "0d", borderRadius: "12px", padding: "16px", border: "1px solid " + accent + "33" }}>
        {transferred ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>✅</span>
            <span style={{ color: accent, fontSize: "13px", fontFamily: "inherit" }}>تم النقل إلى الشهري ✅</span>
            <button onClick={() => { setTransferred(false); setTransferSummary(""); }} style={{
              marginRight: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "11px", fontFamily: "inherit"
            }}>إعادة تعيين</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", margin: 0, fontFamily: "inherit" }}>📝 ملخص الشهر — سينتقل إلى الشهري</p>
              <AIAnalyzeButton accent={accent} prompt={buildPrompt()} onResult={txt => setTransferSummary(txt)} />
            </div>
            <textarea value={transferSummary} onChange={e => setTransferSummary(e.target.value)}
              placeholder="اكتب ملخصك، أو اضغط ✨ للتحليل التلقائي..." rows={4} style={{
                width: "100%", padding: "10px", borderRadius: "9px", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: "12px",
                fontFamily: "inherit", resize: "vertical", direction: "rtl", outline: "none", boxSizing: "border-box"
              }} />
            <button onClick={doTransfer} disabled={!transferSummary.trim()} style={{
              marginTop: "10px", padding: "10px 22px", borderRadius: "9px", fontFamily: "inherit", fontSize: "12px", fontWeight: "bold",
              background: transferSummary.trim() ? accent : "rgba(255,255,255,0.06)",
              border: "none", color: transferSummary.trim() ? "#fff" : "rgba(255,255,255,0.2)",
              cursor: transferSummary.trim() ? "pointer" : "not-allowed"
            }}>✅ انقل إلى الشهري ←</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Monthly View ───────────────────────────────────────────
function MonthlyView({ colors, monthlyTasks, setMonthlyTasks, quarterlyTasks, setQuarterlyTasks, setActiveView }) {
  const { accent, card, border, sub } = colors;
  const slots = monthlyTasks.slots || [null, null, null];
  const [transferSummary, setTransferSummary] = useStorage("monthly_transfer_summary", "");
  const [transferred, setTransferred] = useStorage("monthly_transferred", false);

  const doTransfer = () => {
    if (!transferSummary.trim()) return;
    const entry = { id: Date.now(), summary: transferSummary, monthSlots: slots };
    setQuarterlyTasks(prev => {
      const newSlots = [...(prev.slots || [null, null, null])];
      const idx = newSlots.findIndex(s => !s);
      if (idx === -1) return prev;
      newSlots[idx] = entry;
      return { ...prev, slots: newSlots };
    });
    setTransferred(true);
    setActiveView("quarterly");
  };

  const buildPrompt = () => {
    const parts = slots.filter(Boolean).map((s, i) => MONTH_LABELS[i] + ": " + s.summary).join("\n");
    if (!parts) return "لا توجد بيانات كافية للتحليل.";
    return "أنت مساعد إنتاجية. لديك ملخصات الأشهر الثلاثة:\n\n" + parts + "\n\nاكتب ملخصاً ربع سنوي احترافياً (4-6 جمل) بالعربية يشمل: أبرز الإنجازات، التحديات، وتوصية للربع القادم. مباشرة بدون مقدمات.";
  };

  return (
    <div>
      {[0,1,2].map(i => {
        const slot = slots[i];
        return (
          <CollapsibleCard key={i} title={MONTH_LABELS[i]}
            badge={slot ? "مكتمل ✓" : "فارغ"}
            accent={accent} card={card} border={border} sub={sub}
            defaultOpen={!!slot} highlight={!!slot}>
            {slot ? (
              <div>
                <div style={{ background: accent + "11", borderRadius: "10px", padding: "12px 14px", marginBottom: "10px", border: "1px solid " + accent + "33" }}>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginBottom: "6px", fontFamily: "inherit" }}>الملخص المنقول من الأسبوعي</p>
                  <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", fontFamily: "inherit", margin: 0, lineHeight: "1.6" }}>{slot.summary}</p>
                </div>
                {slot.weeks && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: "8px" }}>
                    {slot.weeks.map((w, wi) => {
                      const allT = DAYS.flatMap(d => (w.data && w.data.days && w.data.days[d]) || []);
                      return (
                        <div key={wi} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "9px", padding: "9px 11px", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div style={{ color: accent, fontSize: "11px", fontFamily: "inherit", fontWeight: "600", marginBottom: "3px" }}>{w.label}</div>
                          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", fontFamily: "inherit" }}>{allT.length} مهمة · {allT.filter(t => t.done).length} منجزة</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px", fontFamily: "inherit", textAlign: "center", padding: "10px 0" }}>
                لا يوجد محتوى — انقل من الأسبوعي
              </p>
            )}
          </CollapsibleCard>
        );
      })}

      <Divider label="نقل إلى الربع السنوي" />
      <div style={{ background: accent + "0d", borderRadius: "12px", padding: "16px", border: "1px solid " + accent + "33" }}>
        {transferred ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>✅</span>
            <span style={{ color: accent, fontSize: "13px", fontFamily: "inherit" }}>تم النقل إلى الربع السنوي ✅</span>
            <button onClick={() => { setTransferred(false); setTransferSummary(""); }} style={{
              marginRight: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "11px", fontFamily: "inherit"
            }}>إعادة تعيين</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", margin: 0, fontFamily: "inherit" }}>📝 ملخص الأشهر — سينتقل إلى الربع السنوي</p>
              <AIAnalyzeButton accent={accent} prompt={buildPrompt()} onResult={txt => setTransferSummary(txt)} />
            </div>
            <textarea value={transferSummary} onChange={e => setTransferSummary(e.target.value)}
              placeholder="اكتب ملخصك، أو اضغط ✨ للتحليل التلقائي..." rows={4} style={{
                width: "100%", padding: "10px", borderRadius: "9px", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: "12px",
                fontFamily: "inherit", resize: "vertical", direction: "rtl", outline: "none", boxSizing: "border-box"
              }} />
            <button onClick={doTransfer} disabled={!transferSummary.trim()} style={{
              marginTop: "10px", padding: "10px 22px", borderRadius: "9px", fontFamily: "inherit", fontSize: "12px", fontWeight: "bold",
              background: transferSummary.trim() ? accent : "rgba(255,255,255,0.06)",
              border: "none", color: transferSummary.trim() ? "#fff" : "rgba(255,255,255,0.2)",
              cursor: transferSummary.trim() ? "pointer" : "not-allowed"
            }}>✅ انقل إلى الربع السنوي ←</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Quarterly View ─────────────────────────────────────────
function QuarterlyView({ colors, quarterlyTasks, setQuarterlyTasks, yearlyTasks, setYearlyTasks, setActiveView }) {
  const { accent, card, border, sub } = colors;
  const slots = quarterlyTasks.slots || [null, null, null];
  const [transferSummary, setTransferSummary] = useStorage("quarterly_transfer_summary", "");
  const [qLabel, setQLabel] = useStorage("quarterly_transfer_label", "Q1");
  const [transferred, setTransferred] = useStorage("quarterly_transferred", false);

  const doTransfer = () => {
    if (!transferSummary.trim()) return;
    const entry = { id: Date.now(), summary: transferSummary, label: qLabel, monthSlots: slots };
    setYearlyTasks(prev => {
      const qs = prev.quarters || { Q1: null, Q2: null, Q3: null, Q4: null };
      return { ...prev, quarters: { ...qs, [qLabel]: entry } };
    });
    setTransferred(true);
    setActiveView("yearly");
  };

  const buildPrompt = () => {
    const parts = slots.filter(Boolean).map((s, i) => MONTH_LABELS[i] + ": " + s.summary).join("\n");
    if (!parts) return "لا توجد بيانات كافية للتحليل.";
    return "أنت مساعد إنتاجية. لديك ملخصات الأشهر الثلاثة للربع " + qLabel + ":\n\n" + parts + "\n\nاكتب ملخصاً سنوياً احترافياً (4-6 جمل) بالعربية يشمل: أبرز إنجازات الربع، التحديات، والتوصيات. مباشرة بدون مقدمات.";
  };

  return (
    <div>
      {[0,1,2].map(i => {
        const slot = slots[i];
        return (
          <CollapsibleCard key={i} title={MONTH_LABELS[i]}
            badge={slot ? "مكتمل ✓" : "فارغ"}
            accent={accent} card={card} border={border} sub={sub}
            defaultOpen={!!slot} highlight={!!slot}>
            {slot ? (
              <div style={{ background: accent + "11", borderRadius: "10px", padding: "12px 14px", border: "1px solid " + accent + "33" }}>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginBottom: "6px", fontFamily: "inherit" }}>الملخص المنقول من الشهري</p>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", fontFamily: "inherit", margin: 0, lineHeight: "1.6" }}>{slot.summary}</p>
              </div>
            ) : (
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px", fontFamily: "inherit", textAlign: "center", padding: "10px 0" }}>
                لا يوجد محتوى — انقل من الشهري
              </p>
            )}
          </CollapsibleCard>
        );
      })}

      <Divider label="نقل إلى السنوي" />
      <div style={{ background: accent + "0d", borderRadius: "12px", padding: "16px", border: "1px solid " + accent + "33" }}>
        {transferred ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>✅</span>
            <span style={{ color: accent, fontSize: "13px", fontFamily: "inherit" }}>{"تم النقل إلى السنوي — " + qLabel + " ✅"}</span>
            <button onClick={() => { setTransferred(false); setTransferSummary(""); }} style={{
              marginRight: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "11px", fontFamily: "inherit"
            }}>إعادة تعيين</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                {Q_LABELS.map(q => (
                  <button key={q} onClick={() => setQLabel(q)} style={{
                    padding: "5px 13px", borderRadius: "8px", fontFamily: "inherit", fontSize: "12px", cursor: "pointer",
                    border: "1px solid " + (qLabel === q ? accent : "rgba(255,255,255,0.1)"),
                    background: qLabel === q ? accent + "22" : "transparent",
                    color: qLabel === q ? accent : "rgba(255,255,255,0.45)"
                  }}>{q}</button>
                ))}
              </div>
              <AIAnalyzeButton accent={accent} prompt={buildPrompt()} onResult={txt => setTransferSummary(txt)} />
            </div>
            <textarea value={transferSummary} onChange={e => setTransferSummary(e.target.value)}
              placeholder="اكتب ملخص الربع، أو اضغط ✨ للتحليل التلقائي..." rows={4} style={{
                width: "100%", padding: "10px", borderRadius: "9px", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: "12px",
                fontFamily: "inherit", resize: "vertical", direction: "rtl", outline: "none", boxSizing: "border-box"
              }} />
            <button onClick={doTransfer} disabled={!transferSummary.trim()} style={{
              marginTop: "10px", padding: "10px 22px", borderRadius: "9px", fontFamily: "inherit", fontSize: "12px", fontWeight: "bold",
              background: transferSummary.trim() ? accent : "rgba(255,255,255,0.06)",
              border: "none", color: transferSummary.trim() ? "#fff" : "rgba(255,255,255,0.2)",
              cursor: transferSummary.trim() ? "pointer" : "not-allowed"
            }}>{"✅ انقل " + qLabel + " إلى السنوي ←"}</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Yearly View ────────────────────────────────────────────
function YearlyView({ colors, yearlyTasks, setYearlyTasks }) {
  const { accent, card, border } = colors;
  const quarters = yearlyTasks.quarters || { Q1: null, Q2: null, Q3: null, Q4: null };
  const [annualSummary, setAnnualSummary] = useStorage("annual_summary", "");

  const buildPrompt = () => {
    const parts = Q_LABELS.filter(q => quarters[q]).map(q => q + ": " + quarters[q].summary).join("\n");
    if (!parts) return "لا توجد بيانات كافية للتحليل.";
    return "أنت مساعد إنتاجية. لديك ملخصات أرباع السنة:\n\n" + parts + "\n\nاكتب تقريراً سنوياً شاملاً (6-8 جمل) بالعربية يشمل: أبرز إنجازات السنة، أهم التحديات، ونقاط القوة والضعف، وتوصيات للسنة القادمة. مباشرة بدون مقدمات.";
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: "14px", marginBottom: "20px" }}>
        {Q_LABELS.map(q => {
          const data = quarters[q];
          return (
            <div key={q} style={{
              background: card, borderRadius: "14px",
              border: "1px solid " + (data ? accent + "55" : border), overflow: "hidden"
            }}>
              <div style={{
                background: data ? accent + "18" : "transparent",
                padding: "16px 18px", borderBottom: "1px solid " + (data ? accent + "33" : border)
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: data ? accent : "rgba(255,255,255,0.4)", fontSize: "20px", fontWeight: "900", fontFamily: "inherit" }}>{q}</span>
                  {data && <span style={{ background: accent + "22", color: accent, fontSize: "10px", padding: "2px 8px", borderRadius: "20px" }}>مكتمل ✓</span>}
                </div>
              </div>
              <div style={{ padding: "14px 18px" }}>
                {data ? (
                  <>
                    <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "13px", fontFamily: "inherit", lineHeight: "1.6", margin: "0 0 10px" }}>{data.summary}</p>
                    {data.monthSlots && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {data.monthSlots.filter(Boolean).map((ms, i) => (
                          <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "7px", padding: "7px 10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div style={{ color: accent, fontSize: "10px", fontFamily: "inherit", fontWeight: "600", marginBottom: "2px" }}>{MONTH_LABELS[i]}</div>
                            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px", fontFamily: "inherit" }}>{ms.summary}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{ color: "rgba(255,255,255,0.18)", fontSize: "12px", fontFamily: "inherit", textAlign: "center", padding: "14px 0", margin: 0 }}>
                    لا يوجد محتوى بعد
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Annual summary with AI */}
      <Divider label="التقرير السنوي" />
      <div style={{ background: accent + "0d", borderRadius: "12px", padding: "16px", border: "1px solid " + accent + "33" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", margin: 0, fontFamily: "inherit" }}>📝 ملخص السنة الكاملة</p>
          <AIAnalyzeButton accent={accent} prompt={buildPrompt()} onResult={txt => setAnnualSummary(txt)} />
        </div>
        <textarea value={annualSummary} onChange={e => setAnnualSummary(e.target.value)}
          placeholder="اكتب ملخص سنتك، أو اضغط ✨ للتحليل التلقائي..." rows={5} style={{
            width: "100%", padding: "10px", borderRadius: "9px", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: "12px",
            fontFamily: "inherit", resize: "vertical", direction: "rtl", outline: "none", boxSizing: "border-box"
          }} />
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────
export default function App() {
  const [activeView, setActiveView] = useState("weekly");
  const colors = COLORS[activeView];

  const [weeklyTasks,    setWeeklyTasks]    = useStorage("p3_weekly",    {});
  const [monthlyTasks,   setMonthlyTasks]   = useStorage("p3_monthly",   { slots: [null,null,null] });
  const [quarterlyTasks, setQuarterlyTasks] = useStorage("p3_quarterly", { slots: [null,null,null] });
  const [yearlyTasks,    setYearlyTasks]    = useStorage("p3_yearly",    { quarters: { Q1:null, Q2:null, Q3:null, Q4:null } });

  const exportData = () => {
    const data = {
      weekly: weeklyTasks, monthly: monthlyTasks,
      quarterly: quarterlyTasks, yearly: yearlyTasks,
      exportDate: new Date().toLocaleDateString("ar-SA")
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "planner-backup-" + new Date().toISOString().split("T")[0] + ".json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.weekly)    setWeeklyTasks(data.weekly);
        if (data.monthly)   setMonthlyTasks(data.monthly);
        if (data.quarterly) setQuarterlyTasks(data.quarterly);
        if (data.yearly)    setYearlyTasks(data.yearly);
        alert("تم استيراد البيانات بنجاح ✅");
      } catch { alert("خطأ في الملف — تأكد إنه ملف النسخة الاحتياطية الصحيح"); }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{
      minHeight: "100vh", background: colors.bg, direction: "rtl", padding: "18px 16px",
      transition: "background 0.5s ease", fontFamily: "'Noto Sans Arabic', sans-serif"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;600;700;900&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h1 style={{ color: "#fff", fontSize: "clamp(18px,3vw,26px)", fontWeight: "900", margin: "0 0 20px", fontFamily: "inherit" }}>
            <span style={{ color: colors.accent }}>✦</span> مخطط الإنجازات
          </h1>
          <div style={{
            display: "inline-flex", background: "rgba(255,255,255,0.04)", borderRadius: "16px",
            padding: "5px", gap: "4px", border: "1px solid rgba(255,255,255,0.07)"
          }}>
            {NAV.map(n => (
              <button key={n.key} onClick={() => setActiveView(n.key)} style={{
                padding: "10px 18px", borderRadius: "12px", fontFamily: "inherit", fontSize: "13px",
                cursor: "pointer", border: "none", transition: "all 0.25s",
                background: activeView === n.key ? COLORS[n.key].accent : "transparent",
                color: activeView === n.key ? "#fff" : "rgba(255,255,255,0.4)",
                fontWeight: activeView === n.key ? "700" : "400",
                boxShadow: activeView === n.key ? "0 4px 14px " + COLORS[n.key].accent + "44" : "none",
              }}>
                <span style={{ marginLeft: "5px" }}>{n.icon}</span>{n.label}
              </button>
            ))}
          </div>

          {/* Export / Import */}
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "12px" }}>
            <button onClick={exportData} style={{
              padding: "7px 16px", borderRadius: "9px", fontFamily: "inherit", fontSize: "12px",
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)", cursor: "pointer"
            }}>💾 تصدير نسخة احتياطية</button>
            <label style={{
              padding: "7px 16px", borderRadius: "9px", fontFamily: "inherit", fontSize: "12px",
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)", cursor: "pointer"
            }}>
              📂 استيراد نسخة احتياطية
              <input type="file" accept=".json" onChange={importData} style={{ display: "none" }} />
            </label>
          </div>
        </div>

        {activeView === "weekly"    && <WeeklyView    colors={colors} weeklyTasks={weeklyTasks} setWeeklyTasks={setWeeklyTasks} monthlyTasks={monthlyTasks} setMonthlyTasks={setMonthlyTasks} setActiveView={setActiveView} />}
        {activeView === "monthly"   && <MonthlyView   colors={colors} monthlyTasks={monthlyTasks} setMonthlyTasks={setMonthlyTasks} quarterlyTasks={quarterlyTasks} setQuarterlyTasks={setQuarterlyTasks} setActiveView={setActiveView} />}
        {activeView === "quarterly" && <QuarterlyView colors={colors} quarterlyTasks={quarterlyTasks} setQuarterlyTasks={setQuarterlyTasks} yearlyTasks={yearlyTasks} setYearlyTasks={setYearlyTasks} setActiveView={setActiveView} />}
        {activeView === "yearly"    && <YearlyView    colors={colors} yearlyTasks={yearlyTasks} setYearlyTasks={setYearlyTasks} />}

      </div>
    </div>
  );
}
