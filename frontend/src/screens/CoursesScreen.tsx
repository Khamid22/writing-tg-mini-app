import { useEffect, useState } from "react";
import type { JSX } from "react";
import { BookMarked, Check, Crown, Lock, Play } from "lucide-react";
import { motion } from "motion/react";
import type { ApiCollection } from "../api";
import { fetchCollections } from "../api";
import { MotionProgress, tapScale } from "../uiMotion";

type Props = {
  apiToken: string | null;
  activeCollection: string | null | undefined;
  onSelect: (collection: string | null) => void;
};

export function CoursesScreen({ apiToken, activeCollection, onSelect }: Props): JSX.Element {
  const [items, setItems] = useState<ApiCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiToken) return;
    setLoading(true);
    fetchCollections()
      .then((res) => setItems(res.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [apiToken]);

  if (loading) {
    return (
      <section className="empty-panel">
        <p className="muted">Yuklanmoqda...</p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="empty-panel">
        <BookMarked size={28} />
        <h2>Hozircha kurslar yo'q</h2>
        <p>Admin so'zlarni yuklaganidan keyin kurslar shu yerda paydo bo'ladi.</p>
      </section>
    );
  }

  return (
    <section className="courses-layout">
      <div className="courses-intro">
        <h2>Kurslar</h2>
        <p>O'rganmoqchi bo'lgan to'plamni tanlang. Istalgan vaqtda boshqasiga o'tishingiz mumkin.</p>
      </div>
      <div className="course-list">
        {items.map((course) => {
          const isActive = activeCollection === course.name;
          const percent = course.total_words === 0
            ? 0
            : Math.round((course.learned_count / course.total_words) * 100);
          const finished = course.total_words > 0 && course.learned_count >= course.total_words;
          const action = course.is_locked ? "locked" : isActive ? "active" : (course.learned_count > 0 ? "continue" : "start");

          return (
            <motion.button
              key={course.name}
              type="button"
              className="course-card"
              data-active={isActive}
              data-locked={course.is_locked}
              disabled={course.is_locked}
              whileTap={tapScale(course.is_locked)}
              onClick={() => {
                if (course.is_locked) return;
                onSelect(isActive ? null : course.name);
              }}
            >
              <div className="course-card-head">
                <div className="course-card-title">
                  <strong>{course.name}</strong>
                  <span className="course-card-level">{course.level_range}</span>
                </div>
                {course.is_locked ? (
                  <span className="course-card-badge"><Crown size={13} /> Premium</span>
                ) : isActive ? (
                  <span className="course-card-badge active"><Check size={13} /> Faol</span>
                ) : null}
              </div>
              <div className="course-card-progress">
                <div className="progress-bar">
                  <MotionProgress value={percent} />
                </div>
                <span>{course.learned_count}/{course.total_words}</span>
              </div>
              <div className="course-card-action">
                {action === "locked" ? <><Lock size={14} /> Qulflangan</>
                  : action === "active" ? <>Tanlandi · qayta bosing — bekor qilish</>
                  : finished ? <><Check size={14} /> Tugatildi · qaytadan</>
                  : action === "continue" ? <><Play size={14} /> Davom etish</>
                  : <><Play size={14} /> Boshlash</>}
              </div>
            </motion.button>
          );
        })}
      </div>
      {activeCollection ? (
        <button type="button" className="secondary-button courses-clear" onClick={() => onSelect(null)}>
          Hammasini ko'rsatish
        </button>
      ) : null}
    </section>
  );
}
