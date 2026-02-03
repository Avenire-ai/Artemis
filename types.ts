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
