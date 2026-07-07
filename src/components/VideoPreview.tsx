import React, { useEffect, useState, memo } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  file: File | null;
  resultUrl?: string;
}

export const VideoPreview = memo(function VideoPreview({ file, resultUrl }: Props) {
  const { t } = useTranslation();
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setOriginalUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalUrl(null);
    }
  }, [file]);

  if (!file) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
          {t('preview_before')}
        </h4>
        <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center relative shadow-sm">
          {originalUrl && (
            <video 
              src={originalUrl} 
              controls 
              className="max-w-full max-h-full"
            />
          )}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          {t('preview_after')}
        </h4>
        <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-hidden aspect-video flex items-center justify-center relative shadow-sm">
          {resultUrl ? (
            <video 
              src={resultUrl} 
              controls 
              className="max-w-full max-h-full bg-black"
            />
          ) : (
            <div className="text-gray-400 text-sm font-medium">{t('preview_placeholder')}</div>
          )}
        </div>
      </div>
    </div>
  );
});
