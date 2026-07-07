import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import fs from 'fs';
import { VideoProcessingJobData } from './queue';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const PLATFORM_PROFILES: Record<string, { width: number, height: number, aspect: string }> = {
  'instagram_reels': { width: 1080, height: 1920, aspect: '9:16' },
  'instagram_post': { width: 1080, height: 1080, aspect: '1:1' },
  'instagram_stories': { width: 1080, height: 1920, aspect: '9:16' },
  'tiktok': { width: 1080, height: 1920, aspect: '9:16' },
  'youtube_shorts': { width: 1080, height: 1920, aspect: '9:16' },
  'youtube_video': { width: 1920, height: 1080, aspect: '16:9' },
  'facebook_reels': { width: 1080, height: 1920, aspect: '9:16' },
  'facebook_video': { width: 1920, height: 1080, aspect: '16:9' },
  'snapchat_spotlight': { width: 1080, height: 1920, aspect: '9:16' },
  'twitter_video': { width: 1920, height: 1080, aspect: '16:9' },
  'linkedin_video': { width: 1920, height: 1080, aspect: '16:9' },
  'pinterest_video': { width: 1080, height: 1920, aspect: '9:16' },
  'telegram_video': { width: 1920, height: 1080, aspect: '16:9' },
  'whatsapp_status': { width: 1080, height: 1920, aspect: '9:16' }
};

const analyzeVideo = (filePath: string, filename: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      if (!videoStream) return reject(new Error('No video stream found'));
      const fpsString = videoStream.r_frame_rate || videoStream.avg_frame_rate || '0/1';
      const [num, den] = fpsString.split('/');
      const fps = den ? Math.round(parseInt(num) / parseInt(den)) : parseInt(num);
      const sizeBytes = metadata.format.size || fs.statSync(filePath).size;
      const durationSeconds = metadata.format.duration || 0;
      const width = videoStream.width || 0;
      const height = videoStream.height || 0;
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(width, height);
      const aspectRatio = divisor > 0 ? `${width / divisor}:${height / divisor}` : 'N/A';
      resolve({
        filename,
        sizeBytes: Number(sizeBytes),
        durationSeconds: Number(durationSeconds),
        width,
        height,
        aspectRatio,
        fps,
        videoCodec: videoStream.codec_name || 'unknown',
        audioCodec: audioStream?.codec_name || 'none',
        videoBitrate: videoStream.bit_rate ? Number(videoStream.bit_rate) : (metadata.format.bit_rate ? Number(metadata.format.bit_rate) : 0),
        audioBitrate: audioStream?.bit_rate ? Number(audioStream.bit_rate) : 0,
        colorSpace: videoStream.pix_fmt || 'unknown'
      });
    });
  });
};

const calculateQualityScore = (metadata: any, profile: any) => {
  let score = 0;
  if (metadata.width === profile.width && metadata.height === profile.height) score += 30;
  if (metadata.videoCodec === 'h264') score += 20;
  if (metadata.colorSpace === 'yuv420p') score += 20;
  if (metadata.audioCodec === 'aac') score += 15;
  if (metadata.audioBitrate >= 128000) score += 15;
  return score;
};

const worker = new Worker<VideoProcessingJobData>(
  'video-processing',
  async (job: Job<VideoProcessingJobData>) => {
    const { jobId, inputPath, outputPath, platform, qualityMode } = job.data;
    
    // Read state
    const jobDataStr = await redisConnection.get(`job:${jobId}`);
    if (jobDataStr) {
      const jobData = JSON.parse(jobDataStr);
      jobData.status = 'processing';
      await redisConnection.set(`job:${jobId}`, JSON.stringify(jobData));
    }
    
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const profile = PLATFORM_PROFILES[platform];
    if (!profile) {
      throw new Error(`Invalid platform: ${platform}`);
    }

    // High quality settings
    let crf = '18';
    let audioBitrate = '192k';
    let preset = 'fast';

    if (qualityMode === 'maximum') {
      crf = '17';
      audioBitrate = '256k';
      preset = 'medium';
    } else if (qualityMode === 'smaller_size') {
      crf = '28';
      audioBitrate = '128k';
      preset = 'veryfast';
    } else if (qualityMode === 'balanced') {
      crf = '23';
      audioBitrate = '192k';
      preset = 'fast';
    }

    await job.updateProgress(0);

    return new Promise((resolve, reject) => {
      let duration = 0;
      let lastProgressTime = Date.now();

      ffmpeg(inputPath)
        .on('codecData', (data) => {
          // Time is expected in HH:MM:SS.ms format
          const durationParts = data.duration.split(':');
          if (durationParts.length === 3) {
            duration = (parseInt(durationParts[0]) * 3600) + 
                       (parseInt(durationParts[1]) * 60) + 
                       parseFloat(durationParts[2]);
          }
        })
        .on('progress', (progress) => {
          let percent = 0;
          if (progress.percent && !isNaN(progress.percent)) {
            percent = progress.percent;
          } else if (duration > 0 && progress.timemark) {
            const timeParts = progress.timemark.split(':');
            if (timeParts.length === 3) {
              const currentSeconds = (parseInt(timeParts[0]) * 3600) + 
                                   (parseInt(timeParts[1]) * 60) + 
                                   parseFloat(timeParts[2]);
              percent = Math.min((currentSeconds / duration) * 100, 99);
            }
          }

          percent = Math.max(0, Math.min(Math.round(percent), 99));
          
          const now = Date.now();
          if (now - lastProgressTime > 500) {
            job.updateProgress(percent).catch(console.error);
            // Also update redis
            redisConnection.get(`job:${jobId}`).then(jobDataStr => {
              if (jobDataStr) {
                const jobData = JSON.parse(jobDataStr);
                jobData.progress = percent;
                redisConnection.set(`job:${jobId}`, JSON.stringify(jobData));
              }
            });
            lastProgressTime = now;
          }
        })
        .on('end', async () => {
          try {
            await job.updateProgress(100);
            
            // Analyze output
            const processedMetadata = await analyzeVideo(outputPath, `processed_${platform}.mp4`);
            const qualityScore = calculateQualityScore(processedMetadata, profile);
            
            const jobDataStr = await redisConnection.get(`job:${jobId}`);
            if (jobDataStr) {
              const jobData = JSON.parse(jobDataStr);
              jobData.status = 'completed';
              jobData.progress = 100;
              jobData.processedMetadata = processedMetadata;
              jobData.qualityScore = qualityScore;
              jobData.resultUrl = `/api/download/${jobId}`;
              await redisConnection.set(`job:${jobId}`, JSON.stringify(jobData));
            }
            
            // Cleanup input
            fs.unlink(inputPath, () => {});
            resolve(true);
          } catch(e) {
            reject(e);
          }
        })
        .on('error', async (err) => {
          console.error(`Error processing job ${job.id}:`, err);
          const jobDataStr = await redisConnection.get(`job:${jobId}`);
          if (jobDataStr) {
            const jobData = JSON.parse(jobDataStr);
            jobData.status = 'error';
            jobData.error = err.message;
            await redisConnection.set(`job:${jobId}`, JSON.stringify(jobData));
          }
          fs.unlink(inputPath, () => {});
          reject(err);
        })
        .videoCodec('libx264')
        .outputOptions([
          `-crf ${crf}`,
          `-preset ${preset}`,
          '-pix_fmt yuv420p',
          '-movflags +faststart',
          `-threads ${Math.max(1, require('os').cpus().length - 1)}`, 
        ])
        .audioCodec('aac')
        .audioBitrate(audioBitrate)
        .videoFilters([
          `scale=${profile.width}:${profile.height}:force_original_aspect_ratio=increase:flags=lanczos`,
          `crop=${profile.width}:${profile.height}`,
          `unsharp=3:3:0.5:3:3:0.0`
        ])
        .save(outputPath);
    });
  },
  {
    connection: redisConnection,
    concurrency: 1, // Only process 1 video per worker to prevent out-of-memory
  } as any
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed!`);
});

worker.on('failed', async (job, err) => {
  console.log(`Job ${job?.id} has failed with ${err.message}`);
  if (job?.data?.jobId) {
    const jobDataStr = await redisConnection.get(`job:${job.data.jobId}`);
    if (jobDataStr) {
      const jobData = JSON.parse(jobDataStr);
      jobData.status = 'error';
      jobData.error = err.message;
      await redisConnection.set(`job:${job.data.jobId}`, JSON.stringify(jobData));
    }
  }
});

console.log('Video processing worker started.');
