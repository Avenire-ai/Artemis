import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function mergeAudioWithVideo(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  console.log("[FFmpeg] Merging video and audio...");

  const cmd =
    `ffmpeg -y -i "${videoPath}" -i "${audioPath}" ` +
    `-c:v copy -c:a aac -shortest "${outputPath}"`;
  await execAsync(cmd);

  console.log(`[FFmpeg] Final video: ${outputPath}`);
}
