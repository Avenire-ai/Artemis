import { parseArgs } from "util";
import { generateVideo } from "./artemis-core";
import type { QualityLevel } from "./types";

// CLI Configuration
interface CLIOptions {
  prompt?: string;
  quality: QualityLevel;
  outputDir: string;
  skipCleanup: boolean;
  interactive: boolean;
  help: boolean;
}

const ROOT_OUTPUT_DIR = "./output";

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
    quality: values.quality as QualityLevel,
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

async function interactiveMode(): Promise<{ prompt: string; quality: QualityLevel }> {
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
  const quality: QualityLevel = (() => {
    switch (qualityChoice) {
      case "2":
        return "medium";
      case "3":
        return "high";
      default:
        return "low";
    }
  })();

  console.log(`\n✓ Prompt: ${prompt}`);
  console.log(`✓ Quality: ${quality}\n`);

  const confirm = await promptUser("Proceed? (y/n) [y]:");
  if (confirm.toLowerCase() === "n") {
    throw new Error("Cancelled by user");
  }

  return { prompt, quality };
}

async function main(): Promise<void> {
  const cli = parseCLI();

  if (cli.help) {
    printHelp();
    process.exit(0);
  }

  let userPrompt: string;
  let quality: QualityLevel = cli.quality;

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

  await generateVideo({
    prompt: userPrompt,
    quality,
    outputDir: cli.outputDir,
    skipCleanup: cli.skipCleanup,
  });
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
