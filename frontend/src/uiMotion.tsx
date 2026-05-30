import type { JSX, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export const spring = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
  mass: 0.9,
};

export function tapScale(disabled = false): { scale?: number } {
  return disabled ? {} : { scale: 0.97 };
}

export function AnimatedScreen({ children }: { children: ReactNode }): JSX.Element {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="motion-screen"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
      transition={reduce ? { duration: 0 } : spring}
    >
      {children}
    </motion.div>
  );
}

export function MotionProgress({ value }: { value: number }): JSX.Element {
  const reduce = useReducedMotion();
  return (
    <motion.span
      initial={false}
      animate={{ scaleX: Math.max(0, Math.min(100, value)) / 100 }}
      style={{ transformOrigin: "left" }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 24 }}
    />
  );
}
