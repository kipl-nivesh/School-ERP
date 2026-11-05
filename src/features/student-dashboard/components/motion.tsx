'use client';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
export function StudentReveal({ children, className = '', index = 0, hover = false }: { children: ReactNode; className?: string; index?: number; hover?: boolean }) {
  const reduced=useReducedMotion();
  return <motion.div className={className} initial={{opacity:0}} animate={{opacity:1}} transition={{duration:reduced?0:0.28,delay:reduced?0:Math.min(index,5)*0.035}} whileHover={hover&&!reduced?{y:-3}:undefined}>{children}</motion.div>;
}
export function StudentProgress({value}:{value:number}) {
  const reduced=useReducedMotion();
  return <motion.span className="sd-progress-fill" aria-hidden="true" initial={{scaleX:0}} animate={{scaleX:value/100}} transition={{duration:reduced?0:0.4,ease:'easeOut'}}/>;
}
