import React from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'gold' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-extrabold uppercase tracking-wide rounded-full cursor-pointer transition-all select-none milo-btn-pop';
  
  const variantStyles = {
    primary: 'bg-gradient-to-b from-[#28A745] to-[#005C28] text-white border-2 border-[#76FF03] shadow-[0_6px_0_#003316] hover:brightness-110',
    gold: 'bg-gradient-to-b from-[#FFDF00] to-[#F5A623] text-[#042E15] border-2 border-white shadow-[0_6px_0_#965800] hover:brightness-105',
    outline: 'bg-black/30 backdrop-blur-md text-white border-2 border-white/80 hover:bg-white/10 shadow-[0_4px_0_rgba(0,0,0,0.4)]',
    ghost: 'bg-transparent text-white hover:bg-white/10 underline underline-offset-4'
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg font-black'
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};
