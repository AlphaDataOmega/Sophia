import React from 'react';
import { motion } from 'framer-motion';

export function GradientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--gradient-color-1),0.15),transparent_50%)] dark:bg-[radial-gradient(circle_at_center,rgba(var(--gradient-color-dark-1),0.15),transparent_50%)]" style={{ '--gradient-color-1': '59,130,246', '--gradient-color-dark-1': '147,197,253' } as React.CSSProperties} />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 45, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -left-1/2 top-0 h-[1000px] w-[1000px] rounded-full bg-gradient-to-r from-blue-400/30 to-purple-400/30 dark:from-blue-500/20 dark:to-purple-500/20 blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [45, 0, 45],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute right-0 top-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-l from-emerald-400/30 to-blue-400/30 dark:from-emerald-500/20 dark:to-blue-500/20 blur-3xl"
      />
    </div>
  );
}