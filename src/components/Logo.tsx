import React, { useState, useEffect } from 'react';
import { mockService, resolveAttachmentUrl } from '../services/mockService';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  containerClassName?: string;
  fallbackIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  containerClassName, 
  fallbackIcon,
  size = 'md'
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const settings = mockService.getComplianceSettings();
    // Priority: uploaded systemLogo → bundled brand asset in /public
    const raw = settings.systemLogo || '/logo-der3.png';
    setLogoUrl(resolveAttachmentUrl(raw) || raw);
    setError(false);
  }, []);

  if (error || !logoUrl) {
    if (fallbackIcon) return <div className={containerClassName}>{fallbackIcon}</div>;
    
    const sizeClasses = {
      sm: "w-6 h-6",
      md: "w-9 h-9",
      lg: "w-20 h-20",
      xl: "w-28 h-28"
    };

    const iconClasses = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-10 h-10",
      xl: "w-14 h-14"
    };

    return (
      <div className={cn(
        "rounded-xl flex items-center justify-center text-white shadow-lg",
        sizeClasses[size],
        containerClassName
      )}
      style={{ background: 'linear-gradient(135deg, #1f3a5f 0%, #8ba368 100%)' }}>
        <ShieldCheck className={cn(iconClasses[size])} />
      </div>
    );
  }

  const containerSizes = {
    sm: "w-6 h-6",
    md: "w-9 h-9",
    lg: "w-20 h-20",
    xl: "w-28 h-28"
  };

  return (
    <div className={cn("flex items-center justify-center overflow-hidden", containerSizes[size], containerClassName)}>
      <img 
        src={logoUrl} 
        alt="Logo" 
        className={cn("w-full h-full object-contain", className)} 
        onError={() => setError(true)}
      />
    </div>
  );
};
