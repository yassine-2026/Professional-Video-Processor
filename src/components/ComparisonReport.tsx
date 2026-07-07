import React, { memo } from 'react';
import { VideoMetadata, JobStatus } from '../types';
import { ArrowLeft, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  original: VideoMetadata;
  processed: VideoMetadata;
  score?: number;
}

export const ComparisonReport = memo(function ComparisonReport({ original, processed, score }: Props) {
  const { t, i18n } = useTranslation();
  const formatSize = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  const formatBitrate = (bitrate: number) => bitrate ? Math.round(bitrate / 1000) + ' kbps' : 'N/A';

  const isRtl = i18n.dir() === 'rtl';

  const ChangeRow = ({ label, oldVal, newVal, isChanged }: { label: string, oldVal: string, newVal: string, isChanged: boolean }) => {
    if (!isChanged) return null;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 rounded-lg transition-colors">
        <span className="text-gray-600 font-medium w-32">{label}</span>
        <div className="flex items-center gap-3 mt-2 sm:mt-0 font-mono text-sm" dir="ltr">
          <span className="text-gray-500">{oldVal}</span>
          <ArrowLeft className={`w-4 h-4 text-blue-400 ${isRtl ? 'rotate-180' : ''}`} />
          <span className="text-gray-900 font-semibold">{newVal}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {score !== undefined && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              {t('comp_score_title')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{t('comp_score_desc')}</p>
          </div>
          <div className="text-3xl font-bold text-blue-600 font-mono" dir="ltr">
            {score}<span className="text-lg text-blue-400">/100</span>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-6 text-lg border-b border-gray-100 pb-3">{t('comp_changes_title')}</h3>
        
        <div className="space-y-1">
          <ChangeRow 
            label={t('meta_resolution')}
            oldVal={`${original.width}x${original.height}`} 
            newVal={`${processed.width}x${processed.height}`} 
            isChanged={original.width !== processed.width || original.height !== processed.height} 
          />
          <ChangeRow 
            label={t('meta_aspect')}
            oldVal={original.aspectRatio} 
            newVal={processed.aspectRatio} 
            isChanged={original.aspectRatio !== processed.aspectRatio} 
          />
          <ChangeRow 
            label={t('meta_fps')}
            oldVal={original.fps.toString()} 
            newVal={processed.fps.toString()} 
            isChanged={original.fps !== processed.fps} 
          />
          <ChangeRow 
            label={t('meta_vcodec')}
            oldVal={original.videoCodec.toUpperCase()} 
            newVal={processed.videoCodec.toUpperCase()} 
            isChanged={original.videoCodec !== processed.videoCodec} 
          />
          <ChangeRow 
            label={t('meta_acodec')}
            oldVal={original.audioCodec.toUpperCase()} 
            newVal={processed.audioCodec.toUpperCase()} 
            isChanged={original.audioCodec !== processed.audioCodec} 
          />
          <ChangeRow 
            label={t('meta_colorspace')}
            oldVal={original.colorSpace} 
            newVal={processed.colorSpace} 
            isChanged={original.colorSpace !== processed.colorSpace} 
          />
          <ChangeRow 
            label={t('meta_vbitrate')}
            oldVal={formatBitrate(original.videoBitrate)} 
            newVal={formatBitrate(processed.videoBitrate)} 
            isChanged={original.videoBitrate !== processed.videoBitrate} 
          />
          <ChangeRow 
            label={t('meta_abitrate')}
            oldVal={formatBitrate(original.audioBitrate)} 
            newVal={formatBitrate(processed.audioBitrate)} 
            isChanged={original.audioBitrate !== processed.audioBitrate} 
          />
          <ChangeRow 
            label={t('meta_size')}
            oldVal={formatSize(original.sizeBytes)} 
            newVal={formatSize(processed.sizeBytes)} 
            isChanged={original.sizeBytes !== processed.sizeBytes} 
          />
        </div>

        {Object.is(original, processed) && (
          <p className="text-gray-500 text-sm text-center py-4">{t('comp_no_changes')}</p>
        )}
      </div>
    </div>
  );
});
