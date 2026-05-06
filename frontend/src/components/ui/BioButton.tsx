import React from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BioButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
}

export const BioButton: React.FC<BioButtonProps> = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  glow = true,
  ...props 
}) => {
  const variants = {
    primary: 'bg-bio-green/10 text-bio-green border-bio-green/30 hover:bg-bio-green/20',
    secondary: 'bg-bio-cyan/10 text-bio-cyan border-bio-cyan/30 hover:bg-bio-cyan/20',
    danger: 'bg-bio-red/10 text-bio-red border-bio-red/30 hover:bg-bio-red/20',
    ghost: 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-white/5',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };

  const glows = {
    primary: 'hover:shadow-[0_0_15px_rgba(0,255,128,0.3)]',
    secondary: 'hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]',
    danger: 'hover:shadow-[0_0_15px_rgba(255,61,0,0.3)]',
    ghost: '',
  };

  // Filter out non-standard button props for motion.button
  const { ...buttonProps } = props as any;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-bio-green/50 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        glow && glows[variant],
        className
      )}
      {...buttonProps}
    >
      {children}
    </motion.button>
  );
};
