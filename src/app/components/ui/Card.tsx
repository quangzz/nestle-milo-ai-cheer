import React from 'react';
import { motion } from 'motion/react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  goldBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', goldBorder = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className={`relative bg-gradient-to-b from-[#004B20]/90 to-[#002B12]/95 backdrop-blur-md rounded-2xl p-6 milo-box-shadow ${
        goldBorder ? 'border-2 border-[#F5A623]' : 'border border-white/20'
      } ${className}`}
    >
      {children}
    </motion.div>
  );
};
