import { useEffect, useState } from "react";
import type { JSX } from "react";
import { BarChart3, BookOpen, Crown, GraduationCap, Medal, User } from "lucide-react";
import { applyApiUser, authenticateTelegram, clearStoredToken, getStoredToken } from "./api";
import { DAILY_FREE_LIMIT } from "./data";
import type { LeaderboardUser } from "./data";
import { clearState, dailyUsed, loadState, saveState } from "./storage";
import type { LearnerState, TelegramWebApp } from "./types";
import { LandingPage } from "./screens/LandingPage";
import { RegistrationPage } from "./screens/RegistrationPage";
import { LearnScreen } from "./screens/LearnScreen";
import { TestScreen } from "./screens/TestScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { PublicProfile } from "./components/PublicProfile";

type Tab = "learn" | "test" | "dashboard" | "leaders" | "profile";
type EntryScreen = "landing" | "register" | "app";

const navItems: Array<{ tab: Tab; label: string; icon: typeof BookOpen }> = [
  { tab: "learn", label: "O'rganish", icon: BookOpen },
  { tab: "test", label: "Test", icon: GraduationCap },
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
  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);

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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Kundalik ingliz tili</p>
          <h1>Yangi so'zlar</h1>
        </div>
        <div className="tier-pill" data-tier={state.tier}>
          {state.tier === "paid" ? <Crown size={15} /> : <BookOpen size={15} />}
          <span>{state.tier === "paid" ? "Cheksiz" : `${dailyUsed(state)}/${DAILY_FREE_LIMIT}`}</span>
        </div>
      </header>

      <main className="screen">
        {activeTab === "learn" ? <LearnScreen state={state} updateState={updateState} /> : null}
        {activeTab === "test" ? <TestScreen state={state} updateState={updateState} /> : null}
        {activeTab === "dashboard" ? <DashboardScreen state={state} /> : null}
        {activeTab === "leaders" ? <LeaderboardScreen state={state} onSelectUser={setSelectedUser} /> : null}
        {activeTab === "profile" ? (
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
        ) : null}
      </main>

      {selectedUser ? <PublicProfile user={selectedUser} onClose={() => setSelectedUser(null)} /> : null}

      <nav aria-label="Main navigation" className="bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className="nav-button"
              data-active={item.tab === activeTab}
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              type="button"
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
