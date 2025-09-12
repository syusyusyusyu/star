import { writable, type Writable } from 'svelte/store';

export type Mode = 'cursor' | 'hand' | 'body';

export interface Results {
  score: number;
  maxCombo: number;
  rank: string;
}

export interface Bubble {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: string;
  expiresAt: number;
  clicked: boolean;
}

export interface SongInfo {
  id?: number;
  title: string;
  artist?: string;
  apiToken: string;
  songUrl: string;
  difficulty?: 'easy' | 'normal' | 'hard';
}

export const score: Writable<number> = writable(0);
export const combo: Writable<number> = writable(0);
export const maxCombo: Writable<number> = writable(0);
export const isPaused: Writable<boolean> = writable(true);
export const loadingText: Writable<string> = writable('ゲームをロード中...');
export const instructions: Writable<string> = writable('');
export const resultsVisible: Writable<boolean> = writable(false);
export const results: Writable<Results> = writable({ score: 0, maxCombo: 0, rank: 'C' });
export const mode: Writable<Mode> = writable('cursor');
export const activeBubbles: Writable<Bubble[]> = writable([]);
export const apiReady: Writable<boolean> = writable(false);
export const songInfo: Writable<SongInfo | null> = writable(null);
