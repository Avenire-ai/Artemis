import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { experimental_generateSpeech as generateSpeech } from "ai";
import type { NarrationMeta, SceneStep } from "./types";

const execAsync = promisify(exec);

async function getAudioDurationSeconds(audioPath: string): Promise<number> {
  const cmd =
    `ffprobe -v error -show_entries format=duration ` +
    `-of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
  const { stdout } = await execAsync(cmd);
  return Math.ceil(parseFloat(stdout.trim()));
}

export async function generateNarrationAudios(
  sceneBreakdown: SceneStep[],
  audioDir: string,
  model: Parameters<typeof generateSpeech>[0]["model"],
  voice: Parameters<typeof generateSpeech>[0]["voice"]
): Promise<NarrationMeta[]> {
  console.log("[TTS] Generating narration per step...");
  const narrationMeta: NarrationMeta[] = [];

  for (const step of sceneBreakdown) {
    const audioPath = path.join(audioDir, `step_${step.step_number}.wav`);

    const response = await generateSpeech({
      model,
      text: step.narration,
      voice,
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

export async function concatenateAudios(
  audioPaths: string[],
  outputPath: string
): Promise<string> {
  const listFile = path.join(path.dirname(outputPath), "audio_list.txt");
  const listContent = audioPaths.map((p) => `file '${path.resolve(p)}'`).join("\n");
  fs.writeFileSync(listFile, listContent);

  const cmd = `ffmpeg -y -f concat -safe 0 -i ${listFile} -c copy ${outputPath}`;
  await execAsync(cmd);

  fs.unlinkSync(listFile);

  return outputPath;
}
