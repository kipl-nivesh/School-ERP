'use client';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
export function Reveal({ children, className = '', index = 0, hover = false }: { children: ReactNode; className?: string; index?: number; hover?: boolean }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : 0.28, delay: reduced ? 0 : index * 0.035 }} whileHover={hover && !reduced ? { y: -3 } : undefined}>{children}</motion.div>;
}
export function AnimatedProgress({ percent }: { percent: number }) {
  const reduced = useReducedMotion();
  return <motion.span aria-hidden="true" className="ad-progress-fill" initial={{ scaleX: 0 }} animate={{ scaleX: percent / 100 }} transition={{ duration: reduced ? 0 : 0.4, ease: 'easeOut' }} />;
}
