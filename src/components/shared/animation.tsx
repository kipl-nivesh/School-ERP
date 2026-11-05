'use client';
import { MotionConfig, motion } from 'motion/react';
export function AnimationProvider({ children }: {
    children: React.ReactNode;
}) { return <MotionConfig reducedMotion="user">{children}</MotionConfig>; }
export function PageEntrance({ children }: {
    children: React.ReactNode;
}) { return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>{children}</motion.div>; }
export function AnimatedCard({ children, className = '' }: {
    children: React.ReactNode;
    className?: string;
}) { return <motion.div className={className} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }} transition={{ duration: 0.22 }}>{children}</motion.div>; }
