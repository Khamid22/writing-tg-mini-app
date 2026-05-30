import { useEffect, useState } from "react";
import type { JSX } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Star, X } from "lucide-react";
import type { ApiWord } from "../api";
import { fetchFavorites } from "../api";
import { spring } from "../uiMotion";

export function FavoritesScreen({
  apiToken,
}: {
  apiToken: string | null;
}): JSX.Element {
  const [items, setItems] = useState<ApiWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApiWord | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!apiToken) return;
    setLoading(true);
    fetchFavorites()
      .then((res) => setItems(res.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [apiToken]);

  if (!apiToken || loading) {
    return (
      <section className="empty-panel">
        <p className="muted">Yuklanmoqda...</p>
      </section>
    );
  }

  return (
    <section className="favorites-layout">
      {items.length === 0 ? (
        <section className="empty-panel">
          <Star size={28} />
          <h2>Saqlangan so'zlar yo'q</h2>
          <p>Kartadagi yulduzchani bosing. So'z shu yerda saqlanadi.</p>
        </section>
      ) : (
        <div className="favorites-list">
          {items.map((word) => (
            <button className="favorite-row" key={word.id} type="button" onClick={() => setSelected(word)}>
              <div>
                <strong data-script-lock>{word.word}</strong>
                <span>{word.level} · {word.topic || "Umumiy"}</span>
              </div>
              <span>{word.word_type}</span>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected ? (
          <motion.div
            className="modal-backdrop"
            role="presentation"
            onClick={() => setSelected(null)}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.16 }}
          >
            <motion.section
              aria-modal="true"
              className="favorite-modal"
              role="dialog"
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              transition={reduce ? { duration: 0 } : spring}
            >
              <button className="modal-close" type="button" aria-label="Yopish" onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
              <div className="favorite-card">
                <div className="flashcard-meta">
                  <span>{selected.level} · {selected.topic || "Umumiy"}</span>
                  <span data-script-lock>{selected.word_type}</span>
                </div>
                <div className="favorite-card-word" data-script-lock>
                  <h2>{selected.word}</h2>
                  <p>{selected.phonetic}</p>
                </div>
                <dl className="favorite-defs">
                  <dt>Inglizcha</dt>
                  <dd data-script-lock>{selected.english_definition}</dd>
                  <dt>O'zbekcha</dt>
                  <dd>{selected.uzbek_definition}</dd>
                  <dt>Misol</dt>
                  <dd data-script-lock><em>{selected.english_example}</em></dd>
                  <dt>Tarjima</dt>
                  <dd>{selected.uzbek_example}</dd>
                </dl>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
