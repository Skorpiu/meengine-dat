
'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'pt' : 'en');
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="gap-2" 
      type="button" 
      onClick={toggleLanguage}
      aria-label={`Switch to ${language === 'en' ? 'Portuguese' : 'English'}`}
      title={`Switch to ${language === 'en' ? 'Português' : 'English'}`}
    >
      <Globe className="h-4 w-4" />
      <span className="uppercase font-medium">{language}</span>
      <span className="text-xs opacity-70">
        {language === 'en' ? '🇬🇧' : '🇵🇹'}
      </span>
    </Button>
  );
}
