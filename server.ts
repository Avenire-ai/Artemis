import { randomUUID } from "crypto";
import { generateVideo } from "./artemis-core";
import type { VideoGenerationInput, VideoGenerationResult } from "./types";

const PORT = Number(process.env.PORT || 3000);

interface JobRecord {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  input: VideoGenerationInput;
  result?: VideoGenerationResult;
  error?: string;
}

const jobs = new Map<string, JobRecord>();
const queue: string[] = [];
let isWorking = false;

function now(): string {
  return new Date().toISOString();
}

function enqueue(jobId: string): void {
  queue.push(jobId);
  void processQueue();
}

async function processQueue(): Promise<void> {
  if (isWorking) return;
  const nextId = queue.shift();
  if (!nextId) return;

  const job = jobs.get(nextId);
  if (!job) return;

  isWorking = true;
  job.status = "running";
  job.startedAt = now();

  try {
    const result = await generateVideo(job.input);
    job.status = "completed";
    job.result = result;
  } catch (err: any) {
    job.status = "failed";
    job.error = err?.message || String(err);
  } finally {
    job.finishedAt = now();
    isWorking = false;
    void processQueue();
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function parseBody(req: Request): Promise<unknown> {
  return req.json();
}

function validateInput(body: any): VideoGenerationInput {
  if (!body || typeof body.prompt !== "string" || body.prompt.trim().length === 0) {
    throw new Error("Invalid input: prompt is required");
  }

  return {
    prompt: body.prompt,
    quality: body.quality,
    outputDir: body.outputDir,
    skipCleanup: body.skipCleanup,
    voiceId: body.voiceId,
    postRun: body.postRun,
  };
}

const server = Bun.serve({
  port: PORT,
  fetch: async (req) => {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, time: now() });
    }

    if (req.method === "POST" && url.pathname === "/jobs") {
      try {
        const body = await parseBody(req);
        const input = validateInput(body);
        const jobId = randomUUID();

        const record: JobRecord = {
          id: jobId,
          status: "queued",
          createdAt: now(),
          input,
        };

        jobs.set(jobId, record);
        enqueue(jobId);

        return json({ jobId });
      } catch (err: any) {
        return json({ error: err?.message || String(err) }, 400);
      }
    }

    if (req.method === "GET" && url.pathname.startsWith("/jobs/")) {
      const jobId = url.pathname.replace("/jobs/", "");
      const job = jobs.get(jobId);
      if (!job) {
        return json({ error: "Job not found" }, 404);
      }
      return json(job);
    }

    return json({ error: "Not found" }, 404);
  },
});

console.log(`[Server] Listening on http://0.0.0.0:${server.port}`);
