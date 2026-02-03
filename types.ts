export type QualityLevel = "low" | "medium" | "high";

export interface SceneStep {
  step_number: number;
  description: string;
  visual_elements: string;
  narration: string;
  duration_estimate?: number;
}

export interface VideoPlan {
  title: string;
  educational_goal: string;
  visual_style: string;
  narrative_arc: string;
  scene_breakdown: SceneStep[];
}

export interface NarrationMeta {
  step: number;
  narration: string;
  audioPath: string;
  duration: number;
}

export interface CompilationResult {
  success: boolean;
  sceneFile?: string;
  sceneClass?: string;
  error?: string;
}

export interface VideoGenerationInput {
  prompt: string;
  quality?: QualityLevel;
  outputDir?: string;
  skipCleanup?: boolean;
  voiceId?: string;
  postRun?: string;
}

export interface VideoGenerationResult {
  plan: VideoPlan;
  summary: string;
  projectDir: string;
  finalVideoPath: string;
  narrationPath: string;
  postRunMessage: string;
}
