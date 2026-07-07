import React, { memo } from 'react';
import { QualityMode } from '../types';
import { Sparkles, Scale, Minimize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  selected: QualityMode;
  onSelect: (mode: QualityMode) => void;
  disabled?: boolean;
}

export const QualityModeSelector = memo(function QualityModeSelector({ selected, onSelect, disabled }: Props) {
  const { t, i18n } = useTranslation();
  
  const modes: { id: QualityMode; name: string; icon: React.ElementType; desc: string }[] = [
    { 
      id: 'maximum', 
      name: t('quality_max'), 
      icon: Sparkles, 
      desc: t('quality_max_desc') 
    },
    { 
      id: 'balanced', 
      name: t('quality_bal'), 
      icon: Scale, 
      desc: t('quality_bal_desc') 
    },
    { 
      id: 'smaller_size', 
      name: t('quality_small'), 
      icon: Minimize2, 
      desc: t('quality_small_desc') 
    },
  ];

  const isRtl = i18n.dir() === 'rtl';

  return (
    <div className="flex flex-col gap-3">
      {modes.map((m) => {
        const isSelected = selected === m.id;
        const Icon = m.icon;
        
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            disabled={disabled}
            className={`flex items-start p-4 rounded-xl border-2 transition-all ${isRtl ? 'text-right' : 'text-left'} ${
              isSelected 
                ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className={`p-2.5 rounded-full ${isRtl ? 'ml-4' : 'mr-4'} shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">{m.name}</h4>
              <p className="text-sm text-gray-500">{m.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
});
