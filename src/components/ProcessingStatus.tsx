import React, { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Download, FileVideo } from 'lucide-react';
import { JobStatus } from '../types';
import { useTranslation } from 'react-i18next';

interface Props {
  status: JobStatus;
}

export function ProcessingStatus({ status }: Props) {
  const { t } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!status.resultUrl) return;
    setIsDownloading(true);
    try {
      const res = await fetch(status.resultUrl);
      if (!res.ok) throw new Error('Download failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = status.processedMetadata?.filename || 'processed-video.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error downloading file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (status.status === 'processing') {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('processing_title')}</h3>
        <p className="text-gray-500 mb-6">{t('processing_desc')}</p>
        
        <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden" dir="ltr">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out" 
            style={{ width: `${status.progress}%` }}
          ></div>
        </div>
        <p className="text-sm font-semibold text-blue-600 text-left" dir="ltr">{Math.round(status.progress)}%</p>
      </div>
    );
  }

  if (status.status === 'completed') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center shadow-sm">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('completed_title')}</h3>
        <p className="text-gray-600 mb-6">{t('completed_desc')}</p>
        
        <button 
          onClick={handleDownload}
          disabled={isDownloading}
          className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-75 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
        >
          {isDownloading ? (
             <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
             <Download className="w-5 h-5" />
          )}
          {isDownloading ? t('downloading') : t('download_btn')}
        </button>
      </div>
    );
  }

  if (status.status === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center shadow-sm">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('error_title')}</h3>
        <p className="text-red-700 mb-4">{status.error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          {t('error_retry')}
        </button>
      </div>
    );
  }

  return null;
}
