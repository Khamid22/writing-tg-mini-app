import { useState } from "react";
import type { JSX } from "react";
import { Check, Edit3, X } from "lucide-react";
import type { AdminWord, AdminWordReport } from "../adminApi";
import { fetchAdminWordReports, updateAdminWordReport } from "../adminApi";
import { useAdminFetch } from "./useAdminFetch";

const REASONS: Record<string, string> = {
  too_difficult: "Juda qiyin",
  wrong_meaning: "Ma'no noto'g'ri",
  audio_broken: "Audio ishlamayapti",
  bad_example: "Misol yaxshi emas",
  already_know: "Biladi",
};

export function QualityTab({
  token,
  onEditWord,
}: {
  token: string;
  onEditWord: (word: AdminWord) => void;
}): JSX.Element {
  const [status, setStatus] = useState<"open" | "resolved" | "dismissed" | "all">("open");
  const [reloadKey, setReloadKey] = useState(0);
  const { data, loading } = useAdminFetch(
    () => fetchAdminWordReports(token, status).then((r) => r.items),
    [status, reloadKey],
  );

  async function setReportStatus(report: AdminWordReport, nextStatus: "resolved" | "dismissed"): Promise<void> {
    await updateAdminWordReport(token, report.id, nextStatus);
    setReloadKey((k) => k + 1);
  }

  return (
    <section className="admin-panel admin-quality-layout admin-fade-in">
      <div className="admin-quality-head">
        <div>
          <h2>Content Quality</h2>
          <p>Users reported these cards. Fix the word, resolve the report, or dismiss it.</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="open">Open reports</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="admin-table admin-quality-table">
        <div className="admin-table-row admin-table-head">
          <span>Word</span><span>Issue</span><span>User</span><span>Status</span><span>Actions</span>
        </div>
        {(data ?? []).map((report) => (
          <div className="admin-table-row admin-row-hoverable" key={report.id}>
            <strong>{report.word?.word ?? "Deleted word"}</strong>
            <span>{REASONS[report.reason] ?? report.reason}</span>
            <span>{report.user?.display_name ?? "Unknown"}</span>
            <span>{report.status}</span>
            <span className="admin-row-actions">
              {report.word ? (
                <button type="button" title="Edit word" onClick={() => onEditWord(report.word as AdminWord)}><Edit3 size={15} /></button>
              ) : null}
              <button type="button" title="Resolve" onClick={() => void setReportStatus(report, "resolved")}><Check size={15} /></button>
              <button type="button" title="Dismiss" onClick={() => void setReportStatus(report, "dismissed")}><X size={15} /></button>
            </span>
          </div>
        ))}
      </div>
      {loading ? <p className="muted">Loading...</p> : null}
      {!loading && (data ?? []).length === 0 ? <p className="muted">No reports here.</p> : null}
    </section>
  );
}
