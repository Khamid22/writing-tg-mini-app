import { useEffect, useState } from "react";
import type { JSX } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BarChart3, BookMarked, BookOpen, Crown, GraduationCap, Medal, Menu, User, X } from "lucide-react";
import { applyApiUser, authenticateTelegram, clearStoredToken, getStoredToken } from "./api";
import { DAILY_FREE_LIMIT } from "./data";
import { clearState, dailyUsed, loadState, saveState } from "./storage";
import type { LearnerState, TelegramWebApp } from "./types";
import { LandingPage } from "./screens/LandingPage";
import { RegistrationPage } from "./screens/RegistrationPage";
import { LearnScreen } from "./screens/LearnScreen";
import { TestScreen } from "./screens/TestScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { CoursesScreen } from "./screens/CoursesScreen";
import { PublicProfile } from "./components/PublicProfile";
import { AnimatedScreen, tapScale } from "./uiMotion";

type Tab = "learn" | "test" | "courses" | "dashboard" | "leaders" | "profile";
type EntryScreen = "landing" | "register" | "app";

const navItems: Array<{ tab: Tab; label: string; icon: typeof BookOpen }> = [
  { tab: "learn", label: "O'rganish", icon: BookOpen },
  { tab: "test", label: "Test", icon: GraduationCap },
  { tab: "courses", label: "Kurslar", icon: BookMarked },
  { tab: "dashboard", label: "Natija", icon: BarChart3 },
  { tab: "leaders", label: "Reyting", icon: Medal },
  { tab: "profile", label: "Profil", icon: User },
];

export function App(): JSX.Element {
  const [entryScreen, setEntryScreen] = useState<EntryScreen>(() =>
    localStorage.getItem("uzbek-words-onboarded") === "true" ? "app" : "landing",
  );
  const [activeTab, setActiveTab] = useState<Tab>("learn");
  const [state, setState] = useState<LearnerState>(() => loadState());
  const [apiToken, setApiToken] = useState<string | null>(() => getStoredToken());
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on Escape; reset on tab change
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  function updateState(updater: (current: LearnerState) => LearnerState): void {
    setState((current) => updater(current));
  }

  useEffect(() => {
    if (entryScreen !== "app") return;

    const webApp: TelegramWebApp | undefined = window.Telegram?.WebApp;
    authenticateTelegram(webApp?.initData ?? "")
      .then((response) => {
        setApiToken(response.token);
        updateState((current) => applyApiUser(current, response.user));
      })
      .catch(() => {
        setApiToken(getStoredToken());
      });
  }, [entryScreen]);

  function completeRegistration(displayName: string): void {
    updateState((current) => ({
      ...current,
      displayName: displayName.trim() || current.displayName,
    }));
    localStorage.setItem("uzbek-words-onboarded", "true");
    setEntryScreen("app");
  }

  if (entryScreen === "landing") {
    return <LandingPage onRegister={() => setEntryScreen("register")} />;
  }

  if (entryScreen === "register") {
    return (
      <RegistrationPage
        state={state}
        onBack={() => setEntryScreen("landing")}
        onComplete={completeRegistration}
      />
    );
  }

  const currentLabel = navItems.find((n) => n.tab === activeTab)?.label ?? "Yangi so'zlar";

  function activeScreen(): JSX.Element | null {
    if (activeTab === "learn") {
      return <LearnScreen state={state} updateState={updateState} apiToken={apiToken} />;
    }
    if (activeTab === "test") {
      return <TestScreen state={state} updateState={updateState} apiToken={apiToken} />;
    }
    if (activeTab === "courses") {
      return (
        <CoursesScreen
          apiToken={apiToken}
          activeCollection={state.activeCollection ?? null}
          onSelect={(collection) => {
            updateState((current) => ({ ...current, activeCollection: collection }));
            setActiveTab("learn");
          }}
        />
      );
    }
    if (activeTab === "dashboard") {
      return <DashboardScreen state={state} apiToken={apiToken} />;
    }
    if (activeTab === "leaders") {
      return <LeaderboardScreen state={state} onSelectUser={setSelectedUserId} apiToken={apiToken} />;
    }
    if (activeTab === "profile") {
      return (
        <ProfileScreen
          state={state}
          onLogout={() => {
            clearState();
            clearStoredToken();
            localStorage.removeItem("uzbek-words-onboarded");
            setApiToken(null);
            setState(loadState());
            setActiveTab("learn");
            setEntryScreen("landing");
          }}
        />
      );
    }
    return null;
  }

  return (
    <div className="app-shell" data-drawer-open={drawerOpen}>
      <header className="topbar">
        <button
          type="button"
          className="topbar-menu"
          aria-label="Menyu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={20} />
        </button>
        <div className="topbar-titles">
          <p className="eyebrow">Kundalik ingliz tili</p>
          <h1>{currentLabel}</h1>
        </div>
        <div className="tier-pill" data-tier={state.tier}>
          {state.tier === "paid" ? <Crown size={15} /> : <BookOpen size={15} />}
          <span>{state.tier === "paid" ? "Cheksiz" : `${dailyUsed(state)}/${DAILY_FREE_LIMIT}`}</span>
        </div>
      </header>

      <main className="screen">
        <AnimatePresence mode="wait">
          <AnimatedScreen key={activeTab}>{activeScreen()}</AnimatedScreen>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {selectedUserId !== null ? (
          <PublicProfile userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
        ) : null}
      </AnimatePresence>

      {drawerOpen ? (
        <div className="app-nav-backdrop" role="presentation" onClick={() => setDrawerOpen(false)} />
      ) : null}

      <nav aria-label="Main navigation" className="app-nav" data-open={drawerOpen}>
        <div className="app-nav-brand">
          <span className="app-nav-logo">VH</span>
          <span className="app-nav-title">VocabHelper</span>
          <button
            type="button"
            className="app-nav-close"
            aria-label="Yopish"
            onClick={() => setDrawerOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <motion.button
              className="nav-button"
              data-active={item.tab === activeTab}
              key={item.tab}
              onClick={() => { setActiveTab(item.tab); setDrawerOpen(false); }}
              type="button"
              whileTap={tapScale()}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
