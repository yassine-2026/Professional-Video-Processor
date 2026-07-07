import React, { useRef, useState } from 'react';
import { Upload, FileVideo, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
  uploadProgress?: number;
}

export function VideoUploader({ file, onFileSelect, disabled, uploadProgress }: Props) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
        validateAndSelectFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const validateAndSelectFile = (selectedFile: File) => {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (validTypes.includes(selectedFile.type)) {
      onFileSelect(selectedFile);
    } else {
      alert(t('upload_invalid'));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (file) {
    return (
      <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <FileVideo className="w-8 h-8" />
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-xs text-left" dir="ltr">{file.name}</p>
              <p className="text-sm text-gray-500" dir="ltr">{formatFileSize(file.size)}</p>
            </div>
          </div>
          {!disabled && (
            <button 
              onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              title={t('remove_video')}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {uploadProgress !== undefined && uploadProgress > 0 && uploadProgress < 100 && (
           <div className="w-full">
             <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
               <span>{t('uploading')}</span>
               <span>{Math.round(uploadProgress)}%</span>
             </div>
             <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden" dir="ltr">
               <div 
                 className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                 style={{ width: `${uploadProgress}%` }}
               ></div>
             </div>
           </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden" 
        disabled={disabled}
      />
      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <Upload className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('upload_drag')}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
        {t('upload_support')}
      </p>
    </div>
  );
}
