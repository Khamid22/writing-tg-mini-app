import { useEffect, useState } from "react";
import type { JSX } from "react";
import { BookOpen, CreditCard, LayoutDashboard, ListFilter, LogOut, Menu, Plus, Settings, Users, X } from "lucide-react";
import type { AdminSummary, AdminWord } from "./adminApi";
import {
  approveAdminPayment,
  cancelAdminPayment,
  disableAdminWord,
  fetchAdminSummary,
  updateAdminUser,
} from "./adminApi";
import { AdminLogin } from "./admin/AdminLogin";
import { DashboardTab } from "./admin/DashboardTab";
import { PaymentsTab } from "./admin/PaymentsTab";
import { SettingsTab } from "./admin/SettingsTab";
import { UploadModal } from "./admin/UploadModal";
import { UserDetailModal } from "./admin/UserDetailModal";
import { UsersTab } from "./admin/UsersTab";
import { WordEditorModal } from "./admin/WordEditorModal";
import { WordsTab } from "./admin/WordsTab";

const SESSION_KEY = "vocabhelper-admin-session";

type Tab = "dashboard" | "words" | "reading" | "writing" | "users" | "payments" | "settings";

const NAV: Array<{ tab: Tab; label: string; icon: typeof BookOpen }> = [
  { tab: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { tab: "words", label: "Words", icon: BookOpen },
  { tab: "reading", label: "Reading", icon: ListFilter },
  { tab: "writing", label: "Writing", icon: ListFilter },
  { tab: "users", label: "Users", icon: Users },
  { tab: "payments", label: "Payments", icon: CreditCard },
  { tab: "settings", label: "Settings", icon: Settings },
];

export function AdminApp(): JSX.Element {
  const [token, setToken] = useState(() => localStorage.getItem(SESSION_KEY) ?? "");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [message, setMessage] = useState("");

  const [editorWord, setEditorWord] = useState<AdminWord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [wordsReloadKey, setWordsReloadKey] = useState(0);
  const [paymentsReloadKey, setPaymentsReloadKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  useEffect(() => {
    if (!token) return;
    fetchAdminSummary(token)
      .then(setSummary)
      .catch(() => setMessage("Admin token noto'g'ri yoki server javob bermadi."));
  }, [token, wordsReloadKey]);

  function login(newToken: string): void {
    localStorage.setItem(SESSION_KEY, newToken);
    setToken(newToken);
  }

  function logout(): void {
    localStorage.removeItem(SESSION_KEY);
    setToken("");
    setSummary(null);
  }

  function openEditor(word: AdminWord | null): void {
    setEditorWord(word);
    setEditorOpen(true);
    setTab("words");
    setMessage("");
  }

  async function handleDisableWord(word: AdminWord): Promise<void> {
    try {
      await disableAdminWord(token, word.id);
      setMessage(`"${word.word}" draft holatiga o'tkazildi.`);
      setWordsReloadKey((k) => k + 1);
    } catch {
      setMessage("Wordni draft qilishda xatolik bor.");
    }
  }

  async function handleSetTier(userId: number, tier: "free" | "paid"): Promise<void> {
    try {
      await updateAdminUser(token, userId, { tier });
    } catch {
      setMessage("Tier o'zgartirilmadi.");
    }
  }

  async function handlePaymentAction(code: string, action: "approve" | "cancel"): Promise<void> {
    try {
      if (action === "approve") await approveAdminPayment(token, code);
      else await cancelAdminPayment(token, code);
      setPaymentsReloadKey((k) => k + 1);
    } catch {
      setMessage("Amal bajarilmadi.");
    }
  }

  if (!token) return <AdminLogin onSuccess={login} />;

  return (
    <div className="admin-shell" data-drawer-open={drawerOpen}>
      {drawerOpen ? (
        <div className="admin-nav-backdrop" role="presentation" onClick={() => setDrawerOpen(false)} />
      ) : null}

      <aside className="admin-sidebar" data-open={drawerOpen}>
        <div className="admin-brand">
          <span className="admin-logo">VH</span>
          <span>VocabHelper Admin</span>
          <button
            type="button"
            className="admin-nav-close"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <nav className="admin-nav" aria-label="Admin navigation">
          {NAV.map(({ tab: t, label, icon: Icon }) => (
            <button
              key={t}
              type="button"
              data-active={tab === t}
              onClick={() => { setTab(t); setDrawerOpen(false); }}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="admin-logout" type="button" onClick={logout}>
          <LogOut size={16} /> Chiqish
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-topbar-menu"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="admin-topbar-titles">
            <p>{tab === "words" ? "Content library" : "Admin workspace"}</p>
            <h1>{NAV.find((n) => n.tab === tab)?.label}</h1>
          </div>
          <div className="admin-topbar-actions">
            {tab === "words" ? (
              <button className="admin-button secondary-button" type="button" onClick={() => setUploadOpen(true)}>
                <Plus size={16} /> Upload File
              </button>
            ) : null}
            {(tab === "dashboard" || tab === "words") ? (
              <button className="admin-button primary-button" type="button" onClick={() => openEditor(null)}>
                <Plus size={16} /> Add word
              </button>
            ) : null}
          </div>
        </header>

        {message ? <div className="admin-message">{message}</div> : null}

        {tab === "dashboard" && (
          <DashboardTab
            summary={summary}
            onOpenWords={() => setTab("words")}
            onEditWord={openEditor}
          />
        )}
        {tab === "words" && (
          <WordsTab
            token={token}
            onEdit={openEditor}
            onDisable={handleDisableWord}
            reloadKey={wordsReloadKey}
          />
        )}
        {tab === "users" && (
          <UsersTab token={token} onOpenDetail={setDetailUserId} onSetTier={handleSetTier} />
        )}
        {tab === "payments" && (
          <PaymentsTab token={token} onAction={handlePaymentAction} reloadKey={paymentsReloadKey} />
        )}
        {tab === "settings" && <SettingsTab token={token} />}
        {(tab === "reading" || tab === "writing") && (
          <section className="admin-panel admin-placeholder admin-fade-in">
            <h2>{NAV.find((n) => n.tab === tab)?.label}</h2>
            <p>Bu bo'lim keyingi bosqich uchun joy tayyorlab qo'yildi.</p>
          </section>
        )}
      </main>

      <UserDetailModal
        token={token}
        userId={detailUserId}
        onClose={() => setDetailUserId(null)}
        onSetTier={handleSetTier}
      />
      <WordEditorModal
        token={token}
        open={editorOpen}
        word={editorWord}
        onClose={() => setEditorOpen(false)}
        onSaved={(saved, isNew) => {
          setEditorWord(saved);
          setEditorOpen(false);
          setMessage(isNew ? "Yangi word qo'shildi." : "Word yangilandi.");
          setWordsReloadKey((k) => k + 1);
        }}
      />
      <UploadModal
        token={token}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(msg) => {
          setMessage(msg);
          setUploadOpen(false);
          setWordsReloadKey((k) => k + 1);
        }}
      />
    </div>
  );
}
