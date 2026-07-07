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

// Ensure ffmpeg and ffprobe paths are set
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const app = express();
const PORT = parseInt(process.env.PORT as string, 10) || 3000;

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
  message: { error: 'Too many uploads from this IP, please try again after an hour' }
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

const jobs = new Map<string, JobRecord>();
const jobQueue: string[] = [];
let activeJobs = 0;
const MAX_CONCURRENT_JOBS = Math.max(1, os.cpus().length - 1); // Leave 1 core for the main thread

// File Cleanup Task
const CLEANUP_INTERVAL = 1000 * 60 * 30; // 30 minutes
const MAX_FILE_AGE = 1000 * 60 * 60; // 1 hour

setInterval(() => {
  const now = Date.now();
  console.log('Running scheduled file cleanup...');
  for (const [jobId, job] of jobs.entries()) {
    if (now - job.createdAt > MAX_FILE_AGE) {
      if (job.inputPath && fs.existsSync(job.inputPath)) {
        fs.unlink(job.inputPath, () => {});
      }
      if (job.outputPath && fs.existsSync(job.outputPath)) {
        fs.unlink(job.outputPath, () => {});
      }
      jobs.delete(jobId);
    }
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
      res.status(400).json({ error: 'No video file provided' });
      return;
    }

    const inputPath = req.file.path;
    const jobId = path.basename(inputPath, path.extname(inputPath));
    
    const metadata = await analyzeVideo(inputPath, req.file.originalname);
    
    jobs.set(jobId, {
      status: 'idle',
      progress: 0,
      originalMetadata: metadata,
      inputPath: inputPath,
      createdAt: Date.now()
    });

    res.json({ jobId, metadata });
  } catch (err: any) {
    console.error(err);
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Failed to analyze video: ' + err.message });
  }
});

app.post('/api/process', async (req, res) => {
  try {
    const { jobId, platform, qualityMode = 'maximum' } = req.body;
    
    if (!jobId || !platform || !PLATFORM_PROFILES[platform]) {
      res.status(400).json({ error: 'Invalid parameters' });
      return;
    }

    const job = jobs.get(jobId);
    if (!job || !job.inputPath) {
      res.status(404).json({ error: 'Job or file not found' });
      return;
    }

    const outputPath = path.join(outputDir, `${jobId}_${platform}_${qualityMode}.mp4`);

    jobs.set(jobId, { ...job, status: 'queued', progress: 0, platform, qualityMode, outputPath });

    // Add to queue instead of processing directly
    jobQueue.push(jobId);
    
    res.json({ jobId, message: 'Job added to queue' });
    
    processNextJob();

  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

const processNextJob = () => {
  if (activeJobs >= MAX_CONCURRENT_JOBS || jobQueue.length === 0) {
    return;
  }

  const jobId = jobQueue.shift();
  if (!jobId) return;

  const job = jobs.get(jobId);
  if (!job || !job.inputPath || !job.outputPath || !job.platform || !job.qualityMode) {
    processNextJob(); // Skip invalid job
    return;
  }

  activeJobs++;
  
  const { inputPath, outputPath, platform, qualityMode } = job;
  const profile = PLATFORM_PROFILES[platform];

  jobs.set(jobId, { ...job, status: 'processing' });

  let crf = '17';
  let audioBitrate = '256k';
  let preset = 'medium'; // Changed from slow for better performance/quality balance

  if (qualityMode === 'balanced') {
    crf = '23';
    audioBitrate = '192k';
    preset = 'fast';
  } else if (qualityMode === 'smaller_size') {
    crf = '28';
    audioBitrate = '128k';
    preset = 'veryfast';
  }

  // Start FFmpeg processing in background
  ffmpeg(inputPath)
    .videoCodec('libx264')
    .audioCodec('aac')
    .format('mp4')
    .outputOptions([
      '-pix_fmt yuv420p',
      `-crf ${crf}`, // Quality
      `-preset ${preset}`, // Compression preset optimized for speed/quality
      '-profile:v high',
      '-level 4.1',
      '-movflags +faststart', // Web optimized
      `-b:a ${audioBitrate}`
    ])
    // Perform Lanczos crop/scale and unsharp mask
    .videoFilters([
      `scale=${profile.width}:${profile.height}:force_original_aspect_ratio=increase:flags=lanczos`,
      `crop=${profile.width}:${profile.height}`,
      `unsharp=3:3:0.5:3:3:0.0` // Light sharpening to recover details after scaling
    ])
    .on('progress', (progress) => {
      if (jobs.has(jobId)) {
        const currentJob = jobs.get(jobId)!;
        const percent = progress.percent !== undefined ? Math.min(Math.max(progress.percent, 0), 100) : 0;
        jobs.set(jobId, { ...currentJob, progress: percent });
      }
    })
    .on('end', async () => {
      if (jobs.has(jobId)) {
         const currentJob = jobs.get(jobId)!;
         try {
           const processedMetadata = await analyzeVideo(outputPath, `processed_${platform}.mp4`);
           const qualityScore = calculateQualityScore(processedMetadata, profile);
           jobs.set(jobId, { 
             ...currentJob, 
             status: 'completed', 
             resultUrl: `/api/download/${jobId}`, 
             progress: 100,
             processedMetadata,
             qualityScore
           });
         } catch (analyzeErr) {
           console.error(`Post-process analysis failed for ${jobId}:`, analyzeErr);
           jobs.set(jobId, { ...currentJob, status: 'error', error: 'Failed to analyze output video' });
         }
      }
      fs.unlink(inputPath, () => {});
      activeJobs--;
      processNextJob();
    })
    .on('error', (err) => {
      console.error(`FFmpeg error for ${jobId}:`, err);
      if (jobs.has(jobId)) {
         const currentJob = jobs.get(jobId)!;
         jobs.set(jobId, { ...currentJob, status: 'error', error: err.message });
      }
      fs.unlink(inputPath, () => {});
      activeJobs--;
      processNextJob();
    })
    .save(outputPath);
};

app.get('/api/stats', (req, res) => {
  res.json({
    activeJobs,
    queuedJobs: jobQueue.length,
    maxConcurrentJobs: MAX_CONCURRENT_JOBS,
    totalTrackedJobs: jobs.size
  });
});

app.get('/api/status/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  if (!jobs.has(jobId)) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  // Exclude internal paths before sending to client
  const { inputPath, outputPath, ...publicJobData } = jobs.get(jobId)!;
  res.json(publicJobData);
});

app.get('/api/download/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs.get(jobId);
  if (!job || job.status !== 'completed' || !job.outputPath) {
    res.status(404).json({ error: 'File not ready or job not found' });
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
    res.status(404).json({ error: 'File not found on disk' });
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

