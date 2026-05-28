import { useEffect } from "react";
import type { JSX, ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
};

export function Modal({ open, onClose, title, children, size = "md" }: Props): JSX.Element | null {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-modal="true"
        role="dialog"
        className={`admin-modal admin-modal-${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-head">
          <h2>{title}</h2>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        {children}
      </section>
    </div>
  );
}
