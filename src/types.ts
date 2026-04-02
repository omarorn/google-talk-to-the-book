export type UserStatus = 'online' | 'offline' | 'in-game';

export interface UserProfile {
  username: string;
  avatar: string;
  status: UserStatus;
  role: string;
}

export interface TranscriptMessage {
  role: 'user' | 'model';
  text?: string;
  thought?: string;
  toolCalls?: any[];
  inlineData?: {
    mimeType: string;
    data: string;
  };
  isFinal: boolean;
}
