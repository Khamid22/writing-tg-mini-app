import { useState } from "react";
import type { JSX } from "react";
import { loginAdmin } from "../adminApi";

export function AdminLogin({ onSuccess }: { onSuccess: (token: string) => void }): JSX.Element {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(): Promise<void> {
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { token } = await loginAdmin(password);
      onSuccess(token);
    } catch {
      setError("Password noto'g'ri yoki admin login sozlanmagan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login">
      <section className="admin-login-panel">
        <div className="admin-brand">
          <span className="admin-logo">VH</span>
          <span>VocabHelper Admin</span>
        </div>
        <h1>Admin panel</h1>
        <p>Content qo'shish va boshqarish uchun admin password kiriting.</p>
        {error ? <div className="admin-message">{error}</div> : null}
        <input
          className="admin-input"
          type="password"
          autoComplete="current-password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
        />
        <button
          className="admin-button primary-button"
          type="button"
          disabled={loading}
          onClick={() => void submit()}
        >
          Kirish
        </button>
      </section>
    </main>
  );
}
