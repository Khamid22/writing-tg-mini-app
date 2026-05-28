import { useState } from "react";
import type { JSX } from "react";
import { Edit3, Search, Trash2 } from "lucide-react";
import type { AdminWord } from "../adminApi";
import { fetchAdminWords } from "../adminApi";
import { useAdminFetch } from "./useAdminFetch";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

export function WordsTab({
  token,
  onEdit,
  onDisable,
  reloadKey,
}: {
  token: string;
  onEdit: (word: AdminWord) => void;
  onDisable: (word: AdminWord) => Promise<void>;
  reloadKey: number;
}): JSX.Element {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [level, setLevel] = useState("");

  const { data, loading } = useAdminFetch(
    () => fetchAdminWords(token, { search, status, level }).then((r) => r.items),
    [search, status, level, reloadKey],
    { debounceMs: 250 },
  );

  return (
    <section className="admin-words-layout admin-fade-in">
      <section className="admin-panel admin-library">
        <div className="admin-tools">
          <label>
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search word, meaning, definition"
            />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">All levels</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="admin-table">
          <div className="admin-table-row admin-table-head">
            <span>Word</span><span>Meaning</span><span>Topic</span><span>Status</span><span>Actions</span>
          </div>
          {(data ?? []).map((word) => (
            <div className="admin-table-row admin-row-hoverable" key={word.id}>
              <strong>{word.word}</strong>
              <span>{word.uzbek_definition}</span>
              <span>{word.topic || word.level}</span>
              <span>{word.is_active ? "Published" : "Draft"}</span>
              <span className="admin-row-actions">
                <button type="button" title="Edit" onClick={() => onEdit(word)}><Edit3 size={15} /></button>
                <button type="button" title="Draft" onClick={() => void onDisable(word)}><Trash2 size={15} /></button>
              </span>
            </div>
          ))}
        </div>
        {loading ? <p className="muted">Loading...</p> : null}
      </section>
    </section>
  );
}
