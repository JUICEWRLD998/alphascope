'use client';

import { motion } from 'framer-motion';

interface AnimateInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Thin client wrapper that fades + slides children into view.
 * Safe to use around server-rendered JSX — the children prop pattern
 * is fully supported in Next.js App Router.
 */
export default function AnimateIn({ children, delay = 0, className }: AnimateInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
