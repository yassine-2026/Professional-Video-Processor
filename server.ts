import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { createServer as createViteServer } from 'vite';
import { VideoMetadata, JobStatus, Platform } from './src/types';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import { redisConnection, videoQueue } from './queue';
import './worker';

// Ensure ffmpeg and ffprobe paths are set
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const app = express();
const PORT = parseInt(process.env.PORT as string, 10) || 3000;

app.set('trust proxy', 1);

// Setup directories - use tmp on serverless/render environments
const baseDir = process.env.VERCEL || process.env.RENDER ? os.tmpdir() : process.cwd();
const uploadsDir = path.join(baseDir, 'uploads');
const outputDir = path.join(baseDir, 'output');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Security and CORS
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Vite uses inline scripts in dev
  crossOriginEmbedderPolicy: false,
}));

// Rate Limiting setup
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: { success: false, error: 'Too many uploads from this IP, please try again after an hour' }
});

app.use(limiter);

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'));
  }
});

// Job store and Queue System
interface JobRecord extends JobStatus {
  inputPath?: string;
  outputPath?: string;
  createdAt: number;
}

// File Cleanup Task
const CLEANUP_INTERVAL = 1000 * 60 * 30; // 30 minutes
const MAX_FILE_AGE = 1000 * 60 * 60; // 1 hour

setInterval(async () => {
  try {
    const now = Date.now();
    console.log('Running scheduled file cleanup...');
    const keys = await redisConnection.keys('job:*');
    for (const key of keys) {
      const data = await redisConnection.get(key);
      if (data) {
        const job: JobRecord = JSON.parse(data);
        if (now - job.createdAt > MAX_FILE_AGE) {
          if (job.inputPath && fs.existsSync(job.inputPath)) fs.unlink(job.inputPath, () => {});
          if (job.outputPath && fs.existsSync(job.outputPath)) fs.unlink(job.outputPath, () => {});
          await redisConnection.del(key);
        }
      }
    }
  } catch(e) {
    console.error('Cleanup error:', e);
  }
}, CLEANUP_INTERVAL);

app.use(express.json());

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

// Helper to analyze video using ffprobe
const analyzeVideo = (filePath: string, filename: string): Promise<VideoMetadata> => {
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
      
      // Calculate aspect ratio string precisely based on gcd
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

const calculateQualityScore = (metadata: VideoMetadata, profile: any) => {
  let score = 0;
  if (metadata.width === profile.width && metadata.height === profile.height) score += 30;
  if (metadata.videoCodec === 'h264') score += 20;
  if (metadata.colorSpace === 'yuv420p') score += 20;
  if (metadata.audioCodec === 'aac') score += 15;
  if (metadata.audioBitrate >= 128000) score += 15;
  return score;
};

app.post('/api/upload', uploadLimiter, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No video file provided' });
      return;
    }

    const inputPath = req.file.path;
    const jobId = path.basename(inputPath, path.extname(inputPath));
    
    const metadata = await analyzeVideo(inputPath, req.file.originalname);
    
    const jobData: JobRecord = {
      status: 'idle',
      progress: 0,
      originalMetadata: metadata,
      inputPath: inputPath,
      createdAt: Date.now()
    };
    await redisConnection.set(`job:${jobId}`, JSON.stringify(jobData));

    res.json({ success: true, data: { jobId, metadata } });
  } catch (err: any) {
    console.error(err);
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ success: false, error: 'Failed to analyze video: ' + err.message });
  }
});

app.post('/api/process', async (req, res) => {
  try {
    const { jobId, platform, qualityMode = 'maximum' } = req.body;
    
    if (!jobId || !platform || !PLATFORM_PROFILES[platform]) {
      res.status(400).json({ success: false, error: 'Invalid parameters' });
      return;
    }

    const jobDataStr = await redisConnection.get(`job:${jobId}`);
    if (!jobDataStr) {
      res.status(404).json({ success: false, error: 'Job or file not found' });
      return;
    }

    const job: JobRecord = JSON.parse(jobDataStr);
    if (!job.inputPath) {
      res.status(404).json({ success: false, error: 'Job input file missing' });
      return;
    }

    const outputPath = path.join(outputDir, `${jobId}_${platform}_${qualityMode}.mp4`);

    job.status = 'queued';
    job.progress = 0;
    job.platform = platform;
    job.qualityMode = qualityMode;
    job.outputPath = outputPath;
    
    await redisConnection.set(`job:${jobId}`, JSON.stringify(job));

    // Add to BullMQ queue
    await videoQueue.add('process-video' as any, {
      jobId,
      inputPath: job.inputPath,
      outputPath,
      platform,
      qualityMode
    }, { jobId }); // Use jobID to prevent duplicates if needed
    
    res.json({ success: true, data: { jobId, message: 'Job added to queue' } });

  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error: ' + err.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const jobCounts = await videoQueue.getJobCounts('wait', 'active', 'completed', 'failed');
    res.json({
      success: true,
      data: {
        activeJobs: jobCounts.active,
        queuedJobs: jobCounts.wait,
        maxConcurrentJobs: 1,
        totalTrackedJobs: (await redisConnection.keys('job:*')).length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/status/:jobId', async (req, res) => {
  const jobId = req.params.jobId;
  const jobDataStr = await redisConnection.get(`job:${jobId}`);
  if (!jobDataStr) {
    res.status(404).json({ success: false, error: 'Job not found' });
    return;
  }
  // Exclude internal paths before sending to client
  const { inputPath, outputPath, ...publicJobData } = JSON.parse(jobDataStr);
  res.json({ success: true, data: publicJobData });
});

app.get('/api/download/:jobId', async (req, res) => {
  const jobId = req.params.jobId;
  const jobDataStr = await redisConnection.get(`job:${jobId}`);
  if (!jobDataStr) {
    res.status(404).json({ success: false, error: 'Job not found' });
    return;
  }
  
  const job = JSON.parse(jobDataStr);
  if (job.status !== 'completed' || !job.outputPath) {
    res.status(404).json({ success: false, error: 'File not ready or job not found' });
    return;
  }
  
  if (fs.existsSync(job.outputPath)) {
    const filename = job.processedMetadata?.filename || `processed_${job.platform}.mp4`;
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.sendFile(job.outputPath, (err) => {
      if (err) console.error('Error sending file:', err);
      setTimeout(() => {
        if (job.outputPath && fs.existsSync(job.outputPath)) {
          fs.unlink(job.outputPath, () => {});
        }
      }, 60000 * 5); // Delete 5 mins after download starts
    });
  } else {
    res.status(404).json({ success: false, error: 'File not found on disk' });
  }
});

// API 404 Handler - MUST be before SPA fallback
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

// Global Error Handler for API
app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;

