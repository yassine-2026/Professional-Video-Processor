import React from 'react';
import { Platform } from '../types';
import { Instagram, Youtube, Smartphone, Facebook, Twitter, Linkedin, MessageCircle, Send } from 'lucide-react';

interface Props {
  selected: Platform;
  onSelect: (platform: Platform) => void;
  disabled?: boolean;
}

export function PlatformSelector({ selected, onSelect, disabled }: Props) {
  const platforms: { id: Platform; name: string; icon: React.ElementType; desc: string }[] = [
    { id: 'instagram_reels', name: 'Instagram Reels', icon: Instagram, desc: '1080x1920 (9:16)' },
    { id: 'instagram_post', name: 'Instagram Feed', icon: Instagram, desc: '1080x1080 (1:1)' },
    { id: 'instagram_stories', name: 'Instagram Stories', icon: Instagram, desc: '1080x1920 (9:16)' },
    { id: 'tiktok', name: 'TikTok', icon: Smartphone, desc: '1080x1920 (9:16)' },
    { id: 'youtube_shorts', name: 'YouTube Shorts', icon: Youtube, desc: '1080x1920 (9:16)' },
    { id: 'youtube_video', name: 'YouTube Video', icon: Youtube, desc: '1920x1080 (16:9)' },
    { id: 'facebook_reels', name: 'Facebook Reels', icon: Facebook, desc: '1080x1920 (9:16)' },
    { id: 'facebook_video', name: 'Facebook Video', icon: Facebook, desc: '1920x1080 (16:9)' },
    { id: 'snapchat_spotlight', name: 'Snapchat Spotlight', icon: Smartphone, desc: '1080x1920 (9:16)' },
    { id: 'twitter_video', name: 'Twitter/X Video', icon: Twitter, desc: '1920x1080 (16:9)' },
    { id: 'linkedin_video', name: 'LinkedIn Video', icon: Linkedin, desc: '1920x1080 (16:9)' },
    { id: 'pinterest_video', name: 'Pinterest Video', icon: Smartphone, desc: '1080x1920 (9:16)' },
    { id: 'telegram_video', name: 'Telegram Video', icon: Send, desc: '1920x1080 (16:9)' },
    { id: 'whatsapp_status', name: 'WhatsApp Status', icon: MessageCircle, desc: '1080x1920 (9:16)' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {platforms.map((p) => {
        const isSelected = selected === p.id;
        const Icon = p.icon;
        
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            disabled={disabled}
            className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
              isSelected 
                ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-4 ring-blue-600/10' 
                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className={`p-2.5 rounded-full mb-2 ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <Icon className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1 text-center text-sm" dir="ltr">{p.name}</h4>
            <p className="text-[11px] text-gray-500 font-mono mt-auto" dir="ltr">{p.desc}</p>
          </button>
        );
      })}
    </div>
  );
}
