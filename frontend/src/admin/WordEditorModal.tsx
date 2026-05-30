import { useEffect, useState } from "react";
import type { JSX } from "react";
import { Eye, Save } from "lucide-react";
import type { AdminWord, AdminWordInput } from "../adminApi";
import { createAdminWord, updateAdminWord } from "../adminApi";
import { Modal } from "./Modal";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

const EMPTY: AdminWordInput = {
  word: "", word_type: "noun", phonetic: "",
  english_definition: "", uzbek_definition: "",
  english_example: "", uzbek_example: "",
  level: "A1", topic: "Everyday English", collection: "Daily Vocabulary",
  tags: "", collocations: "", common_mistake: "", writing_prompt: "",
  difficulty_order: 0, audio_url: null, audio_status: "pending", quality_status: "review", is_active: false,
};

function toInput(word: AdminWord): AdminWordInput {
  const { id: _id, created_at: _ca, ...rest } = word;
  return rest;
}

export function WordEditorModal({
  token,
  open,
  word,
  onClose,
  onSaved,
}: {
  token: string;
  open: boolean;
  word: AdminWord | null;
  onClose: () => void;
  onSaved: (saved: AdminWord, isNew: boolean) => void;
}): JSX.Element {
  const [form, setForm] = useState<AdminWordInput>(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(word ? toInput(word) : EMPTY);
  }, [word, open]);

  function update<K extends keyof AdminWordInput>(key: K, value: AdminWordInput[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(): Promise<void> {
    setBusy(true);
    try {
      const saved = word ? await updateAdminWord(token, word.id, form) : await createAdminWord(token, form);
      onSaved(saved, !word);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={word ? "Edit word" : "Add word"} size="lg">
      <div className="admin-word-dialog-grid">
        <div className="admin-word-form-pane">
          <div className="admin-form-grid">
            <label>Word<input value={form.word} onChange={(e) => update("word", e.target.value)} /></label>
            <label>Type<input value={form.word_type} onChange={(e) => update("word_type", e.target.value)} /></label>
            <label>Phonetic<input value={form.phonetic} onChange={(e) => update("phonetic", e.target.value)} /></label>
            <label>Level<select value={form.level} onChange={(e) => update("level", e.target.value)}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select></label>
            <label>Topic<input value={form.topic} onChange={(e) => update("topic", e.target.value)} /></label>
            <label>Collection<input value={form.collection} onChange={(e) => update("collection", e.target.value)} /></label>
            <label>Order<input type="number" min={0} value={form.difficulty_order} onChange={(e) => update("difficulty_order", Number(e.target.value))} /></label>
            <label>Status<select value={form.quality_status} onChange={(e) => update("quality_status", e.target.value as AdminWordInput["quality_status"])}>
              <option value="review">Review</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select></label>
            <label>Tags<input value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="travel, work, email" /></label>
            <label className="span-2">English definition<textarea value={form.english_definition} onChange={(e) => update("english_definition", e.target.value)} /></label>
            <label className="span-2">Uzbek meaning<textarea value={form.uzbek_definition} onChange={(e) => update("uzbek_definition", e.target.value)} /></label>
            <label className="span-2">English example<textarea value={form.english_example} onChange={(e) => update("english_example", e.target.value)} /></label>
            <label className="span-2">Uzbek example<textarea value={form.uzbek_example} onChange={(e) => update("uzbek_example", e.target.value)} /></label>
            <label className="span-2">Collocations<textarea value={form.collocations} onChange={(e) => update("collocations", e.target.value)} placeholder="make a decision; strong coffee" /></label>
            <label className="span-2">Common mistake<textarea value={form.common_mistake} onChange={(e) => update("common_mistake", e.target.value)} placeholder="Uzbek learners often confuse..." /></label>
            <label className="span-2">Writing prompt<textarea value={form.writing_prompt} onChange={(e) => update("writing_prompt", e.target.value)} placeholder="Write two sentences using this word." /></label>
            <label className="span-2">Audio URL<input value={form.audio_url ?? ""} onChange={(e) => update("audio_url", e.target.value || null)} /></label>
            <label>Audio status<input value={form.audio_status} onChange={(e) => update("audio_status", e.target.value)} /></label>
          </div>
          <div className="admin-actions">
            <button className="secondary-button" type="button" onClick={() => setForm(EMPTY)}>Clear</button>
            <button className="primary-button" type="button" disabled={busy} onClick={() => void submit()}>
              <Save size={16} /> Save word
            </button>
          </div>
        </div>
        <div className="admin-word-preview-pane">
          <div className="admin-preview-title"><Eye size={16} /> Preview</div>
          <div className="flashcard admin-preview-card">
            <div className="flashcard-side flashcard-front">
              <div className="flashcard-meta">
                <span>{form.topic || "Topic"} · {form.level || "A1"}</span>
                <span>{form.word_type || "type"}</span>
              </div>
              <div className="flashcard-word-block">
                <h2>{form.word || "word"}</h2>
                <p className="phonetic">{form.phonetic || "/.../"} · {form.word_type || "type"}</p>
              </div>
              <div className="flashcard-hint"><em>Ma'noni ko'rish uchun bosing.</em><span>♪</span></div>
            </div>
          </div>
          <div className="admin-preview-back">
            <span>{form.collection || "Collection"}</span>
            <strong>{form.english_definition || "English definition"}</strong>
            <span>{form.uzbek_definition || "Uzbek meaning"}</span>
            <em>{form.english_example || "English example"}</em>
            <span>{form.uzbek_example || "Uzbek example"}</span>
            {form.collocations ? <span>Works with: {form.collocations}</span> : null}
            {form.common_mistake ? <span>Avoid: {form.common_mistake}</span> : null}
            {form.writing_prompt ? <span>Writing: {form.writing_prompt}</span> : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}
