import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Film, Play, Activity, Settings2 } from 'lucide-react';
import { Platform, JobStatus, UploadResponse, QualityMode } from './types';
import { VideoUploader } from './components/VideoUploader';
import { PlatformSelector } from './components/PlatformSelector';
import { QualityModeSelector } from './components/QualityModeSelector';
import { LanguageSelector } from './components/LanguageSelector';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const ProcessingStatus = lazy(() => import('./components/ProcessingStatus').then(module => ({ default: module.ProcessingStatus })));
const VideoPreview = lazy(() => import('./components/VideoPreview').then(module => ({ default: module.VideoPreview })));
const VideoMetadataDisplay = lazy(() => import('./components/VideoMetadataDisplay').then(module => ({ default: module.VideoMetadataDisplay })));
const ComparisonReport = lazy(() => import('./components/ComparisonReport').then(module => ({ default: module.ComparisonReport })));

export default function App() {
  const { t, i18n } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [platform, setPlatform] = useState<Platform>('instagram_reels');
  const [qualityMode, setQualityMode] = useState<QualityMode>('maximum');
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    document.documentElement.dir = i18n.dir();
    document.documentElement.lang = i18n.language;
    document.title = t('header_title');
  }, [i18n.language, t]);

  useEffect(() => {
    let interval: number;
    if (jobId && (jobStatus?.status === 'processing' || jobStatus?.status === 'queued')) {
      interval = window.setInterval(async () => {
        try {
          const res = await axios.get(`/api/status/${jobId}`);
          if (res.data?.success) {
            const data: JobStatus = res.data.data;
            setJobStatus(data);
            if (data.status !== 'processing' && data.status !== 'queued') {
              clearInterval(interval);
            }
          }
        } catch (err) {
          console.error(err);
        }
      }, 2000); // Polling every 2 seconds
    }
    return () => clearInterval(interval);
  }, [jobId, jobStatus?.status]);

  const handleFileSelect = async (selectedFile: File | null) => {
    setFile(selectedFile);
    setJobStatus(null);
    setJobId(null);
    setUploadProgress(0);
    
    if (!selectedFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      // @ts-ignore
      const res = await axios.post<{success: boolean, data: UploadResponse}>('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });

      const data = res.data.data;
      setJobId(data.jobId);
      setJobStatus({ status: 'idle', progress: 0, originalMetadata: data.metadata });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message;
      alert(t('error_title') + ': ' + errorMessage);
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcess = async () => {
    if (!jobId) return;

    const currentOriginalMetadata = jobStatus?.originalMetadata;
    setJobStatus({ status: 'queued', progress: 0, platform, qualityMode, originalMetadata: currentOriginalMetadata });
    
    try {
      const res = await axios.post('/api/process', { jobId, platform, qualityMode });

      if (!res.data?.success) {
        throw new Error(res.data?.error || t('error_title'));
      }
      
      setTimeout(() => {
        document.getElementById('status-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message;
      setJobStatus({ status: 'error', progress: 0, platform, qualityMode, error: errorMessage, originalMetadata: currentOriginalMetadata });
    }
  };

  const isProcessing = jobStatus?.status === 'processing' || jobStatus?.status === 'queued' || isUploading;

  return (
    <div className="min-h-screen pb-20 font-sans text-gray-900 bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-sm shrink-0">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t('header_title')}</h1>
              <p className="text-sm text-gray-500 font-medium hidden sm:block">{t('header_subtitle')}</p>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm">1</span>
            {t('step1_title')}
          </h2>
          <VideoUploader file={file} onFileSelect={handleFileSelect} disabled={isProcessing} uploadProgress={uploadProgress} />
          {isUploading && uploadProgress === 100 && (
            <div className="mt-4 flex items-center gap-3 text-blue-600 justify-center">
              <Activity className="w-5 h-5 animate-pulse" />
              <span className="font-medium">{t('uploading')}</span>
            </div>
          )}
        </section>

        <Suspense fallback={<div className="h-20 animate-pulse bg-gray-200 rounded-xl"></div>}>
          {jobStatus?.originalMetadata && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <VideoMetadataDisplay metadata={jobStatus.originalMetadata} title={t('meta_original')} />
            </section>
          )}
        </Suspense>

        <section className={!jobStatus?.originalMetadata ? 'opacity-50 pointer-events-none transition-opacity duration-300' : 'transition-opacity duration-300'}>
          <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm">2</span>
            {t('step2_title')}
          </h2>
          <PlatformSelector selected={platform} onSelect={setPlatform} disabled={isProcessing} />
        </section>

        <section className={!jobStatus?.originalMetadata ? 'opacity-50 pointer-events-none transition-opacity duration-300' : 'transition-opacity duration-300'}>
          <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm">3</span>
            <Settings2 className="w-5 h-5 text-gray-700" />
            {t('step3_title')}
          </h2>
          <QualityModeSelector selected={qualityMode} onSelect={setQualityMode} disabled={isProcessing} />
        </section>

        {jobStatus?.originalMetadata && (!jobStatus.status || jobStatus.status === 'idle' || jobStatus.status === 'error') && (
          <div className="flex justify-center pt-8 pb-4">
            <button
              onClick={handleProcess}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-4 px-12 rounded-full text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
            >
              <Play className="w-6 h-6 fill-current" />
              {t('process_btn')}
            </button>
          </div>
        )}

        <Suspense fallback={<div className="h-40 animate-pulse bg-gray-200 rounded-xl"></div>}>
          {jobStatus && jobStatus.status !== 'idle' && (
            <section className="scroll-mt-24" id="status-section">
              <ProcessingStatus status={jobStatus} />
            </section>
          )}

          {jobStatus?.status === 'completed' && jobStatus.processedMetadata && jobStatus.originalMetadata && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <ComparisonReport 
                  original={jobStatus.originalMetadata} 
                  processed={jobStatus.processedMetadata} 
                  score={jobStatus.qualityScore}
               />
            </section>
          )}

          {file && (
            <section className="pt-10 border-t border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Film className="w-6 h-6 text-blue-600" />
                {t('preview_title')}
              </h2>
              <VideoPreview file={file} resultUrl={jobStatus?.resultUrl} />
            </section>
          )}
        </Suspense>
      </main>
    </div>
  );
}
