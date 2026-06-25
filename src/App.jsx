import { useState, useEffect } from "react";

const COLORS = {
  bg: "#0a0a0f",
  surface: "#111118",
  surface2: "#16161f",
  border: "#1e1e2e",
  accent: "#c8a96e",
  accentDim: "#8a7040",
  green: "#4ade80",
  red: "#f87171",
  yellow: "#fbbf24",
  blue: "#60a5fa",
  muted: "#52526b",
  text: "#e2e2f0",
  textDim: "#9999b3",
};

const STATUS_OPTIONS = ["Saved", "Applied", "Interview", "Offer", "Rejected"];
const STATUS_COLORS = {
  Saved: COLORS.blue,
  Applied: COLORS.yellow,
  Interview: COLORS.accent,
  Offer: COLORS.green,
  Rejected: COLORS.red,
};

const DEFAULT_CRITERIA = {
  title: "AI Developer",
  salary: "$100,000",
  location: "Remote",
  keywords: "Claude API, React, Python, AI agents",
  exclude: "",
};

const STORAGE_KEY = "job_scout_saved_jobs";

function loadJobs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveJobsToStorage(jobs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch {}
}

export default function JobScout() {
  const [tab, setTab] = useState("search");
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [savedJobs, setSavedJobs] = useState(loadJobs);
  const [error, setError] = useState(null);
  const [scanTime, setScanTime] = useState(null);
  const [coverLetterJob, setCoverLetterJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [expandedJob, setExpandedJob] = useState(null);
  const [resume, setResume] = useState(
    localStorage.getItem("job_scout_resume") || ""
  );
  const [showResumeModal, setShowResumeModal] = useState(false);

  useEffect(() => {
    saveJobsToStorage(savedJobs);
  }, [savedJobs]);

  useEffect(() => {
    localStorage.setItem("job_scout_resume", resume);
  }, [resume]);

  async function runSearch() {
    setLoading(true);
    setError(null);
    setResults([]);

    const prompt = `You are a job search agent. Search the web for current remote job listings matching these criteria:

Job Title: ${criteria.title}
Minimum Salary: ${criteria.salary}
Location: ${criteria.location}
Must include keywords: ${criteria.keywords}
${criteria.exclude ? `Exclude jobs mentioning: ${criteria.exclude}` : ""}

Search LinkedIn, Indeed, Glassdoor, ZipRecruiter, Wellfound, and Builtin for matching jobs posted in the last 30 days.

Return ONLY a valid JSON array with up to 10 jobs (no markdown, no explanation):
[
  {
    "id": "unique_id_1",
    "title": "AI Application Developer",
    "company": "Acme Corp",
    "location": "Remote",
    "salary": "$120k - $150k",
    "posted": "2 days ago",
    "source": "LinkedIn",
    "url": "https://linkedin.com/jobs/...",
    "description": "2-3 sentence summary of the role and requirements.",
    "matchScore": 8,
    "matchReason": "One sentence explaining why this is a good or bad match.",
    "tags": ["React", "Python", "Claude API"]
  }
]

matchScore is 1-10 based on how well this matches the criteria.
${resume ? `Here is the candidate's resume context to improve match scoring:\n${resume.slice(0, 500)}` : ""}
Return only the JSON array. No extra text.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "API error");

      const fullText = data.content
        .map((item) => (item.type === "text" ? item.text : ""))
        .filter(Boolean)
        .join("\n");

      const clean = fullText.replace(/```json|```/g, "").trim();
      const start = clean.indexOf("[");
      const end = clean.lastIndexOf("]");
      if (start === -1 || end === -1) throw new Error("No results found");

      let jsonStr = clean.slice(start, end + 1);
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1");
      const parsed = JSON.parse(jsonStr);
      setResults(parsed);
      setScanTime(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateCoverLetter(job) {
    setCoverLetterJob(job);
    setCoverLetter("");
    setCoverLetterLoading(true);

    const prompt = `Write a concise, professional cover letter for this job application.

Job Title: ${job.title}
Company: ${job.company}
Job Description: ${job.description}
${resume ? `Candidate Background:\n${resume}` : "Candidate is an AI Application Developer with experience building agents using the Anthropic Claude API, React, Vite, and Python. 10 years in digital media and web production. Currently a Web Producer at Rocket Software."}

Write a 3-paragraph cover letter:
1. Opening — why this role and company
2. Relevant experience and what you've built
3. Closing — enthusiasm and call to action

Keep it under 250 words. Professional but not stiff. Do not use generic phrases like "I am writing to express my interest." Start with something more direct and confident.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "API error");

      const text = data.content
        .map((i) => (i.type === "text" ? i.text : ""))
        .join("\n");
      setCoverLetter(text);
    } catch (err) {
      setCoverLetter("Error generating cover letter: " + err.message);
    } finally {
      setCoverLetterLoading(false);
    }
  }

  function saveJob(job) {
    const exists = savedJobs.find((j) => j.id === job.id);
    if (!exists) {
      setSavedJobs((prev) => [
        ...prev,
        { ...job, status: "Saved", savedAt: new Date().toISOString(), notes: "" },
      ]);
    }
  }

  function updateJobStatus(id, status) {
    setSavedJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status } : j))
    );
  }

  function updateJobNotes(id, notes) {
    setSavedJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, notes } : j))
    );
  }

  function removeJob(id) {
    setSavedJobs((prev) => prev.filter((j) => j.id !== id));
  }

  const filteredSaved =
    filterStatus === "All"
      ? savedJobs
      : savedJobs.filter((j) => j.status === filterStatus);

  const isSaved = (id) => savedJobs.some((j) => j.id === id);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;600;700&family=IBM+Plex+Sans:wght@300;400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0f; }
        textarea { resize: vertical; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #1e1e2e; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.surface }}>
        <div style={{ fontSize: "13px", letterSpacing: "0.2em", color: COLORS.accent, fontWeight: 600, textTransform: "uppercase" }}>⬡ Job Scout</div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => setShowResumeModal(true)} style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.muted, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", borderRadius: "2px" }}>
            {resume ? "✓ Resume Loaded" : "+ Add Resume"}
          </button>
          {scanTime && <span style={{ fontSize: "11px", color: COLORS.muted }}>Last scan: {scanTime}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${COLORS.border}`, display: "flex", background: COLORS.surface }}>
        {["search", "saved"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "14px 28px", background: "transparent", border: "none", borderBottom: tab === t ? `2px solid ${COLORS.accent}` : "2px solid transparent", color: tab === t ? COLORS.accent : COLORS.muted, fontSize: "12px", letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }}>
            {t === "search" ? "Search Jobs" : `Saved Jobs (${savedJobs.length})`}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px" }}>

        {/* SEARCH TAB */}
        {tab === "search" && (
          <>
            {/* Criteria */}
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: "4px", padding: "24px", marginBottom: "24px" }}>
              <div style={{ fontSize: "11px", color: COLORS.accent, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "20px" }}>Search Criteria</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                {[
                  { label: "Job Title", key: "title" },
                  { label: "Min Salary", key: "salary" },
                  { label: "Location", key: "location" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <div style={{ fontSize: "10px", color: COLORS.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
                    <input
                      value={criteria[key]}
                      onChange={(e) => setCriteria((p) => ({ ...p, [key]: e.target.value }))}
                      style={{ width: "100%", background: COLORS.surface2, border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", fontSize: "12px", borderRadius: "2px", fontFamily: "inherit" }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                {[
                  { label: "Keywords (include)", key: "keywords" },
                  { label: "Keywords (exclude)", key: "exclude" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <div style={{ fontSize: "10px", color: COLORS.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
                    <input
                      value={criteria[key]}
                      onChange={(e) => setCriteria((p) => ({ ...p, [key]: e.target.value }))}
                      style={{ width: "100%", background: COLORS.surface2, border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", fontSize: "12px", borderRadius: "2px", fontFamily: "inherit" }}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={runSearch}
                disabled={loading}
                style={{ padding: "12px 40px", background: "transparent", border: `1px solid ${COLORS.accent}`, color: COLORS.accent, fontSize: "12px", letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}
              >
                {loading ? "Scanning..." : "Find Jobs"}
              </button>
            </div>

            {loading && (
              <div style={{ textAlign: "center", padding: "60px 0", color: COLORS.accentDim, fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", animation: "pulse 1.5s ease-in-out infinite" }}>
                Searching LinkedIn · Indeed · Glassdoor · ZipRecruiter...
              </div>
            )}

            {error && (
              <div style={{ background: "rgba(248,113,113,0.08)", border: `1px solid rgba(248,113,113,0.3)`, borderRadius: "4px", padding: "16px", color: COLORS.red, fontSize: "12px" }}>
                Search failed: {error}
              </div>
            )}

            {results.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "11px", color: COLORS.muted, letterSpacing: "0.1em", marginBottom: "4px" }}>
                  {results.length} jobs found
                </div>
                {results.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    saved={isSaved(job.id)}
                    onSave={() => saveJob(job)}
                    onCoverLetter={() => generateCoverLetter(job)}
                    expanded={expandedJob === job.id}
                    onToggle={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                  />
                ))}
              </div>
            )}

            {!loading && !error && results.length === 0 && (
              <div style={{ textAlign: "center", color: COLORS.muted, fontSize: "12px", letterSpacing: "0.1em", padding: "60px 0" }}>
                Set your criteria and run a search.
              </div>
            )}
          </>
        )}

        {/* SAVED TAB */}
        {tab === "saved" && (
          <>
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
              {["All", ...STATUS_OPTIONS].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  style={{ padding: "6px 16px", background: filterStatus === s ? "rgba(200,169,110,0.12)" : "transparent", border: `1px solid ${filterStatus === s ? COLORS.accent : COLORS.border}`, color: filterStatus === s ? COLORS.accent : COLORS.muted, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}
                >
                  {s} {s !== "All" ? `(${savedJobs.filter(j => j.status === s).length})` : `(${savedJobs.length})`}
                </button>
              ))}
            </div>

            {filteredSaved.length === 0 ? (
              <div style={{ textAlign: "center", color: COLORS.muted, fontSize: "12px", letterSpacing: "0.1em", padding: "60px 0" }}>
                No saved jobs yet. Run a search and save jobs you like.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredSaved.map((job) => (
                  <SavedJobCard
                    key={job.id}
                    job={job}
                    onStatusChange={(s) => updateJobStatus(job.id, s)}
                    onNotesChange={(n) => updateJobNotes(job.id, n)}
                    onRemove={() => removeJob(job.id)}
                    onCoverLetter={() => generateCoverLetter(job)}
                    expanded={expandedJob === job.id}
                    onToggle={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Cover Letter Modal */}
      {coverLetterJob && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "32px" }}>
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: "4px", padding: "32px", maxWidth: "700px", width: "100%", maxHeight: "80vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "11px", color: COLORS.accent, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "4px" }}>Cover Letter</div>
                <div style={{ fontSize: "14px", color: COLORS.text }}>{coverLetterJob.title} — {coverLetterJob.company}</div>
              </div>
              <button onClick={() => { setCoverLetterJob(null); setCoverLetter(""); }} style={{ background: "transparent", border: "none", color: COLORS.muted, fontSize: "18px", cursor: "pointer" }}>✕</button>
            </div>
            {coverLetterLoading ? (
              <div style={{ color: COLORS.accentDim, fontSize: "12px", letterSpacing: "0.2em", animation: "pulse 1.5s ease-in-out infinite" }}>Generating cover letter...</div>
            ) : (
              <>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  style={{ width: "100%", minHeight: "300px", background: COLORS.surface2, border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "16px", fontSize: "13px", borderRadius: "2px", fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: "1.7" }}
                />
                <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                  <button onClick={() => navigator.clipboard.writeText(coverLetter)} style={{ padding: "8px 20px", background: "transparent", border: `1px solid ${COLORS.accent}`, color: COLORS.accent, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}>
                    Copy to Clipboard
                  </button>
                  <button onClick={() => generateCoverLetter(coverLetterJob)} style={{ padding: "8px 20px", background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.muted, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}>
                    Regenerate
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Resume Modal */}
      {showResumeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "32px" }}>
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: "4px", padding: "32px", maxWidth: "700px", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", color: COLORS.accent, letterSpacing: "0.2em", textTransform: "uppercase" }}>Your Resume / Background</div>
              <button onClick={() => setShowResumeModal(false)} style={{ background: "transparent", border: "none", color: COLORS.muted, fontSize: "18px", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ fontSize: "11px", color: COLORS.muted, marginBottom: "12px", lineHeight: "1.6" }}>
              Paste your resume or a summary of your background. This improves job matching scores and personalizes cover letters.
            </div>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your resume text here..."
              style={{ width: "100%", minHeight: "280px", background: COLORS.surface2, border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "16px", fontSize: "12px", borderRadius: "2px", fontFamily: "inherit", lineHeight: "1.6" }}
            />
            <button onClick={() => setShowResumeModal(false)} style={{ marginTop: "16px", padding: "8px 24px", background: "transparent", border: `1px solid ${COLORS.accent}`, color: COLORS.accent, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ score }) {
  const color = score >= 8 ? COLORS.green : score >= 6 ? COLORS.yellow : COLORS.red;
  return (
    <div style={{ padding: "4px 10px", borderRadius: "2px", fontSize: "11px", fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}44`, whiteSpace: "nowrap" }}>
      {score}/10
    </div>
  );
}

function JobCard({ job, saved, onSave, onCoverLetter, expanded, onToggle }) {
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: "4px", borderLeft: `3px solid ${job.matchScore >= 8 ? COLORS.green : job.matchScore >= 6 ? COLORS.yellow : COLORS.red}` }}>
      <div style={{ padding: "20px", cursor: "pointer" }} onClick={onToggle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "15px", fontWeight: 600, color: COLORS.text, marginBottom: "4px", fontFamily: "'IBM Plex Sans', sans-serif" }}>{job.title}</div>
            <div style={{ fontSize: "12px", color: COLORS.accent, marginBottom: "8px" }}>{job.company} · {job.location}</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", color: COLORS.green }}>{job.salary}</span>
              <span style={{ fontSize: "11px", color: COLORS.muted }}>·</span>
              <span style={{ fontSize: "11px", color: COLORS.muted }}>{job.source}</span>
              <span style={{ fontSize: "11px", color: COLORS.muted }}>·</span>
              <span style={{ fontSize: "11px", color: COLORS.muted }}>{job.posted}</span>
            </div>
          </div>
          <ScoreBadge score={job.matchScore} />
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${COLORS.border}`, paddingTop: "16px" }}>
          <div style={{ fontSize: "12px", color: COLORS.textDim, lineHeight: "1.7", marginBottom: "12px", fontFamily: "'IBM Plex Sans', sans-serif" }}>{job.description}</div>
          <div style={{ fontSize: "11px", color: COLORS.accentDim, fontStyle: "italic", marginBottom: "16px" }}>Match: {job.matchReason}</div>
          {job.tags && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
              {job.tags.map((tag) => (
                <span key={tag} style={{ padding: "2px 8px", background: "rgba(200,169,110,0.08)", border: `1px solid ${COLORS.border}`, color: COLORS.textDim, fontSize: "10px", borderRadius: "2px" }}>{tag}</span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 16px", background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.muted, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", borderRadius: "2px", textDecoration: "none" }}>
              View Job →
            </a>
            <button onClick={onSave} disabled={saved} style={{ padding: "7px 16px", background: saved ? "rgba(74,222,128,0.08)" : "transparent", border: `1px solid ${saved ? COLORS.green : COLORS.border}`, color: saved ? COLORS.green : COLORS.muted, fontSize: "11px", letterSpacing: "0.1em", cursor: saved ? "default" : "pointer", borderRadius: "2px", fontFamily: "inherit" }}>
              {saved ? "✓ Saved" : "Save Job"}
            </button>
            <button onClick={onCoverLetter} style={{ padding: "7px 16px", background: "transparent", border: `1px solid ${COLORS.accent}`, color: COLORS.accent, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}>
              Cover Letter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SavedJobCard({ job, onStatusChange, onNotesChange, onRemove, onCoverLetter, expanded, onToggle }) {
  const statusColor = STATUS_COLORS[job.status] || COLORS.muted;
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: "4px", borderLeft: `3px solid ${statusColor}` }}>
      <div style={{ padding: "20px", cursor: "pointer" }} onClick={onToggle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "15px", fontWeight: 600, color: COLORS.text, marginBottom: "4px", fontFamily: "'IBM Plex Sans', sans-serif" }}>{job.title}</div>
            <div style={{ fontSize: "12px", color: COLORS.accent, marginBottom: "8px" }}>{job.company} · {job.location}</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: COLORS.green }}>{job.salary}</span>
              <span style={{ fontSize: "11px", color: COLORS.muted }}>·</span>
              <span style={{ fontSize: "11px", color: COLORS.muted }}>{job.source}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select
              value={job.status}
              onChange={(e) => { e.stopPropagation(); onStatusChange(e.target.value); }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: COLORS.surface2, border: `1px solid ${statusColor}44`, color: statusColor, padding: "4px 8px", fontSize: "11px", borderRadius: "2px", fontFamily: "inherit", cursor: "pointer" }}
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${COLORS.border}`, paddingTop: "16px" }}>
          <div style={{ fontSize: "12px", color: COLORS.textDim, lineHeight: "1.7", marginBottom: "16px", fontFamily: "'IBM Plex Sans', sans-serif" }}>{job.description}</div>
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", color: COLORS.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Notes</div>
            <textarea
              value={job.notes || ""}
              onChange={(e) => onNotesChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Add notes about this job..."
              style={{ width: "100%", minHeight: "80px", background: COLORS.surface2, border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "10px", fontSize: "12px", borderRadius: "2px", fontFamily: "inherit", lineHeight: "1.6" }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 16px", background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.muted, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", borderRadius: "2px", textDecoration: "none" }}>
              View Job →
            </a>
            <button onClick={onCoverLetter} style={{ padding: "7px 16px", background: "transparent", border: `1px solid ${COLORS.accent}`, color: COLORS.accent, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}>
              Cover Letter
            </button>
            <button onClick={onRemove} style={{ padding: "7px 16px", background: "transparent", border: `1px solid rgba(248,113,113,0.3)`, color: COLORS.red, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}>
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}