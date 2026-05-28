import { useEffect, useState } from "react";
import type { JSX } from "react";
import { Check, Save } from "lucide-react";
import type { AdminSettings, AdminSettingsPatch } from "../adminApi";
import { fetchAdminSettings, patchAdminSettings } from "../adminApi";

type Field = {
  key: keyof AdminSettings;
  label: string;
  hint: string;
  type: "number" | "text";
  min?: number;
  max?: number;
  step?: number;
};

const FIELDS: Field[] = [
  { key: "free_daily_word_limit", label: "Free daily word limit", hint: "Words per day for free-tier users", type: "number", min: 1, max: 100 },
  { key: "manual_payment_amount_uzs", label: "Premium price (UZS)", hint: "Amount charged for premium access", type: "number", min: 1000, step: 1000 },
  { key: "manual_payment_plan_days", label: "Premium plan days", hint: "How long premium lasts after approval", type: "number", min: 1, max: 365 },
  { key: "manual_payment_card_label", label: "Payment card label", hint: "Card number or label shown to users during payment", type: "text" },
];

export function SettingsTab({ token }: { token: string }): JSX.Element {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [draft, setDraft] = useState<AdminSettingsPatch>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchAdminSettings(token).then((s) => { setSettings(s); setDraft(s); }).catch(() => {});
  }, [token]);

  async function save(): Promise<void> {
    try {
      const result = await patchAdminSettings(token, draft);
      setSettings(result);
      setDraft(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {/* ignored — UI stays in current state */}
  }

  return (
    <section className="admin-settings-layout admin-fade-in">
      <section className="admin-panel admin-settings-panel">
        <div className="admin-panel-head">
          <h2>App Settings</h2>
          <span className="admin-settings-note">Runtime only — resets on restart. Set permanently via env vars.</span>
        </div>
        <div className="admin-settings-form">
          {FIELDS.map((field) => {
            const value = draft[field.key] ?? settings?.[field.key] ?? "";
            const onChange = (raw: string): void =>
              setDraft((d) => ({ ...d, [field.key]: field.type === "number" ? Number(raw) : raw }));
            return (
              <label key={field.key} className="admin-settings-row">
                <div>
                  <strong>{field.label}</strong>
                  <span>{field.hint}</span>
                </div>
                <input
                  type={field.type}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                />
              </label>
            );
          })}
        </div>
        <div className="admin-settings-actions">
          {saved ? <span className="admin-settings-saved"><Check size={15} /> Saved</span> : null}
          <button className="primary-button" type="button" onClick={() => void save()}>
            <Save size={16} /> Save settings
          </button>
        </div>
      </section>
    </section>
  );
}
