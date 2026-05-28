import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { BookOpen, Edit3, Eye, LayoutDashboard, ListFilter, LogOut, Plus, Save, Search, Trash2 } from "lucide-react";
import type { AdminSummary, AdminWord, AdminWordInput } from "./adminApi";
import { createAdminWord, disableAdminWord, fetchAdminSummary, fetchAdminWords, loginAdmin, updateAdminWord } from "./adminApi";
import { Metric } from "./components/Metric";

const ADMIN_SESSION_KEY = "vocabhelper-admin-session";

type AdminTab = "dashboard" | "words" | "reading" | "writing" | "users" | "payments" | "settings";

const emptyWord: AdminWordInput = {
  word: "",
  word_type: "noun",
  phonetic: "",
  english_definition: "",
  uzbek_definition: "",
  english_example: "",
  uzbek_example: "",
  level: "A1",
  audio_url: null,
  is_active: false,
};

const navItems: Array<{ tab: AdminTab; label: string }> = [
  { tab: "dashboard", label: "Dashboard" },
  { tab: "words", label: "Words" },
  { tab: "reading", label: "Reading" },
  { tab: "writing", label: "Writing" },
  { tab: "users", label: "Users" },
  { tab: "payments", label: "Payments" },
  { tab: "settings", label: "Settings" },
];

function toInput(word: AdminWord): AdminWordInput {
  return {
    word: word.word,
    word_type: word.word_type,
    phonetic: word.phonetic,
    english_definition: word.english_definition,
    uzbek_definition: word.uzbek_definition,
    english_example: word.english_example,
    uzbek_example: word.uzbek_example,
    level: word.level,
    audio_url: word.audio_url,
    is_active: word.is_active,
  };
}

function statusLabel(word: AdminWord | AdminWordInput): string {
  return word.is_active ? "Published" : "Draft";
}

export function AdminApp(): JSX.Element {
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_SESSION_KEY) ?? "");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [words, setWords] = useState<AdminWord[]>([]);
  const [selectedWord, setSelectedWord] = useState<AdminWord | null>(null);
  const [form, setForm] = useState<AdminWordInput>(emptyWord);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [level, setLevel] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "sheets">("file");

  const authenticated = token.trim().length > 0;

  async function signIn(): Promise<void> {
    if (!password.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await loginAdmin(password);
      localStorage.setItem(ADMIN_SESSION_KEY, response.token);
      setToken(response.token);
      setPassword("");
    } catch {
      setMessage("Password noto'g'ri yoki admin login sozlanmagan.");
    } finally {
      setLoading(false);
    }
  }

  function logout(): void {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setToken("");
    setSummary(null);
    setWords([]);
  }

  function loadSummary(): void {
    if (!token) return;
    fetchAdminSummary(token)
      .then(setSummary)
      .catch(() => {
        setMessage("Admin token noto'g'ri yoki server javob bermadi.");
      });
  }

  function loadWords(): void {
    if (!token) return;
    setLoading(true);
    fetchAdminWords(token, { search, status, level })
      .then(({ items }) => setWords(items))
      .catch(() => setMessage("Words ro'yxati yuklanmadi."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!authenticated) return;
    loadSummary();
    loadWords();
  }, [authenticated, token]);

  useEffect(() => {
    if (!authenticated) return;
    const timer = window.setTimeout(loadWords, 250);
    return () => window.clearTimeout(timer);
  }, [search, status, level]);

  const preview = useMemo<AdminWordInput>(() => form, [form]);

  function editWord(word: AdminWord): void {
    setSelectedWord(word);
    setForm(toInput(word));
    setActiveTab("words");
    setEditorOpen(true);
    setMessage("");
  }

  function newWord(): void {
    setSelectedWord(null);
    setForm(emptyWord);
    setActiveTab("words");
    setEditorOpen(true);
    setMessage("");
  }

  function updateField<K extends keyof AdminWordInput>(key: K, value: AdminWordInput[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitWord(): Promise<void> {
    if (!token) return;
    setLoading(true);
    setMessage("");
    try {
      const saved = selectedWord
        ? await updateAdminWord(token, selectedWord.id, form)
        : await createAdminWord(token, form);
      setSelectedWord(saved);
      setForm(toInput(saved));
      setMessage(selectedWord ? "Word yangilandi." : "Yangi word qo'shildi.");
      setEditorOpen(false);
      loadSummary();
      loadWords();
    } catch {
      setMessage("Saqlashda xatolik bor. Maydonlarni tekshiring.");
    } finally {
      setLoading(false);
    }
  }

  async function disableWord(word: AdminWord): Promise<void> {
    if (!token) return;
    setLoading(true);
    try {
      await disableAdminWord(token, word.id);
      setMessage(`"${word.word}" draft holatiga o'tkazildi.`);
      if (selectedWord?.id === word.id) {
        setSelectedWord(null);
        setForm(emptyWord);
      }
      loadSummary();
      loadWords();
    } catch {
      setMessage("Wordni draft qilishda xatolik bor.");
    } finally {
      setLoading(false);
    }
  }

  if (!authenticated) {
    return (
      <main className="admin-login">
        <section className="admin-login-panel">
          <div className="admin-brand">
            <span className="admin-logo">VH</span>
            <span>VocabHelper Admin</span>
          </div>
          <h1>Admin panel</h1>
          <p>Content qo'shish va boshqarish uchun admin password kiriting.</p>
          {message ? <div className="admin-message">{message}</div> : null}
          <input
            className="admin-input"
            type="password"
            autoComplete="current-password"
            placeholder="Admin password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void signIn();
            }}
          />
          <button className="admin-button primary-button" type="button" disabled={loading} onClick={() => void signIn()}>
            Kirish
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-logo">VH</span>
          <span>VocabHelper Admin</span>
        </div>
        <nav className="admin-nav" aria-label="Admin navigation">
          {navItems.map((item) => (
            <button
              key={item.tab}
              type="button"
              data-active={activeTab === item.tab}
              onClick={() => setActiveTab(item.tab)}
            >
              {item.tab === "dashboard" ? <LayoutDashboard size={17} /> : null}
              {item.tab === "words" ? <BookOpen size={17} /> : null}
              {!["dashboard", "words"].includes(item.tab) ? <ListFilter size={17} /> : null}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="admin-logout" type="button" onClick={logout}>
          <LogOut size={16} /> Chiqish
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p>{activeTab === "words" ? "Content library" : "Admin workspace"}</p>
            <h1>{navItems.find((item) => item.tab === activeTab)?.label}</h1>
          </div>
          <div className="admin-topbar-actions">
            {activeTab === "words" ? (
              <button className="admin-button secondary-button" type="button" onClick={() => setUploadOpen(true)}>
                <Plus size={16} /> Upload File
              </button>
            ) : null}
            <button className="admin-button primary-button" type="button" onClick={newWord}>
              <Plus size={16} /> Add word
            </button>
          </div>
        </header>

        {message ? <div className="admin-message">{message}</div> : null}

        {activeTab === "dashboard" ? (
          <section className="admin-dashboard">
            <div className="admin-metrics">
              <Metric label="Total words" value={summary?.stats.total_words ?? 0} />
              <Metric label="Published" value={summary?.stats.published_words ?? 0} />
              <Metric label="Drafts" value={summary?.stats.draft_words ?? 0} />
              <Metric label="Users" value={summary?.stats.total_users ?? 0} />
              <Metric label="Premium" value={summary?.stats.premium_users ?? 0} />
              <Metric label="Pending pay" value={summary?.stats.pending_payments ?? 0} />
            </div>
            <section className="admin-panel">
              <div className="admin-panel-head">
                <h2>Recent words</h2>
                <button type="button" onClick={() => setActiveTab("words")}>Open library</button>
              </div>
              <div className="admin-mini-list">
                {(summary?.recent_words ?? []).map((word) => (
                  <button key={word.id} type="button" onClick={() => editWord(word)}>
                    <strong>{word.word}</strong>
                    <span>{word.level} · {statusLabel(word)}</span>
                  </button>
                ))}
              </div>
            </section>
          </section>
        ) : null}

        {activeTab === "words" ? (
          <section className="admin-words-layout">
            <section className="admin-panel admin-library">
              <div className="admin-tools">
                <label>
                  <Search size={15} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search word, meaning, definition"
                  />
                </label>
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="all">All</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
                <select value={level} onChange={(event) => setLevel(event.target.value)}>
                  <option value="">All levels</option>
                  {["A1", "A2", "B1", "B2", "C1"].map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="admin-table">
                <div className="admin-table-row admin-table-head">
                  <span>Word</span>
                  <span>Meaning</span>
                  <span>Level</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {words.map((word) => (
                  <div className="admin-table-row" key={word.id}>
                    <strong>{word.word}</strong>
                    <span>{word.uzbek_definition}</span>
                    <span>{word.level}</span>
                    <span>{statusLabel(word)}</span>
                    <span className="admin-row-actions">
                      <button type="button" title="Edit" onClick={() => editWord(word)}><Edit3 size={15} /></button>
                      <button type="button" title="Draft" onClick={() => disableWord(word)}><Trash2 size={15} /></button>
                    </span>
                  </div>
                ))}
              </div>
              {loading ? <p className="muted">Loading...</p> : null}
            </section>
          </section>
        ) : null}

        {!["dashboard", "words"].includes(activeTab) ? (
          <section className="admin-panel admin-placeholder">
            <h2>{navItems.find((item) => item.tab === activeTab)?.label}</h2>
            <p>Bu bo'lim keyingi bosqich uchun joy tayyorlab qo'yildi.</p>
          </section>
        ) : null}
      </main>

      {editorOpen ? (
        <div className="admin-word-modal" role="presentation" onClick={() => setEditorOpen(false)}>
          <section
            aria-modal="true"
            className="admin-word-dialog"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-panel-head">
              <h2>{selectedWord ? "Edit word" : "Add word"}</h2>
              <button type="button" onClick={() => setEditorOpen(false)}>Close</button>
            </div>
            <div className="admin-word-dialog-grid">
              <div className="admin-word-form-pane">
                <div className="admin-form-grid">
                  <label>Word<input value={form.word} onChange={(e) => updateField("word", e.target.value)} /></label>
                  <label>Type<input value={form.word_type} onChange={(e) => updateField("word_type", e.target.value)} /></label>
                  <label>Phonetic<input value={form.phonetic} onChange={(e) => updateField("phonetic", e.target.value)} /></label>
                  <label>Level<select value={form.level} onChange={(e) => updateField("level", e.target.value)}>
                    {["A1", "A2", "B1", "B2", "C1"].map((item) => <option key={item} value={item}>{item}</option>)}
                  </select></label>
                  <label className="span-2">English definition<textarea value={form.english_definition} onChange={(e) => updateField("english_definition", e.target.value)} /></label>
                  <label className="span-2">Uzbek meaning<textarea value={form.uzbek_definition} onChange={(e) => updateField("uzbek_definition", e.target.value)} /></label>
                  <label className="span-2">English example<textarea value={form.english_example} onChange={(e) => updateField("english_example", e.target.value)} /></label>
                  <label className="span-2">Uzbek example<textarea value={form.uzbek_example} onChange={(e) => updateField("uzbek_example", e.target.value)} /></label>
                  <label className="span-2">Audio URL<input value={form.audio_url ?? ""} onChange={(e) => updateField("audio_url", e.target.value || null)} /></label>
                  <label className="admin-check span-2">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => updateField("is_active", e.target.checked)} />
                    Publish this word
                  </label>
                </div>
                <div className="admin-actions">
                  <button className="secondary-button" type="button" onClick={newWord}>Clear</button>
                  <button className="primary-button" type="button" disabled={loading} onClick={submitWord}>
                    <Save size={16} /> Save word
                  </button>
                </div>
              </div>
              <div className="admin-word-preview-pane">
                <div className="admin-preview-title"><Eye size={16} /> Preview</div>
                <div className="flashcard admin-preview-card">
                  <div className="flashcard-side flashcard-front">
                    <div className="flashcard-meta">
                      <span>Karta · {preview.level || "A1"}</span>
                      <span>{preview.word_type || "type"}</span>
                    </div>
                    <div className="flashcard-word-block">
                      <h2>{preview.word || "word"}</h2>
                      <p className="phonetic">{preview.phonetic || "/.../"} · {preview.word_type || "type"}</p>
                    </div>
                    <div className="flashcard-hint"><em>Ma'noni ko'rish uchun bosing.</em><span>♪</span></div>
                  </div>
                </div>
                <div className="admin-preview-back">
                  <strong>{preview.english_definition || "English definition"}</strong>
                  <span>{preview.uzbek_definition || "Uzbek meaning"}</span>
                  <em>{preview.english_example || "English example"}</em>
                  <span>{preview.uzbek_example || "Uzbek example"}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {uploadOpen ? (
        <div className="admin-upload-modal" role="presentation" onClick={() => setUploadOpen(false)}>
          <section
            aria-modal="true"
            className="admin-upload-dialog"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-panel-head">
              <h2>Upload words</h2>
              <button type="button" onClick={() => setUploadOpen(false)}>Close</button>
            </div>
            <div className="admin-upload-tabs">
              <button type="button" data-active={uploadMode === "file"} onClick={() => setUploadMode("file")}>
                CSV / Excel file
              </button>
              <button type="button" data-active={uploadMode === "sheets"} onClick={() => setUploadMode("sheets")}>
                Google Sheets
              </button>
            </div>
            {uploadMode === "file" ? (
              <label className="admin-upload-box">
                <span>Choose .csv or .xlsx file</span>
                <input type="file" accept=".csv,.xlsx,.xls" />
              </label>
            ) : (
              <label className="admin-upload-box">
                <span>Paste public Google Sheets CSV link</span>
                <input type="url" placeholder="https://docs.google.com/spreadsheets/..." />
              </label>
            )}
            <p className="muted">
              Columns: word, word_type, phonetic, english_definition, uzbek_definition,
              english_example, uzbek_example, level, is_active.
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
