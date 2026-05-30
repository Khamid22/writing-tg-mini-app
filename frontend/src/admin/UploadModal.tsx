import { useState } from "react";
import type { JSX } from "react";
import { importAdminWordsFile, importAdminWordsUrl } from "../adminApi";
import { Modal } from "./Modal";

export function UploadModal({
  token,
  open,
  onClose,
  onUploaded,
}: {
  token: string;
  open: boolean;
  onClose: () => void;
  onUploaded: (message: string) => void;
}): JSX.Element {
  const [mode, setMode] = useState<"file" | "sheets">("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [publish, setPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(): Promise<void> {
    if (mode === "file" && !file) { setError("Avval CSV yoki XLSX file tanlang."); return; }
    if (mode === "sheets" && !url.trim()) { setError("Google Sheets CSV linkini kiriting."); return; }
    setBusy(true);
    setError("");
    try {
      const result = mode === "file" && file
        ? await importAdminWordsFile(token, file, publish)
        : await importAdminWordsUrl(token, url.trim(), publish);
      const skipped = result.skipped_count ? ` ${result.skipped_count} qator o'tkazib yuborildi.` : "";
      onUploaded(`${result.imported} ta word yuklandi.${skipped}`);
      setFile(null); setUrl("");
    } catch {
      setError("Upload ishlamadi. File ustunlari yoki linkni tekshiring.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload words" size="md">
      <div className="admin-upload-tabs">
        <button type="button" data-active={mode === "file"} onClick={() => setMode("file")}>CSV / Excel file</button>
        <button type="button" data-active={mode === "sheets"} onClick={() => setMode("sheets")}>Google Sheets</button>
      </div>
      {mode === "file" ? (
        <label className="admin-upload-box">
          <span>Choose .csv or .xlsx file</span>
          <input type="file" accept=".csv,.xlsx,.xlsm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {file ? <strong>{file.name}</strong> : null}
        </label>
      ) : (
        <label className="admin-upload-box">
          <span>Paste public Google Sheets CSV link</span>
          <input type="url" placeholder="https://docs.google.com/spreadsheets/..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
      )}
      <label className="admin-check admin-upload-check">
        <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
        Publish immediately
      </label>
      <p className="muted">
        Columns: word, word_type, phonetic, english_definition, uzbek_definition, english_example,
        uzbek_example, level, topic, collection, tags, collocations, common_mistake, writing_prompt,
        difficulty_order, audio_url, quality_status. By default uploads go to review.
      </p>
      {error ? <div className="admin-message">{error}</div> : null}
      <div className="admin-actions">
        <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
        <button className="primary-button" type="button" disabled={busy} onClick={() => void upload()}>
          {busy ? "Uploading..." : "Upload words"}
        </button>
      </div>
    </Modal>
  );
}
