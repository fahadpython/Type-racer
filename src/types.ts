export interface User {
  id: string;
  name: string;
  color: string;
  progress: number;
  wpm: number;
  accuracy: number;
  finished: boolean;
  place: number | null;
  isBot?: boolean;
  targetWpm?: number;
  errors?: number;
  timeSpent?: number;
  topSpeed?: number;
  worstLetter?: string;
}

export interface Room {
  id: string;
  users: Record<string, User>;
  status: "waiting" | "countdown" | "racing" | "finished";
  phrase: string;
  startTime: number | null;
  finishersCount: number;
  bonusWords: string[];
  isPractice?: boolean;
}
