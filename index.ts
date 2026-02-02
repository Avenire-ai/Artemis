import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { parseArgs } from "util";
import { google } from "@ai-sdk/google";
import { createElevenLabs } from "@ai-sdk/elevenlabs";
import { generateObject, generateText, tool } from "ai";
import { experimental_generateSpeech as generateSpeech } from "ai";
import { z } from "zod";
import { MANIM_DOCS } from "./manim-knowledge";
import { VIDEO_COMPOSER_PROMPT } from "./video_composer_prompt";

const execAsync = promisify(exec);

// Configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_KEY;
const ROOT_OUTPUT_DIR = "./output";

// AI Models
const elevenlabs = createElevenLabs({ apiKey: ELEVENLABS_API_KEY });
const MODEL_SPEECH = elevenlabs.speech("eleven_v3");
const MODEL_FAST = google("gemini-3-flash-preview");
const MODEL_SMART = google("gemini-3-flash-preview");

// CLI Configuration
interface CLIOptions {
  prompt?: string;
  quality: "low" | "medium" | "high";
  outputDir: string;
  skipCleanup: boolean;
  interactive: boolean;
  help: boolean;
}

function parseCLI(): CLIOptions {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      quality: {
        type: "string",
        short: "q",
        default: "low",
      },
      output: {
        type: "string",
        short: "o",
        default: ROOT_OUTPUT_DIR,
      },
      "skip-cleanup": {
        type: "boolean",
        short: "s",
        default: false,
      },
      interactive: {
        type: "boolean",
        short: "i",
        default: false,
      },
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
    },
    allowPositionals: true,
  });

  return {
    prompt: positionals[0],
    quality: values.quality as "low" | "medium" | "high",
    outputDir: values.output as string,
    skipCleanup: values["skip-cleanup"] as boolean,
    interactive: values.interactive as boolean,
    help: values.help as boolean,
  };
}

function printHelp(): void {
  console.log(`
Manim Video Generator CLI

Usage: bun run index.ts [options] [prompt]

Arguments:
  prompt                    Video description/topic (required if not interactive)

Options:
  -q, --quality <level>     Video quality: low, medium, high (default: low)
  -o, --output <dir>        Output directory (default: ./output)
  -s, --skip-cleanup        Keep intermediate files
  -i, --interactive         Interactive mode with prompts
  -h, --help                Show this help message

Examples:
  bun run index.ts "Explain quantum computing"
  bun run index.ts -q medium "Show a harmonic oscillator"
  bun run index.ts -i
`);
}

async function promptUser(question: string): Promise<string> {
  process.stdout.write(`${question} `);
  for await (const line of console) {
    return line.trim();
  }
  return "";
}

async function interactiveMode(): Promise<{ prompt: string; quality: "low" | "medium" | "high" }> {
  console.log("\n🎬 Manim Video Generator - Interactive Mode\n");
  
  const prompt = await promptUser("Enter video topic/description:");
  if (!prompt) {
    throw new Error("No prompt provided");
  }
  
  console.log("\nQuality options:");
  console.log("  1. low    - Fast rendering, lower quality (default)");
  console.log("  2. medium - Balanced quality and speed");
  console.log("  3. high   - Best quality, slower rendering");
  
  const qualityChoice = await promptUser("\nSelect quality (1-3) [1]:");
  let quality: "low" | "medium" | "high" = "low";
  
  switch (qualityChoice) {
    case "2": quality = "medium"; break;
    case "3": quality = "high"; break;
    default: quality = "low";
  }
  
  console.log(`\n✓ Prompt: ${prompt}`);
  console.log(`✓ Quality: ${quality}\n`);
  
  const confirm = await promptUser("Proceed? (y/n) [y]:");
  if (confirm.toLowerCase() === "n") {
    throw new Error("Cancelled by user");
  }
  
  return { prompt, quality };
}

// Project structure management
class ProjectManager {
  private outputDir: string;
  private projectName: string;
  private timestamp: string;
  private projectPath: string;

  constructor(outputDir: string, projectName: string) {
    this.outputDir = outputDir;
    this.projectName = this.sanitizeName(projectName);
    this.timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.projectPath = path.join(outputDir, `${this.projectName}_${this.timestamp}`);
  }

  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .substring(0, 30);
  }

  get paths() {
    return {
      root: this.projectPath,
      scenes: path.join(this.projectPath, "scenes"),
      audio: path.join(this.projectPath, "audio"),
      video: path.join(this.projectPath, "video"),
      final: path.join(this.projectPath, "final"),
      temp: path.join(this.projectPath, "temp"),
      narration: path.join(this.projectPath, "narration.txt"),
      plan: path.join(this.projectPath, "plan.json"),
    };
  }

  createStructure(): void {
    const dirs = [
      this.paths.root,
      this.paths.scenes,
      this.paths.audio,
      this.paths.video,
      this.paths.final,
      this.paths.temp,
    ];
    
    for (const dir of dirs) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    console.log(`[Project] Created: ${this.paths.root}`);
  }

  cleanup(): void {
    try {
      fs.rmSync(this.paths.temp, { recursive: true, force: true });
      console.log("[Project] Cleaned up temporary files");
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  getManimVideoPath(sceneClass: string): string {
    // Manim outputs to: media/videos/{sceneFileName}/{quality}/{SceneClass}.mp4
    // We need to search for it since the structure depends on the scene file name
    const mediaDir = path.join(process.cwd(), "media", "videos");
    
    if (!fs.existsSync(mediaDir)) {
      return "";
    }
    
    // Search recursively for the video file
    const searchForVideo = (dir: string): string | null => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const found = searchForVideo(fullPath);
          if (found) return found;
        } else if (entry.isFile() && entry.name === `${sceneClass}.mp4`) {
          return fullPath;
        }
      }
      
      return null;
    };
    
    return searchForVideo(mediaDir) || "";
  }

  moveManimFiles(sceneFile: string): void {
    // Move generated files from media/ to our project structure
    const mediaDir = path.join(process.cwd(), "media");
    
    if (fs.existsSync(mediaDir)) {
      try {
        fs.rmSync(mediaDir, { recursive: true, force: true });
        console.log("[Project] Cleaned up manim media directory");
      } catch (e) {
        console.warn("[Project] Could not clean up media directory:", e);
      }
    }
  }
}

// Types
interface SceneStep {
  step_number: number;
  description: string;
  visual_elements: string;
  narration: string;
  duration_estimate?: number;
}

interface VideoPlan {
  title: string;
  educational_goal: string;
  visual_style: string;
  narrative_arc: string;
  scene_breakdown: SceneStep[];
}

interface NarrationMeta {
  step: number;
  narration: string;
  audioPath: string;
  duration: number;
}

// Code Utilities
function extractSceneClassName(code: string): string | null {
  const match = code.match(/class\s+(\w+)\s*\(\s*Scene\s*\)/);
  return match && match[1] ? match[1] : null;
}

function extractSceneFileName(code: string): string | null {
  const className = extractSceneClassName(code);
  if (!className) return null;
  return className.toLowerCase().replace(/[^a-z0-9]/g, "_") + ".py";
}

// Audio Utilities
async function getAudioDurationSeconds(audioPath: string): Promise<number> {
  const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
  const { stdout } = await execAsync(cmd);
  return Math.ceil(parseFloat(stdout.trim()));
}

async function generateNarrationAudios(
  sceneBreakdown: SceneStep[],
  audioDir: string
): Promise<NarrationMeta[]> {
  console.log("[TTS] Generating narration per step...");
  const narrationMeta: NarrationMeta[] = [];

  for (const step of sceneBreakdown) {
    const audioPath = path.join(audioDir, `step_${step.step_number}.wav`);

    const response = await generateSpeech({
      model: MODEL_SPEECH,
      text: step.narration,
      voice: "hpp4J3VqNfWAUOO0d1Us",
    });

    fs.writeFileSync(audioPath, Buffer.from(response.audio.base64, "base64"));

    const duration = await getAudioDurationSeconds(audioPath);

    narrationMeta.push({
      step: step.step_number,
      narration: step.narration,
      audioPath,
      duration,
    });

    console.log(`  ✓ Step ${step.step_number}: ${duration}s narration`);
  }

  return narrationMeta;
}

async function concatenateAudios(audioPaths: string[], outputPath: string): Promise<string> {
  const listFile = path.join(path.dirname(outputPath), "audio_list.txt");
  const listContent = audioPaths.map((p) => `file '${path.resolve(p)}'`).join("\n");
  fs.writeFileSync(listFile, listContent);

  const cmd = `ffmpeg -y -f concat -safe 0 -i ${listFile} -c copy ${outputPath}`;
  await execAsync(cmd);

  // Clean up list file
  fs.unlinkSync(listFile);

  return outputPath;
}

// Video Utilities
async function mergeAudioWithVideo(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  console.log("[FFmpeg] Merging video and audio...");
  
  const cmd = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${outputPath}"`;
  await execAsync(cmd);

  console.log(`[FFmpeg] Final video: ${outputPath}`);
}

// Plan Generation
async function analyzeAndPlan(userPrompt: string): Promise<VideoPlan> {
  console.log(`\n[Architect] Analyzing: "${userPrompt}"`);

  const { object: plan } = await generateObject({
    model: MODEL_FAST,
    schema: z.object({
      title: z.string(),
      educational_goal: z.string(),
      visual_style: z.string(),
      narrative_arc: z.string(),
      scene_breakdown: z.array(
        z.object({
          step_number: z.number(),
          description: z.string(),
          visual_elements: z.string(),
          narration: z.string(),
          duration_estimate: z.number().optional(),
        })
      ),
    }),
    system: VIDEO_COMPOSER_PROMPT,
    prompt: `Create a structured video plan for this topic: "${userPrompt}"

Return a JSON object with:
- title: The video title
- educational_goal: What the viewer will understand
- visual_style: Overall visual approach
- narrative_arc: The story structure (e.g., "Mystery → Resolution")
- scene_breakdown: Array of scenes, each with step_number, description, visual_elements, narration script, and optional duration_estimate`,
  });

  console.log(`[Architect] Plan: ${plan.title}`);
  console.log(`[Architect] Scenes: ${plan.scene_breakdown.length}`);
  return plan;
}

// Code Generation
interface CompilationResult {
  success: boolean;
  sceneFile?: string;
  sceneClass?: string;
  error?: string;
}

async function compileManimCode(
  code: string,
  quality: "low" | "medium" | "high",
  projectManager: ProjectManager
): Promise<CompilationResult> {
  const sceneClass = extractSceneClassName(code);
  if (!sceneClass) {
    return {
      success: false,
      error: "Could not find Scene class in generated code",
    };
  }

  const sceneFileName = extractSceneFileName(code) || "scene.py";
  const sceneFile = path.join(projectManager.paths.scenes, sceneFileName);

  fs.writeFileSync(sceneFile, code);
  console.log(`[Compiler] Scene written to: ${sceneFile}`);

  let qFlag: string;
  switch (quality) {
    case "high": qFlag = "-qh"; break;
    case "medium": qFlag = "-qm"; break;
    default: qFlag = "-ql";
  }

  const cmd = `manim ${qFlag} ${sceneFile} ${sceneClass}`;
  console.log(`[Compiler] Running: ${cmd}`);

  try {
    await execAsync(cmd);
    console.log("[Compiler] ✓ Compilation successful");
    return {
      success: true,
      sceneFile: sceneFileName,
      sceneClass,
    };
  } catch (err: any) {
    return {
      success: false,
      sceneFile: sceneFileName,
      sceneClass,
      error: (err.stdout + err.stderr).slice(-3000),
    };
  }
}

async function generateAndRefineCode(
  plan: VideoPlan,
  narrationMeta: NarrationMeta[],
  quality: "low" | "medium" | "high",
  projectManager: ProjectManager
): Promise<CompilationResult> {
  console.log("\n[Engineer] Generating Manim code...");

  const timingInfo = narrationMeta.map((n) => ({
    step: n.step,
    wait_seconds: n.duration,
  }));

  const baseSystemPrompt = `
You are an expert Manim Developer and visual educator.

=== KNOWLEDGE BASE ===
${MANIM_DOCS}
=====================

TASK:
Write a Manim script for this plan:
${JSON.stringify(plan, null, 2)}

=== NARRATION TIMING (MANDATORY) ===
Each step MUST wait for its narration to complete:
self.wait(<seconds>)

Timing data:
${JSON.stringify(timingInfo, null, 2)}

RULES:
- One idea at a time
- Visuals must NEVER outrun narration
- Prefer Transform over recreating
- Use VGroup + arrange
- Calm pacing
- Define a descriptive class name that reflects the video content
`;

  const MAX_RETRIES = 3;
  let lastError: string | undefined;
  let previousCode: string | undefined;
  let compilationResult: CompilationResult = { success: false };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`\n[Engineer] Attempt ${attempt}/${MAX_RETRIES}...`);

    // Build prompt based on attempt number
    let prompt: string;
    if (attempt === 1) {
      prompt = "Generate initial Manim code. Make sure to define a descriptive Scene class name.";
    } else {
      prompt = `The previous code failed to compile with the following error:\n\n${lastError}\n\nPREVIOUS CODE:\n\`\`\`python\n${previousCode}\n\`\`\`\n\nPlease fix the error and regenerate the complete corrected code. Focus on fixing the specific compilation error shown above.`;
    }

    // Generate code with AI
    const { text: generatedCode } = await generateText({
      model: MODEL_SMART,
      system: baseSystemPrompt,
      prompt: prompt,
    });

    // Extract code from response (it might be wrapped in markdown)
    const codeMatch = generatedCode.match(/\`\`\`python\n([\s\S]*?)\n\`\`\`/) || 
                      generatedCode.match(/\`\`\`\n([\s\S]*?)\n\`\`\`/) ||
                      [null, generatedCode];
    const code = codeMatch[1] || generatedCode;
    previousCode = code;

    // Validate Python syntax first (Option B - in-memory validation)
    try {
      // Quick check: does it contain a Scene class?
      if (!code.includes("class") || !code.includes("Scene")) {
        lastError = "Generated code does not contain a valid Scene class definition";
        console.log(`  ✗ Attempt ${attempt} failed: No Scene class found`);
        continue;
      }

      // Try to compile
      compilationResult = await compileManimCode(code, quality, projectManager);
      
      if (compilationResult.success) {
        console.log(`  ✓ Attempt ${attempt} succeeded!`);
        return compilationResult;
      } else {
        lastError = compilationResult.error || "Unknown compilation error";
        const errMsg = lastError;
        console.log(`  ✗ Attempt ${attempt} failed: ${errMsg.substring(0, 100)}...`);
      }
    } catch (err: any) {
      lastError = err.message || String(err);
      const errorMsg = lastError || "Unknown error";
      console.log(`  ✗ Attempt ${attempt} failed with exception: ${errorMsg.substring(0, 100)}...`);
    }
  }

  // All retries exhausted
  throw new Error(
    `Code compilation failed after ${MAX_RETRIES} attempts.\n\n` +
    `Final error: ${lastError || "Unknown error"}\n\n` +
    `Last generated code:\n${previousCode?.substring(0, 500)}...`
  );
}

// Main Orchestrator
async function runWorkflow(userPrompt: string, quality: "low" | "medium" | "high", options: CLIOptions): Promise<void> {
  console.log("\n🎬 Starting Video Generation\n");
  console.log(`Topic: ${userPrompt}`);
  console.log(`Quality: ${quality}\n`);

  // Create project structure
  const plan = await analyzeAndPlan(userPrompt);
  const projectManager = new ProjectManager(options.outputDir, plan.title);
  projectManager.createStructure();

  // Save plan
  fs.writeFileSync(projectManager.paths.plan, JSON.stringify(plan, null, 2));
  console.log("[Project] Plan saved");

  try {
    // Generate narration
    const narrationMeta = await generateNarrationAudios(plan.scene_breakdown, projectManager.paths.audio);

    // Save narration text
    const narrationText = narrationMeta
      .map((n) => `Step ${n.step} (${n.duration}s):\n${n.narration}\n`)
      .join("\n---\n\n");
    fs.writeFileSync(projectManager.paths.narration, narrationText);
    console.log("[Project] Narration saved");

    // Generate code
    const compilationResult = await generateAndRefineCode(plan, narrationMeta, quality, projectManager);

    // Concatenate audio
    const fullAudioPath = path.join(projectManager.paths.audio, "narration_full.wav");
    await concatenateAudios(
      narrationMeta.map((n) => n.audioPath),
      fullAudioPath
    );

    // Find and move video
    console.log("[Project] Locating generated video...");
    const videoPath = projectManager.getManimVideoPath(compilationResult.sceneClass!);
    
    if (!videoPath) {
      throw new Error(`Video file not found for scene: ${compilationResult.sceneClass}`);
    }
    
    console.log(`[Project] Found video: ${videoPath}`);

    // Move video to project directory
    const videoDest = path.join(projectManager.paths.video, "video.mp4");
    fs.copyFileSync(videoPath, videoDest);
    console.log(`[Project] Video copied to: ${videoDest}`);

    // Merge audio and video
    const finalPath = path.join(projectManager.paths.final, `${projectManager.paths.root.split("/").pop()}.mp4`);
    await mergeAudioWithVideo(videoDest, fullAudioPath, finalPath);

    // Cleanup
    if (!options.skipCleanup) {
      projectManager.cleanup();
    }

    console.log("\n✅ Video generation complete!");
    console.log(`📁 Project: ${projectManager.paths.root}`);
    console.log(`🎬 Final video: ${finalPath}`);
    
  } catch (e) {
    console.error("\n❌ Workflow failed:", e);
    throw e;
  }
}

async function main(): Promise<void> {
  const cli = parseCLI();

  if (cli.help) {
    printHelp();
    process.exit(0);
  }

  let userPrompt: string;
  let quality: "low" | "medium" | "high" = cli.quality;

  if (cli.interactive) {
    const result = await interactiveMode();
    userPrompt = result.prompt;
    quality = result.quality;
  } else {
    userPrompt = cli.prompt || "";
    if (!userPrompt) {
      printHelp();
      console.error("\nError: No prompt provided. Use --interactive or provide a prompt argument.");
      process.exit(1);
    }
  }

  await runWorkflow(userPrompt, quality, cli);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
