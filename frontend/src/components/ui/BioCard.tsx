import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BioCardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  glowColor?: 'green' | 'cyan' | 'red' | 'amber';
}

export const BioCard: React.FC<BioCardProps> = ({ 
  children, 
  className, 
  hoverable = true,
  glowColor = 'green'
}) => {
  const glowStyles = {
    green: 'hover:border-bio-green/40 hover:shadow-[0_0_40px_rgba(0,255,128,0.15)] group-hover:border-bio-green/40',
    cyan: 'hover:border-bio-cyan/40 hover:shadow-[0_0_40px_rgba(0,229,255,0.15)] group-hover:border-bio-cyan/40',
    red: 'hover:border-bio-red/40 hover:shadow-[0_0_40px_rgba(255,61,0,0.15)] group-hover:border-bio-red/40',
    amber: 'hover:border-bio-amber/40 hover:shadow-[0_0_40px_rgba(255,171,0,0.15)] group-hover:border-bio-amber/40',
  };

  return (
    <div className={cn(
      "glass-card relative group",
      hoverable && glowStyles[glowColor],
      className
    )}>
      {/* Inner Glow Border */}
      <div className="absolute inset-px rounded-[inherit] bg-gradient-to-br from-white/5 to-transparent pointer-events-none z-[-1]" />
      <div className="absolute inset-0 rounded-[inherit] border border-white/5 pointer-events-none group-hover:border-white/10 transition-colors" />
      
      {children}
    </div>
  );
};
