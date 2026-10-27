import React from 'react';
import { motion } from 'motion/react';

interface ProgressRingProps {
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 140,
  strokeWidth = 10
}) => {
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track Circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#002B12"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated Progress Circle */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#miloGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ ease: "easeInOut", duration: 0.3 }}
        />
        <defs>
          <linearGradient id="miloGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFDF00" />
            <stop offset="50%" stopColor="#28A745" />
            <stop offset="100%" stopColor="#005C28" />
          </linearGradient>
        </defs>
      </svg>
      {/* Percentage Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-[#FFDF00] drop-shadow-md tracking-tight">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};
