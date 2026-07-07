import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { JobStatus, Platform, QualityMode, VideoMetadata } from './src/types';

// Connect to Redis using environment variable or fallback to local
export const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
}) as any;

export interface VideoProcessingJobData {
  jobId: string;
  inputPath: string;
  outputPath: string;
  platform: Platform;
  qualityMode: QualityMode;
}

export const videoQueue = new Queue<VideoProcessingJobData>('video-processing', {
  connection: redisConnection
});

export const videoQueueEvents = new QueueEvents('video-processing', {
  connection: redisConnection
});
