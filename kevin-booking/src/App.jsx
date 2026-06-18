import { useState, useEffect } from "react";

const MEETING_TYPES = [
  { id: "quick", label: "Quick Chat", duration: 15, description: "Introductions, fast questions, or a quick sync.", color: "#10B981", emoji: "⚡" },
  { id: "standard", label: "30-min Meeting", duration: 30, description: "Project check-ins, collaboration, or a focused discussion.", color: "#3B82F6", emoji: "💬" },
  { id: "deep", label: "Deep Dive", duration: 60, description: "Strategy sessions, detailed reviews, or complex problem-solving.", color: "#8B5CF6", emoji: "🔭" },
  { id: "custom", label: "Custom", duration: null, description: "You set the agenda and duration — let's make it work.", color: "#F59E0B", emoji: "✨" },
];

const LOCATION_TYPES = [
  { id: "meet", label: "Google Meet", icon: "🎥" },
  { id: "phone", label: "Phone Call", icon: "📞" },
  { id: "inperson", label: "In Person", icon: "📍" },
];

const ALL_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
const formatHour = (h) => h === 12 ? "12:00 PM" : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;

const API = "/api/calendar";

export default function BookingPage() {
  const today = new Date();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [customDuration, setCustomDuration] = useState(45);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [bookedEvent, setBookedEvent] = useState(null);
  const [error, setError] = useState("");
  const [busySlots, setBusySlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const duration = selectedType?.id === "custom" ? customDuration : selectedType?.duration;

  const isPastDay = (d) => new Date(calYear, calMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isWeekend = (d) => { const day = new Date(calYear, calMonth, d).getDay(); return day === 0 || day === 6; };

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); setSelectedDay(null); setSelectedHour(null); setBusySlots([]); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); setSelectedDay(null); setSelectedHour(null); setBusySlots([]); };

  useEffect(() => {
    if (!selectedDay) return;
    setLoadingSlots(true);
    setBusySlots([]);
    setSelectedHour(null);

    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;

    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check_availability", date: dateStr }),
    })
      .then(r => r.json())
      .then(data => {
        setBusySlots((data.busy || []).map(b => ({ start: new Date(b.start), end: new Date(b.end) })));
      })
      .catch(() => setBusySlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDay, calYear, calMonth]);

  const isHourBusy = (h) => {
    if (!duration) return false;
    const slotStart = new Date(calYear, calMonth, selectedDay, h, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);
    return busySlots.some(b => slotStart < b.end && slotEnd > b.start);
  };

  const isOutsideHours = (h) => {
    if (!duration) return false;
    const slotEnd = new Date(calYear, calMonth, selectedDay, h, 0, 0).getTime() + duration * 60000;
    return slotEnd > new Date(calYear, calMonth, selectedDay, 16, 0, 0).getTime();
  };

  const selectedDate = selectedDay ? new Date(calYear, calMonth, selectedDay) : null;

  async function bookMeeting() {
    setLoading(true); setError("");
    try {
      const start = new Date(calYear, calMonth, selectedDay, selectedHour, 0, 0);
      const end = new Date(start.getTime() + duration * 60000);
      const locationLabel = LOCATION_TYPES.find(l => l.id === selectedLocation)?.label || "";

      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "book",
          title: `${selectedType?.label} with ${form.name}`,
          start: start.toISOString(),
          end: end.toISOString(),
          location: locationLabel,
          description: `Meeting with ${form.name} (${form.email}). Format: ${locationLabel}. Notes: ${form.notes || "None"}. Booked via Kevin's scheduling page.`,
          attendeeEmail: form.email,
          addMeet: selectedLocation === "meet",
        }),
      });

      const data = await res.json();

      if (data.success) {
        setBookedEvent({ start, end, meetLink: data.meetLink || "", locationLabel });
        setStep(5);
      } else {
        setError(data.error || "Booking failed. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  const canProceed1 = selectedType !== null && (selectedType.id !== "custom" || customDuration > 0);
  const canProceed2 = selectedDay !== null && selectedHour !== null && selectedLocation !== null;
  const canProceed3 = form.name.trim() && form.email.includes("@");

  const card = { background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, border: "1px solid #E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
  const btnPrimary = (active) => ({ flex: 1, padding: "13px", borderRadius: 12, border: "none", background: active ? "#2563EB" : "#E5E7EB", color: active ? "#fff" : "#9CA3AF", fontWeight: 700, fontSize: 15, cursor: active ? "pointer" : "not-allowed", transition: "all 0.2s" });
  const btnBack = { padding: "13px 20px", borderRadius: 12, border: "1px solid #D1D5DB", background: "#fff", color: "#6B7280", cursor: "pointer", fontSize: 14 };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Inter','Segoe UI',sans-serif", color: "#111827", padding: "32px 16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: "linear-gradient(135deg, #2563EB, #7C3AED)", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, color: "#fff", fontWeight: 700, boxShadow: "0 4px 14px rgba(37,99,235,0.3)" }}>K</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px", color: "#111827", letterSpacing: "-0.5px" }}>Book a meeting with Kevin</h1>
          <p style={{ color: "#6B7280", margin: 0, fontSize: 15 }}>Pick a time that works for you — Kevin will confirm right away.</p>
        </div>

        {/* Step indicator */}
        {step < 5 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
            {["Type", "Time", "Details", "Confirm"].map((label, i) => {
              const num = i + 1; const active = step === num; const done = step > num;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: done ? "#10B981" : active ? "#2563EB" : "#E5E7EB", color: done || active ? "#fff" : "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, margin: "0 auto 4px", transition: "all 0.3s" }}>{done ? "✓" : num}</div>
                    <div style={{ fontSize: 11, color: active ? "#111827" : "#9CA3AF", fontWeight: active ? 600 : 400 }}>{label}</div>
                  </div>
                  {i < 3 && <div style={{ width: 44, height: 2, background: done ? "#10B981" : "#E5E7EB", margin: "0 4px 18px", borderRadius: 2 }} />}
                </div>
              );
            })}
          </div>
        )}

        {/* STEP 1: Meeting Type */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 16, color: "#374151" }}>What kind of meeting?</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {MEETING_TYPES.map(type => {
                const sel = selectedType?.id === type.id;
                return (
                  <div key={type.id} onClick={() => setSelectedType(type)} style={{ padding: "16px 18px", borderRadius: 14, border: `2px solid ${sel ? type.color : "#E5E7EB"}`, background: sel ? `${type.color}08` : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, transition: "all 0.18s", boxShadow: sel ? `0 0 0 3px ${type.color}22` : "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: `${type.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{type.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: "#111827", marginBottom: 2 }}>
                        {type.label}
                        {type.duration && <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 400, marginLeft: 8 }}>{type.duration} min</span>}
                      </div>
                      <div style={{ fontSize: 13, color: "#6B7280" }}>{type.description}</div>
                    </div>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${sel ? type.color : "#D1D5DB"}`, background: sel ? type.color : "transparent", flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
            {selectedType?.id === "custom" && (
              <div style={{ ...card, marginTop: 12 }}>
                <label style={{ fontSize: 13, color: "#6B7280", display: "block", marginBottom: 8 }}>Duration (minutes)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <input type="range" min="15" max="120" step="15" value={customDuration} onChange={e => setCustomDuration(Number(e.target.value))} style={{ flex: 1, accentColor: "#F59E0B" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#F59E0B", minWidth: 46 }}>{customDuration}m</span>
                </div>
              </div>
            )}
            <button onClick={() => canProceed1 && setStep(2)} style={{ marginTop: 24, width: "100%", padding: "14px", borderRadius: 12, border: "none", background: canProceed1 ? "#2563EB" : "#E5E7EB", color: canProceed1 ? "#fff" : "#9CA3AF", fontWeight: 700, fontSize: 15, cursor: canProceed1 ? "pointer" : "not-allowed" }}>
              Choose a Time →
            </button>
          </div>
        )}

        {/* STEP 2: Date & Time */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 16, color: "#374151" }}>Pick a date & time</h2>
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <button onClick={prevMonth} style={{ background: "none", border: "none", color: "#2563EB", fontSize: 22, cursor: "pointer" }}>‹</button>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{MONTH_NAMES[calMonth]} {calYear}</span>
                <button onClick={nextMonth} style={{ background: "none", border: "none", color: "#2563EB", fontSize: 22, cursor: "pointer" }}>›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 6 }}>
                {DAY_NAMES.map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#9CA3AF", fontWeight: 600, padding: "3px 0" }}>{d}</div>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const d = i + 1; const disabled = isPastDay(d) || isWeekend(d); const sel = selectedDay === d;
                  return (
                    <button key={d} onClick={() => !disabled && setSelectedDay(d)} style={{ padding: "8px 0", borderRadius: 8, border: "none", background: sel ? "#2563EB" : "transparent", color: disabled ? "#D1D5DB" : sel ? "#fff" : "#374151", fontWeight: sel ? 700 : 400, cursor: disabled ? "not-allowed" : "pointer", fontSize: 13 }}>{d}</button>
                  );
                })}
              </div>
            </div>

            {selectedDay && (
              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>Available times — {MONTH_NAMES[calMonth]} {selectedDay}</div>
                  {loadingSlots && (
                    <div style={{ fontSize: 12, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #E5E7EB", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      Checking calendar…
                    </div>
                  )}
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                {!loadingSlots && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {ALL_HOURS.map(h => {
                      const busy = isHourBusy(h); const outside = isOutsideHours(h); const unavailable = busy || outside; const sel = selectedHour === h;
                      return (
                        <button key={h} onClick={() => !unavailable && setSelectedHour(h)} style={{ padding: "11px 6px", borderRadius: 10, border: `2px solid ${sel ? "#2563EB" : unavailable ? "#F3F4F6" : "#E5E7EB"}`, background: sel ? "#EFF6FF" : unavailable ? "#F9FAFB" : "#fff", color: sel ? "#2563EB" : unavailable ? "#D1D5DB" : "#374151", fontWeight: sel ? 600 : 400, fontSize: 13, cursor: unavailable ? "not-allowed" : "pointer", position: "relative" }}>
                          {formatHour(h)}
                          {busy && <div style={{ position: "absolute", top: 4, right: 6, width: 6, height: 6, borderRadius: "50%", background: "#EF4444" }} />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {!loadingSlots && busySlots.length > 0 && (
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#9CA3AF" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} /> Already booked
                  </div>
                )}
              </div>
            )}

            {selectedHour !== null && (
              <div style={card}>
                <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 12, fontWeight: 500 }}>How do you want to meet?</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {LOCATION_TYPES.map(loc => {
                    const sel = selectedLocation === loc.id;
                    return (
                      <button key={loc.id} onClick={() => setSelectedLocation(loc.id)} style={{ flex: 1, padding: "12px 6px", borderRadius: 10, border: `2px solid ${sel ? "#2563EB" : "#E5E7EB"}`, background: sel ? "#EFF6FF" : "#fff", color: sel ? "#2563EB" : "#6B7280", fontSize: 12, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 20 }}>{loc.icon}</span>
                        <span style={{ fontWeight: sel ? 600 : 400 }}>{loc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => setStep(1)} style={btnBack}>← Back</button>
              <button onClick={() => canProceed2 && setStep(3)} style={btnPrimary(canProceed2)}>Your Details →</button>
            </div>
          </div>
        )}

        {/* STEP 3: Details */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 16, color: "#374151" }}>Tell Kevin a bit about yourself</h2>
            <div style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { key: "name", label: "Your Name", placeholder: "Jane Smith", type: "text" },
                { key: "email", label: "Email Address", placeholder: "jane@example.com", type: "email" },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 13, color: "#6B7280", marginBottom: 6, fontWeight: 500 }}>{label}</label>
                  <input type={type} placeholder={placeholder} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #D1D5DB", background: "#fff", color: "#111827", fontSize: 15, boxSizing: "border-box", outline: "none" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#6B7280", marginBottom: 6, fontWeight: 500 }}>Notes (optional)</label>
                <textarea placeholder="What do you want to discuss?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #D1D5DB", background: "#fff", color: "#111827", fontSize: 15, boxSizing: "border-box", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={btnBack}>← Back</button>
              <button onClick={() => canProceed3 && setStep(4)} style={btnPrimary(canProceed3)}>Review Booking →</button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirm */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 16, color: "#374151" }}>Confirm your booking</h2>
            <div style={card}>
              {[
                { label: "Meeting", value: `${selectedType?.emoji} ${selectedType?.label}` },
                { label: "Duration", value: `${duration} minutes` },
                { label: "Date", value: selectedDate?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) },
                { label: "Time", value: formatHour(selectedHour) },
                { label: "Format", value: LOCATION_TYPES.find(l => l.id === selectedLocation)?.label },
                { label: "Name", value: form.name },
                { label: "Email", value: form.email },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
                  <span style={{ color: "#9CA3AF", fontSize: 14 }}>{label}</span>
                  <span style={{ fontWeight: 500, fontSize: 14, color: "#111827" }}>{value}</span>
                </div>
              ))}
              {form.notes && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "#F9FAFB", borderRadius: 8, fontSize: 13, color: "#6B7280" }}>
                  <span style={{ color: "#9CA3AF" }}>Notes: </span>{form.notes}
                </div>
              )}
            </div>
            {error && <div style={{ color: "#DC2626", fontSize: 14, marginBottom: 14, padding: "10px 14px", background: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA" }}>{error}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(3)} style={btnBack}>← Back</button>
              <button onClick={bookMeeting} disabled={loading} style={{ ...btnPrimary(!loading), background: loading ? "#E5E7EB" : "#2563EB" }}>
                {loading ? "Booking…" : "Confirm & Book 🎉"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Done */}
        {step === 5 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 60, marginBottom: 14 }}>🎉</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6, color: "#111827" }}>You're booked with Kevin!</h2>
            <p style={{ color: "#6B7280", marginBottom: 28 }}>
              A calendar invite has been sent to <strong style={{ color: "#2563EB" }}>{form.email}</strong>.
            </p>
            <div style={{ ...card, textAlign: "left" }}>
              {[
                { label: "Meeting", value: `${selectedType?.emoji} ${selectedType?.label}` },
                { label: "Duration", value: `${duration} minutes` },
                { label: "Date & Time", value: `${bookedEvent?.start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${bookedEvent?.start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` },
                { label: "Format", value: bookedEvent?.locationLabel },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
                  <span style={{ color: "#9CA3AF", fontSize: 14 }}>{label}</span>
                  <span style={{ fontWeight: 500, fontSize: 14, color: "#111827" }}>{value}</span>
                </div>
              ))}
              {bookedEvent?.meetLink && (
                <div style={{ marginTop: 16 }}>
                  <a href={bookedEvent.meetLink} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, background: "#EFF6FF", color: "#2563EB", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                    🎥 Join Google Meet
                  </a>
                </div>
              )}
            </div>
            <button onClick={() => { setStep(1); setSelectedType(null); setSelectedDay(null); setSelectedHour(null); setSelectedLocation(null); setForm({ name: "", email: "", notes: "" }); setBookedEvent(null); setBusySlots([]); }}
              style={{ padding: "11px 24px", borderRadius: 12, border: "1px solid #D1D5DB", background: "#fff", color: "#6B7280", cursor: "pointer", fontSize: 14 }}>
              Book Another Meeting
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
