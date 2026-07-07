import React, { memo } from 'react';
import { VideoMetadata } from '../types';
import { useTranslation } from 'react-i18next';

interface Props {
  metadata: VideoMetadata;
  title?: string;
}

export const VideoMetadataDisplay = memo(function VideoMetadataDisplay({ metadata, title }: Props) {
  const { t } = useTranslation();
  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatBitrate = (bitrate: number) => {
    return bitrate ? Math.round(bitrate / 1000) + ' kbps' : 'N/A';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4">{title || t('meta_original')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-sm">
        <div>
          <span className="block text-gray-500 mb-1">{t('meta_resolution')}</span>
          <span className="font-mono text-gray-900" dir="ltr">{metadata.width}x{metadata.height}</span>
        </div>
        <div>
          <span className="block text-gray-500 mb-1">{t('meta_fps')}</span>
          <span className="font-mono text-gray-900" dir="ltr">{metadata.fps}</span>
        </div>
        <div>
          <span className="block text-gray-500 mb-1">{t('meta_vcodec')}</span>
          <span className="font-mono text-gray-900 uppercase" dir="ltr">{metadata.videoCodec}</span>
        </div>
        <div>
          <span className="block text-gray-500 mb-1">{t('meta_acodec')}</span>
          <span className="font-mono text-gray-900 uppercase" dir="ltr">{metadata.audioCodec}</span>
        </div>
        <div>
          <span className="block text-gray-500 mb-1">{t('meta_colorspace')}</span>
          <span className="font-mono text-gray-900" dir="ltr">{metadata.colorSpace}</span>
        </div>
        <div>
          <span className="block text-gray-500 mb-1">{t('meta_size')}</span>
          <span className="font-mono text-gray-900" dir="ltr">{formatSize(metadata.sizeBytes)}</span>
        </div>
        <div>
          <span className="block text-gray-500 mb-1">{t('meta_aspect')}</span>
          <span className="font-mono text-gray-900" dir="ltr">{metadata.aspectRatio}</span>
        </div>
        <div>
          <span className="block text-gray-500 mb-1">{t('meta_vbitrate')}</span>
          <span className="font-mono text-gray-900" dir="ltr">{formatBitrate(metadata.videoBitrate)}</span>
        </div>
        <div>
          <span className="block text-gray-500 mb-1">{t('meta_abitrate')}</span>
          <span className="font-mono text-gray-900" dir="ltr">{formatBitrate(metadata.audioBitrate)}</span>
        </div>
        <div>
          <span className="block text-gray-500 mb-1">{t('meta_duration')}</span>
          <span className="font-mono text-gray-900" dir="ltr">{metadata.durationSeconds.toFixed(1)}s</span>
        </div>
      </div>
    </div>
  );
});
