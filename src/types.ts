export type Platform = 
  | 'instagram_reels' 
  | 'instagram_post' 
  | 'instagram_stories'
  | 'tiktok' 
  | 'youtube_shorts' 
  | 'youtube_video'
  | 'facebook_reels'
  | 'facebook_video'
  | 'snapchat_spotlight'
  | 'twitter_video'
  | 'linkedin_video'
  | 'pinterest_video'
  | 'telegram_video'
  | 'whatsapp_status';

export type QualityMode = 'maximum' | 'balanced' | 'smaller_size';

export interface VideoMetadata {
  filename: string;
  sizeBytes: number;
  durationSeconds: number;
  width: number;
  height: number;
  aspectRatio: string;
  fps: number;
  videoCodec: string;
  audioCodec: string;
  videoBitrate: number;
  audioBitrate: number;
  colorSpace: string;
}

export interface JobStatus {
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  platform?: Platform;
  qualityMode?: QualityMode;
  resultUrl?: string;
  originalMetadata?: VideoMetadata;
  processedMetadata?: VideoMetadata;
  qualityScore?: number;
  error?: string;
}

export interface UploadResponse {
  jobId: string;
  metadata: VideoMetadata;
}

