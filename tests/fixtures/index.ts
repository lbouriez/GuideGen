/**
 * Test fixtures for Claude Bootstrap integration tests
 */

export const mockProjects = {
  simpleReact: {
    'package.json': JSON.stringify({
      name: 'simple-react-app',
      version: '1.0.0',
      dependencies: {
        'react': '^18.0.0',
        'react-dom': '^18.0.0',
      },
      scripts: {
        build: 'vite build',
        dev: 'vite dev',
      },
    }),
    'src/App.tsx': `
import React from 'react';

function App() {
  const [count, setCount] = React.useState(0);

  return (
    <div>
      <h1>Hello World</h1>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  );
}

export default App;
`,
    'src/main.tsx': `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
  },

  backendWithFrontend: {
    'backend/package.json': JSON.stringify({
      name: 'backend-api',
      version: '1.0.0',
      dependencies: {
        'express': '^4.18.0',
        'prisma': '^5.0.0',
      },
      scripts: {
        dev: 'nodemon src/server.ts',
        build: 'tsc',
      },
    }),
    'backend/src/server.ts': `
import express from 'express';

const app = express();
const PORT = 3000;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`,
    'frontend/package.json': JSON.stringify({
      name: 'frontend-app',
      version: '1.0.0',
      dependencies: {
        'react': '^18.0.0',
        'react-dom': '^18.0.0',
        'expo': '~50.0.0',
      },
    }),
    'frontend/App.tsx': `
import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View>
      <Text>Mobile App</Text>
    </View>
  );
}
`,
  },
};

export const mockAIResponses = {
  techProfile: {
    stack: {
      languages: ['typescript', 'javascript'],
      frameworks: ['react', 'express'],
      buildTools: ['vite', 'tsc'],
      testingFrameworks: ['vitest'],
      linters: ['eslint'],
      packageManager: 'npm',
    },
    structure: {
      root: '/test/project',
      directories: ['src', 'tests'],
      keyFiles: ['package.json', 'src/App.tsx'],
      configFiles: ['package.json', 'tsconfig.json'],
    },
    isMonorepo: true,
    projects: [
      {
        name: 'frontend',
        path: 'frontend',
        type: 'frontend',
        stack: { frameworks: ['react'] },
      },
      {
        name: 'backend',
        path: 'backend',
        type: 'backend',
        stack: { frameworks: ['express'] },
      },
    ],
  },

  patternReport: {
    importPatterns: [
      {
        name: 'React Imports',
        description: 'Standard React import pattern',
        examples: ["import React from 'react'"],
        files: ['src/App.tsx'],
        frequency: 'always',
      },
    ],
    namingConventions: [
      {
        name: 'PascalCase Components',
        description: 'React components use PascalCase',
        examples: ['App.tsx', 'UserProfile.tsx'],
        files: ['src/'],
        frequency: 'always',
      },
    ],
    architecturePatterns: [
      {
        name: 'Component Architecture',
        description: 'Standard React component structure',
        examples: ['Functional components with hooks'],
        files: ['src/'],
        frequency: 'always',
      },
    ],
    stateManagement: [
      {
        name: 'React useState',
        description: 'Local state management with useState',
        examples: ['const [count, setCount] = useState(0)'],
        files: ['src/App.tsx'],
        frequency: 'common',
      },
    ],
    errorHandling: [
      {
        name: 'Try-catch blocks',
        description: 'Standard error handling pattern',
        examples: ['try { ... } catch (error) { ... }'],
        files: [],
        frequency: 'occasional',
      },
    ],
    loggingPatterns: [
      {
        name: 'Console logging',
        description: 'Using console.log for debugging',
        examples: ["console.log('Server running')"],
        files: ['src/server.ts'],
        frequency: 'common',
      },
    ],
  },

  rulesReport: {
    rules: [
      {
        category: 'critical',
        title: 'Never use console.log',
        description: 'Use proper logging instead of console.log',
        examples: {
          bad: ["console.log('debug info')"],
          good: ["logger.info('debug info')"],
        },
        enforceability: 'high',
      },
      {
        category: 'important',
        title: 'Use PascalCase for React components',
        description: 'React component files should use PascalCase',
        examples: {
          bad: ['userProfile.tsx'],
          good: ['UserProfile.tsx'],
        },
        enforceability: 'high',
      },
    ],
    workflows: [
      {
        name: 'Add New Component',
        description: 'Steps to add a new React component',
        steps: [
          'Create component file with PascalCase name',
          'Implement component with proper TypeScript types',
          'Add component to routing or parent component',
          'Test component functionality',
        ],
      },
    ],
  },
};

export const mockPromptResponses = {
  providerSelection: { provider: 'anthropic' },
  keepApiKey: { keepExisting: true },
  modelSelection: {
    quickModel: 'claude-3-5-haiku-latest',
    standardModel: 'claude-3-5-sonnet-latest',
    thoroughModel: 'claude-3-5-sonnet-latest',
  },
  projectExclusions: { selectedExclusions: [] },
  actionSelection: { action: 'all' },
};