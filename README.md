# Artemis - AI-Powered Animation Generator

An Artemis-powered AI service that creates Manim animations using Google's Gemini models and ElevenLabs audio generation. Built for deep understanding through visual learning.

## Artemis Overview

This Artemis tool combines multiple AI services to generate complete animated videos with:
- **Visual animations** using Manim (Mathematical Animation Engine)
- **Audio narration** using ElevenLabs text-to-speech
- **Intelligent planning** using Google's Gemini AI models
- **Knowledge integration** with Context7 API for documentation
- **Feynman-inspired explanations** breaking complex ideas into intuitive visuals

## Architecture

The codebase is organized into distinct classes for better maintainability:

### Core Components

1. **KnowledgeBase** - Handles documentation lookup (local filesystem or Context7 API)
2. **Architect** - Plans animation structure using AI
3. **Engineer** - Implements and compiles the animation
4. **ManimAgent** - Orchestrates the entire workflow

### Key Features

- **Modular Design**: Each component has a single responsibility
- **Type Safety**: Full TypeScript interfaces and schemas with Zod validation
- **Audio Integration**: ElevenLabs TTS for narration generation
- **Context7 Ready**: Prepared for Context7 API integration
- **Error Handling**: Comprehensive error management
- **Bun Optimized**: Uses Bun.file for efficient file operations

## Prerequisites

- Node.js and Bun runtime
- Python with Manim installed
- Google AI API key
- ElevenLabs API key (for audio generation)

## Artemis Installation

```bash
# Install Node.js dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys:
# - GOOGLE_API_KEY=your_google_api_key
# - ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Install Python dependencies if not already done
pip install manim
```

## Artemis Usage

```bash
# Run with default prompt
bun run index.ts

# Run with custom prompt
bun run index.ts "Create a 3D rotating cube with gradient colors"

# Use Context7 API for documentation (when available)
bun run index.ts "Create animated text" --context7
```

## Artemis Output

The Artemis workspace generates:
- Manim Python animation code with Feynman-inspired explanations
- Compiled video files in `output/` directory
- Audio narration files (if audio generation is enabled)
- Complete animated video with integrated audio
- Knowledge assets ready for your Avenire Drive

## Artemis Configuration

Edit the `CONFIG` object in `index.ts` to customize:
- Repository paths
- Model selection (planner and coder models)
- File names and output directories
- Audio generation settings

## Dependencies

### Node.js
- `@ai-sdk/google` - Google Gemini AI integration
- `@ai-sdk/elevenlabs` - ElevenLabs TTS integration
- `@upstash/context7-tools-ai-sdk` - Context7 API tools
- `ai` - Vercel AI SDK
- `zod` - Schema validation

### Python
- `manim` - Mathematical animation engine

## Context7 Integration

The code is prepared to use Context7 API for Manim documentation instead of local filesystem. When Context7 is available, implement the `context7Lookup` and `context7Explore` methods in the KnowledgeBase class.

## AI Models

- **Planner**: Uses fast model for structure planning
- **Coder**: Uses smart model for implementation

Both currently use `gemini-3-flash` but can be configured independently in the configuration.
