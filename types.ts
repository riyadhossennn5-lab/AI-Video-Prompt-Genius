
export interface Character {
  id: string;
  name: string;
  age: string;
  gender: string;
  skinTone: string;
  eyeDetails: string;
  hairDetails: string;
  facialFeatures: string;
  bodyType: string;
  clothing: string;
  handFootwearDetails: string;
  specialFeatures: string;
}

export interface CharacterEmotion {
  characterName: string;
  emotion: string;
}

export interface VideoSegment {
  startTime: string;
  endTime: string;
  charactersInScene: string[];
  characterEmotions: CharacterEmotion[];
  sceneDescription: string;
  cameraAndMotion: string;
  action: string;
  emotion: string;
  emotionalIntensity: number;
  transitionBridge: string;
  generatedPrompt: string;
}

export interface AnalysisResult {
  globalSummary: string;
  emotionalArc: string;
  characterMemory: Character[];
  segments: VideoSegment[];
  fullVideoSummaryPrompt: string;
}

export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'completed' | 'error';

export interface AppState {
  status: AnalysisStatus;
  progress: number;
  result: AnalysisResult | null;
  error: string | null;
}
