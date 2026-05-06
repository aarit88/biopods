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
    green: 'hover:border-bio-green/30 hover:shadow-[0_0_20px_rgba(0,255,128,0.1)]',
    cyan: 'hover:border-bio-cyan/30 hover:shadow-[0_0_20px_rgba(0,229,255,0.1)]',
    red: 'hover:border-bio-red/30 hover:shadow-[0_0_20px_rgba(255,61,0,0.1)]',
    amber: 'hover:border-bio-amber/30 hover:shadow-[0_0_20px_rgba(255,171,0,0.1)]',
  };

  return (
    <div className={cn(
      "glass-card overflow-hidden",
      hoverable && glowStyles[glowColor],
      className
    )}>
      {children}
    </div>
  );
};
