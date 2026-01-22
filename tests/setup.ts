/**
 * Test setup for Claude Bootstrap integration tests
 */

import { beforeAll, vi } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';

// Mock file system
const volume = new Volume();
const fs = createFsFromVolume(volume);

// Mock the file system operations
vi.mock('fs', () => ({
  existsSync: fs.existsSync.bind(fs),
  readFileSync: fs.readFileSync.bind(fs),
  writeFileSync: fs.writeFileSync.bind(fs),
  mkdirSync: fs.mkdirSync.bind(fs),
  readdirSync: fs.readdirSync.bind(fs),
  statSync: fs.statSync.bind(fs),
}));

// Also mock fs/promises for any async operations
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// Mock ora spinner
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    text: '',
  })),
}));

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"success": true}' }],
      }),
    };
  },
}));

// Mock Groq SDK
vi.mock('groq-sdk', () => ({
  default: class MockGroq {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: { content: '{"success": true}' },
          }],
        }),
      },
    };
  },
}));

// Mock glob
vi.mock('glob', () => ({
  default: vi.fn(),
}));

// Mock chalk for consistent output
vi.mock('chalk', () => ({
  default: {
    green: (text: string) => `[GREEN]${text}[/GREEN]`,
    red: (text: string) => `[RED]${text}[/RED]`,
    yellow: (text: string) => `[YELLOW]${text}[/YELLOW]`,
    blue: (text: string) => `[BLUE]${text}[/BLUE]`,
    gray: (text: string) => `[GRAY]${text}[/GRAY]`,
    bold: (text: string) => `[BOLD]${text}[/BOLD]`,
    dim: (text: string) => `[DIM]${text}[/DIM]`,
  },
}));

// Global test utilities
global.testUtils = {
  createMockProject: (structure: Record<string, string>) => {
    Object.entries(structure).forEach(([path, content]) => {
      const dir = path.split('/').slice(0, -1).join('/');
      if (dir) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(path, content);
    });
  },

  mockAIResponse: (response: any) => {
    // Mock both Anthropic and Groq responses
    const mockAnthropic = vi.mocked(require('@anthropic-ai/sdk').default);
    const mockGroq = vi.mocked(require('groq-sdk').default);

    mockAnthropic.prototype.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(response) }],
    });

    mockGroq.prototype.chat.completions.create.mockResolvedValue({
      choices: [{
        message: { content: JSON.stringify(response) },
      }],
    });
  },

  mockPrompts: (responses: any[]) => {
    const mockInquirer = vi.mocked(require('inquirer').default);
    let responseIndex = 0;
    mockInquirer.prompt.mockImplementation(() => Promise.resolve(responses[responseIndex++]));
  },

  resetMocks: () => {
    vi.clearAllMocks();
    volume.reset();
  },
};