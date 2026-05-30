import { useEffect } from "react";
import type { JSX, ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { spring } from "../uiMotion";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
};

export function Modal({ open, onClose, title, children, size = "md" }: Props): JSX.Element | null {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={onClose}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.16 }}
        >
          <motion.section
            aria-modal="true"
            role="dialog"
            className={`admin-modal admin-modal-${size}`}
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.985 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
            transition={reduce ? { duration: 0 } : spring}
          >
            <div className="admin-modal-head">
              <h2>{title}</h2>
              <button type="button" onClick={onClose}>Close</button>
            </div>
            {children}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
