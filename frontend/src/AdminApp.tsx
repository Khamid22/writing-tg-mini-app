import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { BookOpen, Check, Edit3, Eye, LayoutDashboard, ListFilter, LogOut, Plus, Save, Search, Trash2, Users, CreditCard, Settings } from "lucide-react";
import type {
  AdminAnalytics,
  AdminPayment,
  AdminSettings,
  AdminSettingsPatch,
  AdminSummary,
  AdminUser,
  AdminUserDetail,
  AdminWord,
  AdminWordInput,
  AnalyticsPoint,
} from "./adminApi";
import {
  approveAdminPayment,
  cancelAdminPayment,
  createAdminWord,
  disableAdminWord,
  fetchAdminAnalytics,
  fetchAdminPayments,
  fetchAdminSettings,
  fetchAdminSummary,
  fetchAdminUserDetail,
  fetchAdminUsers,
  fetchAdminWords,
  importAdminWordsFile,
  importAdminWordsUrl,
  loginAdmin,
  patchAdminSettings,
  updateAdminUser,
  updateAdminWord,
} from "./adminApi";
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
  topic: "Everyday English",
  collection: "Daily Vocabulary",
  tags: "",
  collocations: "",
  common_mistake: "",
  writing_prompt: "",
  difficulty_order: 0,
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
    topic: word.topic,
    collection: word.collection,
    tags: word.tags,
    collocations: word.collocations,
    common_mistake: word.common_mistake,
    writing_prompt: word.writing_prompt,
    difficulty_order: word.difficulty_order,
    audio_url: word.audio_url,
    is_active: word.is_active,
  };
}

function statusLabel(word: AdminWord | AdminWordInput): string {
  return word.is_active ? "Published" : "Draft";
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(iso);
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  return <span className={`admin-badge admin-badge-${status}`}>{status}</span>;
}

function BarChart({ data, color }: { data: AnalyticsPoint[]; color?: string }): JSX.Element {
  if (data.length === 0) return <div className="admin-chart-empty">No data</div>;
  const max = Math.max(...data.map((d) => d.count), 1);
  const W = 400;
  const H = 72;
  const gap = 2;
  const barW = (W - gap * (data.length - 1)) / data.length;
  const fill = color ?? "var(--admin-accent, #6366f1)";
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="admin-spark-chart"
      aria-hidden="true"
    >
      {data.map((d, i) => {
        const h = Math.max(2, (d.count / max) * H);
        const x = i * (barW + gap);
        const y = H - h;
        return (
          <rect key={d.date} x={x} y={y} width={barW} height={h} fill={fill} rx={1}>
            <title>{d.date}: {d.count}</title>
          </rect>
        );
      })}
    </svg>
  );
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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadAsPublished, setUploadAsPublished] = useState(true);

  // Users tab state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [userTierFilter, setUserTierFilter] = useState("");
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUserDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Payments tab state
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentCounts, setPaymentCounts] = useState({ pending: 0, submitted: 0, approved: 0, cancelled: 0 });
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");

  // Settings tab state
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<AdminSettingsPatch>({});
  const [settingsSaved, setSettingsSaved] = useState(false);

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
      .catch(() => setMessage("Admin token noto'g'ri yoki server javob bermadi."));
  }

  function loadWords(): void {
    if (!token) return;
    setLoading(true);
    fetchAdminWords(token, { search, status, level })
      .then(({ items }) => setWords(items))
      .catch(() => setMessage("Words ro'yxati yuklanmadi."))
      .finally(() => setLoading(false));
  }

  function loadUsers(): void {
    if (!token) return;
    setLoading(true);
    fetchAdminUsers(token, { search: userSearch, tier: userTierFilter })
      .then((res) => { setUsers(res.items); setUsersTotal(res.total); })
      .catch(() => setMessage("Foydalanuvchilar yuklanmadi."))
      .finally(() => setLoading(false));
  }

  function loadAnalytics(): void {
    if (!token || analytics) return;
    fetchAdminAnalytics(token, 30)
      .then(setAnalytics)
      .catch(() => {});
  }

  function loadPayments(): void {
    if (!token) return;
    setLoading(true);
    fetchAdminPayments(token, { status: paymentStatusFilter })
      .then((res) => {
        setPayments(res.items);
        setPaymentsTotal(res.total);
        setPaymentCounts(res.counts);
      })
      .catch(() => setMessage("To'lovlar yuklanmadi."))
      .finally(() => setLoading(false));
  }

  function loadSettings(): void {
    if (!token) return;
    fetchAdminSettings(token)
      .then((s) => { setAdminSettings(s); setSettingsForm(s); })
      .catch(() => {});
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

  useEffect(() => {
    if (activeTab === "users") { loadUsers(); loadAnalytics(); }
    if (activeTab === "payments") loadPayments();
    if (activeTab === "settings") loadSettings();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "users") {
      const t = window.setTimeout(loadUsers, 250);
      return () => window.clearTimeout(t);
    }
  }, [userSearch, userTierFilter]);

  useEffect(() => {
    if (activeTab === "payments") loadPayments();
  }, [paymentStatusFilter]);

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
      if (selectedWord?.id === word.id) { setSelectedWord(null); setForm(emptyWord); }
      loadSummary();
      loadWords();
    } catch {
      setMessage("Wordni draft qilishda xatolik bor.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadWords(): Promise<void> {
    if (!token) return;
    if (uploadMode === "file" && !uploadFile) { setMessage("Avval CSV yoki XLSX file tanlang."); return; }
    if (uploadMode === "sheets" && !uploadUrl.trim()) { setMessage("Google Sheets CSV linkini kiriting."); return; }
    setLoading(true);
    setMessage("");
    try {
      const result = uploadMode === "file" && uploadFile
        ? await importAdminWordsFile(token, uploadFile, uploadAsPublished)
        : await importAdminWordsUrl(token, uploadUrl.trim(), uploadAsPublished);
      const skipped = result.skipped_count ? ` ${result.skipped_count} qator o'tkazib yuborildi.` : "";
      setMessage(`${result.imported} ta word yuklandi.${skipped}`);
      setUploadOpen(false); setUploadFile(null); setUploadUrl("");
      loadSummary(); loadWords();
    } catch {
      setMessage("Upload ishlamadi. File ustunlari yoki linkni tekshiring.");
    } finally {
      setLoading(false);
    }
  }

  async function openUserDetail(userId: number): Promise<void> {
    setDetailLoading(true);
    setDetailOpen(true);
    setDetailUser(null);
    try {
      const d = await fetchAdminUserDetail(token, userId);
      setDetailUser(d);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSetTier(userId: number, tier: "free" | "paid"): Promise<void> {
    try {
      const updated = await updateAdminUser(token, userId, { tier });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, tier: updated.tier, premium_until: updated.premium_until } : u)));
      if (detailUser?.id === userId) setDetailUser((d) => d ? { ...d, tier: updated.tier } : d);
    } catch {
      setMessage("Tier o'zgartirilmadi.");
    }
  }

  async function handlePaymentAction(code: string, action: "approve" | "cancel"): Promise<void> {
    try {
      const updated = action === "approve"
        ? await approveAdminPayment(token, code)
        : await cancelAdminPayment(token, code);
      setPayments((prev) => prev.map((p) => (p.code === code ? updated : p)));
      setPaymentCounts((c) => {
        const prev = payments.find((p) => p.code === code)?.status ?? "pending";
        const dec = (prev === "pending" || prev === "submitted") ? prev : null;
        return {
          ...c,
          pending: dec === "pending" ? c.pending - 1 : c.pending,
          submitted: dec === "submitted" ? c.submitted - 1 : c.submitted,
          approved: action === "approve" ? c.approved + 1 : c.approved,
          cancelled: action === "cancel" ? c.cancelled + 1 : c.cancelled,
        };
      });
    } catch {
      setMessage("Amal bajarilmadi.");
    }
  }

  async function saveSettings(): Promise<void> {
    if (!token) return;
    try {
      const saved = await patchAdminSettings(token, settingsForm);
      setAdminSettings(saved);
      setSettingsForm(saved);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch {
      setMessage("Sozlamalar saqlanmadi.");
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
            onKeyDown={(event) => { if (event.key === "Enter") void signIn(); }}
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
              {item.tab === "users" ? <Users size={17} /> : null}
              {item.tab === "payments" ? <CreditCard size={17} /> : null}
              {item.tab === "settings" ? <Settings size={17} /> : null}
              {!["dashboard", "words", "users", "payments", "settings"].includes(item.tab) ? <ListFilter size={17} /> : null}
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
            {["dashboard", "words"].includes(activeTab) ? (
              <button className="admin-button primary-button" type="button" onClick={newWord}>
                <Plus size={16} /> Add word
              </button>
            ) : null}
          </div>
        </header>

        {message ? <div className="admin-message">{message}</div> : null}

        {/* ── Dashboard ── */}
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

        {/* ── Words ── */}
        {activeTab === "words" ? (
          <section className="admin-words-layout">
            <section className="admin-panel admin-library">
              <div className="admin-tools">
                <label>
                  <Search size={15} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search word, meaning, definition" />
                </label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="all">All</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
                <select value={level} onChange={(e) => setLevel(e.target.value)}>
                  <option value="">All levels</option>
                  {["A1", "A2", "B1", "B2", "C1"].map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="admin-table">
                <div className="admin-table-row admin-table-head">
                  <span>Word</span><span>Meaning</span><span>Topic</span><span>Status</span><span>Actions</span>
                </div>
                {words.map((word) => (
                  <div className="admin-table-row" key={word.id}>
                    <strong>{word.word}</strong>
                    <span>{word.uzbek_definition}</span>
                    <span>{word.topic || word.level}</span>
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

        {/* ── Users ── */}
        {activeTab === "users" ? (
          <section className="admin-users-layout">
            <div className="admin-analytics-grid">
              <section className="admin-panel admin-chart-panel">
                <div className="admin-chart-head">
                  <h3>New signups</h3>
                  <span className="admin-chart-sub">Last 30 days</span>
                </div>
                <BarChart data={analytics?.signups ?? []} />
                <div className="admin-chart-footer">
                  <span>{(analytics?.signups ?? []).reduce((s, d) => s + d.count, 0)} total</span>
                </div>
              </section>
              <section className="admin-panel admin-chart-panel">
                <div className="admin-chart-head">
                  <h3>Daily active users</h3>
                  <span className="admin-chart-sub">Last 30 days</span>
                </div>
                <BarChart data={analytics?.dau ?? []} color="var(--admin-green, #22c55e)" />
                <div className="admin-chart-footer">
                  <span>peak: {Math.max(...(analytics?.dau ?? [{ count: 0 }]).map((d) => d.count), 0)}</span>
                </div>
              </section>
            </div>

            <section className="admin-panel">
              <div className="admin-tools">
                <label>
                  <Search size={15} />
                  <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search by name or username" />
                </label>
                <select value={userTierFilter} onChange={(e) => setUserTierFilter(e.target.value)}>
                  <option value="">All tiers</option>
                  <option value="free">Free</option>
                  <option value="paid">Premium</option>
                </select>
                <span className="admin-count-label">{usersTotal} users</span>
              </div>
              <div className="admin-table">
                <div className="admin-table-row admin-table-head admin-users-head">
                  <span>User</span><span>Tier</span><span>Joined</span><span>Last seen</span><span>Streak</span><span>Words</span><span>Points</span><span>Actions</span>
                </div>
                {loading ? <p className="muted admin-table-loading">Loading...</p> : null}
                {users.map((u) => (
                  <div className="admin-table-row admin-users-row" key={u.id}>
                    <span className="admin-user-cell">
                      <strong>{u.display_name}</strong>
                      {u.username ? <em>@{u.username}</em> : null}
                    </span>
                    <span><StatusBadge status={u.tier === "paid" ? "premium" : "free"} /></span>
                    <span>{fmtDate(u.created_at)}</span>
                    <span>{fmtRelative(u.last_seen_at)}</span>
                    <span>{u.streak_days}d</span>
                    <span>{u.learned_count}</span>
                    <span>{u.total_points}</span>
                    <span className="admin-row-actions">
                      <button type="button" title="View details" onClick={() => void openUserDetail(u.id)}><Eye size={15} /></button>
                      {u.tier === "free" ? (
                        <button type="button" title="Grant premium" className="admin-btn-upgrade" onClick={() => void handleSetTier(u.id, "paid")}>↑</button>
                      ) : (
                        <button type="button" title="Revoke premium" className="admin-btn-downgrade" onClick={() => void handleSetTier(u.id, "free")}>↓</button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </section>
        ) : null}

        {/* ── Payments ── */}
        {activeTab === "payments" ? (
          <section className="admin-payments-layout">
            <div className="admin-metrics">
              <Metric label="Pending" value={paymentCounts.pending} />
              <Metric label="Submitted" value={paymentCounts.submitted} />
              <Metric label="Approved" value={paymentCounts.approved} />
              <Metric label="Cancelled" value={paymentCounts.cancelled} />
            </div>
            <section className="admin-panel">
              <div className="admin-tools admin-payment-filters">
                {(["all", "pending", "submitted", "approved", "cancelled", "expired"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="admin-filter-tab"
                    data-active={paymentStatusFilter === s}
                    onClick={() => setPaymentStatusFilter(s)}
                  >
                    {s}
                  </button>
                ))}
                <span className="admin-count-label">{paymentsTotal} total</span>
              </div>
              <div className="admin-table">
                <div className="admin-table-row admin-table-head admin-payments-head">
                  <span>Code</span><span>User</span><span>Amount</span><span>Status</span><span>Created</span><span>Submitted</span><span>Actions</span>
                </div>
                {loading ? <p className="muted admin-table-loading">Loading...</p> : null}
                {payments.map((p) => (
                  <div className="admin-table-row admin-payments-row" key={p.id}>
                    <span className="admin-payment-code">{p.code}</span>
                    <span className="admin-user-cell">
                      <strong>{p.user_display_name}</strong>
                      {p.user_username ? <em>@{p.user_username}</em> : null}
                    </span>
                    <span>{p.amount_uzs.toLocaleString()} UZS</span>
                    <span><StatusBadge status={p.status} /></span>
                    <span>{fmtDate(p.created_at)}</span>
                    <span>{p.submitted_at ? fmtDate(p.submitted_at) : "—"}</span>
                    <span className="admin-row-actions">
                      {(p.status === "pending" || p.status === "submitted") ? (
                        <>
                          <button type="button" title="Approve" className="admin-btn-approve" onClick={() => void handlePaymentAction(p.code, "approve")}>
                            <Check size={14} />
                          </button>
                          <button type="button" title="Cancel" className="admin-btn-cancel" onClick={() => void handlePaymentAction(p.code, "cancel")}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : <span className="muted">—</span>}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </section>
        ) : null}

        {/* ── Settings ── */}
        {activeTab === "settings" ? (
          <section className="admin-settings-layout">
            <section className="admin-panel admin-settings-panel">
              <div className="admin-panel-head">
                <h2>App Settings</h2>
                <span className="admin-settings-note">Runtime only — resets on restart. Set permanently via env vars.</span>
              </div>
              <div className="admin-settings-form">
                <label className="admin-settings-row">
                  <div>
                    <strong>Free daily word limit</strong>
                    <span>Words per day for free-tier users</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={settingsForm.free_daily_word_limit ?? adminSettings?.free_daily_word_limit ?? ""}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, free_daily_word_limit: Number(e.target.value) }))}
                  />
                </label>
                <label className="admin-settings-row">
                  <div>
                    <strong>Premium price (UZS)</strong>
                    <span>Amount charged for premium access</span>
                  </div>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={settingsForm.manual_payment_amount_uzs ?? adminSettings?.manual_payment_amount_uzs ?? ""}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, manual_payment_amount_uzs: Number(e.target.value) }))}
                  />
                </label>
                <label className="admin-settings-row">
                  <div>
                    <strong>Premium plan days</strong>
                    <span>How long premium lasts after approval</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={settingsForm.manual_payment_plan_days ?? adminSettings?.manual_payment_plan_days ?? ""}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, manual_payment_plan_days: Number(e.target.value) }))}
                  />
                </label>
                <label className="admin-settings-row">
                  <div>
                    <strong>Payment card label</strong>
                    <span>Card number or label shown to users during payment</span>
                  </div>
                  <input
                    type="text"
                    value={settingsForm.manual_payment_card_label ?? adminSettings?.manual_payment_card_label ?? ""}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, manual_payment_card_label: e.target.value }))}
                  />
                </label>
              </div>
              <div className="admin-settings-actions">
                {settingsSaved ? <span className="admin-settings-saved"><Check size={15} /> Saved</span> : null}
                <button className="primary-button" type="button" onClick={() => void saveSettings()}>
                  <Save size={16} /> Save settings
                </button>
              </div>
            </section>
          </section>
        ) : null}

        {/* ── Placeholder for reading / writing ── */}
        {["reading", "writing"].includes(activeTab) ? (
          <section className="admin-panel admin-placeholder">
            <h2>{navItems.find((item) => item.tab === activeTab)?.label}</h2>
            <p>Bu bo'lim keyingi bosqich uchun joy tayyorlab qo'yildi.</p>
          </section>
        ) : null}
      </main>

      {/* ── User detail modal ── */}
      {detailOpen ? (
        <div className="admin-word-modal" role="presentation" onClick={() => setDetailOpen(false)}>
          <section aria-modal="true" className="admin-word-dialog admin-user-dialog" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="admin-panel-head">
              <h2>User detail</h2>
              <button type="button" onClick={() => setDetailOpen(false)}>Close</button>
            </div>
            {detailLoading ? <p className="muted">Loading...</p> : null}
            {detailUser && !detailLoading ? (
              <div className="admin-user-detail">
                <div className="admin-user-detail-header">
                  <div className="admin-user-avatar">{detailUser.display_name.charAt(0)}</div>
                  <div>
                    <h3>{detailUser.display_name}</h3>
                    <p>{detailUser.username ? `@${detailUser.username}` : "No username"}</p>
                    <StatusBadge status={detailUser.tier === "paid" ? "premium" : "free"} />
                  </div>
                </div>
                <div className="admin-metrics admin-user-metrics">
                  <Metric label="Words" value={detailUser.learned_count} />
                  <Metric label="Mastered" value={detailUser.mastered_count} />
                  <Metric label="Points" value={detailUser.total_points} />
                  <Metric label="Streak" value={`${detailUser.streak_days}d`} />
                  <Metric label="Accuracy" value={`${detailUser.quiz_accuracy}%`} />
                </div>
                <div className="admin-user-detail-meta">
                  <span>Joined: {fmtDate(detailUser.created_at)}</span>
                  <span>Last seen: {fmtRelative(detailUser.last_seen_at)}</span>
                  {detailUser.premium_until ? <span>Premium until: {fmtDate(detailUser.premium_until)}</span> : null}
                </div>
                <div className="admin-actions">
                  {detailUser.tier === "free" ? (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => { void handleSetTier(detailUser.id, "paid"); setDetailOpen(false); }}
                    >
                      Grant premium
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => { void handleSetTier(detailUser.id, "free"); setDetailOpen(false); }}
                    >
                      Revoke premium
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {/* ── Word editor modal ── */}
      {editorOpen ? (
        <div className="admin-word-modal" role="presentation" onClick={() => setEditorOpen(false)}>
          <section aria-modal="true" className="admin-word-dialog" role="dialog" onClick={(event) => event.stopPropagation()}>
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
                    {["A1", "A2", "B1", "B2", "C1"].map((l) => <option key={l} value={l}>{l}</option>)}
                  </select></label>
                  <label>Topic<input value={form.topic} onChange={(e) => updateField("topic", e.target.value)} /></label>
                  <label>Collection<input value={form.collection} onChange={(e) => updateField("collection", e.target.value)} /></label>
                  <label>Order<input type="number" min={0} value={form.difficulty_order} onChange={(e) => updateField("difficulty_order", Number(e.target.value))} /></label>
                  <label>Tags<input value={form.tags} onChange={(e) => updateField("tags", e.target.value)} placeholder="travel, work, email" /></label>
                  <label className="span-2">English definition<textarea value={form.english_definition} onChange={(e) => updateField("english_definition", e.target.value)} /></label>
                  <label className="span-2">Uzbek meaning<textarea value={form.uzbek_definition} onChange={(e) => updateField("uzbek_definition", e.target.value)} /></label>
                  <label className="span-2">English example<textarea value={form.english_example} onChange={(e) => updateField("english_example", e.target.value)} /></label>
                  <label className="span-2">Uzbek example<textarea value={form.uzbek_example} onChange={(e) => updateField("uzbek_example", e.target.value)} /></label>
                  <label className="span-2">Collocations<textarea value={form.collocations} onChange={(e) => updateField("collocations", e.target.value)} placeholder="make a decision; strong coffee; take responsibility" /></label>
                  <label className="span-2">Common mistake<textarea value={form.common_mistake} onChange={(e) => updateField("common_mistake", e.target.value)} placeholder="Uzbek learners often confuse..." /></label>
                  <label className="span-2">Writing prompt<textarea value={form.writing_prompt} onChange={(e) => updateField("writing_prompt", e.target.value)} placeholder="Write two sentences using this word." /></label>
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
                      <span>{preview.topic || "Topic"} · {preview.level || "A1"}</span>
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
                  <span>{preview.collection || "Collection"}</span>
                  <strong>{preview.english_definition || "English definition"}</strong>
                  <span>{preview.uzbek_definition || "Uzbek meaning"}</span>
                  <em>{preview.english_example || "English example"}</em>
                  <span>{preview.uzbek_example || "Uzbek example"}</span>
                  {preview.collocations ? <span>Works with: {preview.collocations}</span> : null}
                  {preview.common_mistake ? <span>Avoid: {preview.common_mistake}</span> : null}
                  {preview.writing_prompt ? <span>Writing: {preview.writing_prompt}</span> : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {/* ── Upload modal ── */}
      {uploadOpen ? (
        <div className="admin-upload-modal" role="presentation" onClick={() => setUploadOpen(false)}>
          <section aria-modal="true" className="admin-upload-dialog" role="dialog" onClick={(event) => event.stopPropagation()}>
            <div className="admin-panel-head">
              <h2>Upload words</h2>
              <button type="button" onClick={() => setUploadOpen(false)}>Close</button>
            </div>
            <div className="admin-upload-tabs">
              <button type="button" data-active={uploadMode === "file"} onClick={() => setUploadMode("file")}>CSV / Excel file</button>
              <button type="button" data-active={uploadMode === "sheets"} onClick={() => setUploadMode("sheets")}>Google Sheets</button>
            </div>
            {uploadMode === "file" ? (
              <label className="admin-upload-box">
                <span>Choose .csv or .xlsx file</span>
                <input type="file" accept=".csv,.xlsx,.xlsm" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
                {uploadFile ? <strong>{uploadFile.name}</strong> : null}
              </label>
            ) : (
              <label className="admin-upload-box">
                <span>Paste public Google Sheets CSV link</span>
                <input type="url" placeholder="https://docs.google.com/spreadsheets/..." value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)} />
              </label>
            )}
            <label className="admin-check admin-upload-check">
              <input type="checkbox" checked={uploadAsPublished} onChange={(e) => setUploadAsPublished(e.target.checked)} />
              Publish uploaded words
            </label>
            <p className="muted">
              Columns: word, word_type, phonetic, english_definition, uzbek_definition,
              english_example, uzbek_example, level, topic, collection, tags, collocations,
              common_mistake, writing_prompt, difficulty_order, is_active.
            </p>
            <div className="admin-actions">
              <button className="secondary-button" type="button" onClick={() => setUploadOpen(false)}>Cancel</button>
              <button className="primary-button" type="button" disabled={loading} onClick={() => void uploadWords()}>
                {loading ? "Uploading..." : "Upload words"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
