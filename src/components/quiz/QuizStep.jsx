import React from 'react';
import { motion } from 'framer-motion';

export default function QuizStep({ title, subtitle, children, stepNumber, totalSteps }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-stone-400 mb-2">
          <span>Passo {stepNumber} de {totalSteps}</span>
        </div>
        <div className="w-full bg-stone-200 rounded-full h-1.5 mb-6">
          <div
            className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
          />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">{title}</h2>
        {subtitle && <p className="mt-2 text-stone-500">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}