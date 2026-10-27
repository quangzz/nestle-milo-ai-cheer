export type CampaignStep = 
  | 'FRAME_1_OPENING'
  | 'FRAME_2_ONBOARDING'
  | 'FRAME_3_TNC'
  | 'FRAME_4_PHONE'
  | 'FRAME_5_OTP'
  | 'FRAME_6_INFO'
  | 'FRAME_7_TOPIC'
  | 'FRAME_8_LOADING'
  | 'FRAME_9_OUTCOME';

export type CheerTopic = 'STUDY' | 'WORK' | 'WORKOUT';

export interface UserFormData {
  termsAgreed: boolean;
  marketingAgreed?: boolean;
  phone: string;
  otp: string;
  recipientName: string;
  avatarUrl: string | null;
  topic: CheerTopic | null;
  voiceType?: '01' | '02' | '03' | '04';
}

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface ChantDetails {
  topic: CheerTopic;
  title: string;
  subtitle: string;
  themeColor: string;
  badgeIcon: string;
  defaultRecipient: string;
  sampleLyrics: string[];
  timedLyrics: LyricLine[];
}

export interface SongResult {
  id: string;
  recipientName: string;
  topic: CheerTopic;
  voiceType?: '01' | '02' | '03' | '04';
  title: string;
  lyrics: LyricLine[];
  audioUrl: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  avatarUrl: string;
  createdAt: string;
}

