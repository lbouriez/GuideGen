/**
 * Analysis Report Generator
 *
 * Generates comprehensive markdown reports from discovery and analysis phases
 */

import type { TechProfile } from '../../types/tech-profile';
import type { PatternReport, CodePattern } from '../../types/patterns';

export interface AnalysisReport {
  content: string;
  fileName: string;
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Generate tech stack section
 */
function generateTechStackSection(techProfile: TechProfile): string {
  const sections: string[] = [];
  const { stack } = techProfile;

  // Languages
  if (stack.languages && stack.languages.length > 0) {
    sections.push(`### Languages

${stack.languages.map((l: string) => `- **${l}**`).join('\n')}`);
  }

  // Frameworks
  if (stack.frameworks && stack.frameworks.length > 0) {
    sections.push(`### Frameworks & Libraries

${stack.frameworks.map((f: string) => `- **${f}**`).join('\n')}`);
  }

  // Build tools
  if (stack.buildTools && stack.buildTools.length > 0) {
    sections.push(`### Build Tools

${stack.buildTools.map((t: string) => `- **${t}**`).join('\n')}`);
  }

  // Testing frameworks
  if (stack.testingFrameworks && stack.testingFrameworks.length > 0) {
    sections.push(`### Testing Frameworks

${stack.testingFrameworks.map((t: string) => `- **${t}**`).join('\n')}`);
  }

  // Package manager
  if (stack.packageManager && stack.packageManager !== 'unknown') {
    sections.push(`### Package Manager

- **${stack.packageManager}**`);
  }

  return sections.join('\n\n');
}

/**
 * Generate patterns section
 */
function generatePatternsSection(patternReport: PatternReport): string {
  const sections: string[] = [];

  // Helper to format pattern list
  const formatPatternList = (patterns: CodePattern[] | undefined, title: string) => {
    if (!patterns || patterns.length === 0) return '';

    const items = patterns.map(p => {
      const fileCount = p.files.length;
      return `#### ${p.name}

${p.description}

**Frequency:** ${p.frequency}
**Found in:** ${fileCount} file${fileCount !== 1 ? 's' : ''}

**Example locations:**
${p.files.slice(0, 3).map(f => `- \`${f}\``).join('\n')}
`;
    });

    return `### ${title}\n\n${items.join('\n')}`;
  };

  // Import patterns
  if (patternReport.importPatterns) {
    const section = formatPatternList(patternReport.importPatterns, 'Import Patterns');
    if (section) sections.push(section);
  }

  // Naming conventions
  if (patternReport.namingConventions) {
    const section = formatPatternList(patternReport.namingConventions, 'Naming Conventions');
    if (section) sections.push(section);
  }

  // Architecture patterns
  if (patternReport.architecturePatterns) {
    const section = formatPatternList(patternReport.architecturePatterns, 'Architecture Patterns');
    if (section) sections.push(section);
  }

  // Backend patterns
  if (patternReport.backend) {
    sections.push('### Backend Patterns\n\n*Backend patterns detected - see full setup for details*');
  }

  // Frontend patterns
  if (patternReport.frontend) {
    sections.push('### Frontend Patterns\n\n*Frontend patterns detected - see full setup for details*');
  }

  if (sections.length === 0) {
    return '*No significant patterns detected.*';
  }

  return sections.join('\n\n');
}

/**
 * Generate project structure section
 */
function generateStructureSection(techProfile: TechProfile): string {
  const sections: string[] = [];
  const { structure } = techProfile;

  if (!structure) {
    return '*No structure information available.*';
  }

  // Folder structure
  if (structure.directories && structure.directories.length > 0) {
    sections.push(`### Directory Structure

Top-level directories:
${structure.directories.slice(0, 20).map((d: string) => `- \`${d}/\``).join('\n')}`);
  }

  // Key files
  if (structure.keyFiles && structure.keyFiles.length > 0) {
    sections.push(`### Key Files

${structure.keyFiles.slice(0, 15).map((f: string) => `- \`${f}\``).join('\n')}`);
  }

  // Config files
  if (structure.configFiles && structure.configFiles.length > 0) {
    sections.push(`### Configuration Files

${structure.configFiles.slice(0, 10).map((f: string) => `- \`${f}\``).join('\n')}`);
  }

  // Monorepo indicator
  if (structure.isMonorepo || techProfile.isMonorepo) {
    sections.push('### Project Type\n\n**Monorepo detected** - Multiple projects in one repository');
  }

  if (sections.length === 0) {
    return '*No structure information available.*';
  }

  return sections.join('\n\n');
}

/**
 * Generate recommendations section
 */
function generateRecommendations(
  techProfile: TechProfile,
  patternReport: PatternReport
): string {
  const recommendations: string[] = [];
  const { stack } = techProfile;

  // Based on frameworks
  if (stack.frameworks) {
    if (stack.frameworks.some((f: string) => f.toLowerCase().includes('react'))) {
      recommendations.push('- **React Component Guidelines** - Document component patterns, hooks usage, and state management');
    }

    if (stack.frameworks.some((f: string) => f.toLowerCase().includes('express'))) {
      recommendations.push('- **Express API Guidelines** - Document routing patterns, middleware, and error handling');
    }

    if (stack.frameworks.some((f: string) => f.toLowerCase().includes('nest'))) {
      recommendations.push('- **NestJS Architecture** - Document module structure, dependency injection, and providers');
    }
  }

  // Based on testing
  if (stack.testingFrameworks && stack.testingFrameworks.length > 0) {
    recommendations.push('- **Testing Best Practices** - Document test organization and patterns');
  }

  // Based on build tools
  if (stack.buildTools) {
    if (stack.buildTools.some((t: string) => t.toLowerCase().includes('typescript'))) {
      recommendations.push('- **TypeScript Configuration** - Document tsconfig patterns and type strategies');
    }
  }

  // Based on patterns
  if (patternReport.backend) {
    recommendations.push('- **Backend Architecture** - Document layer separation and service patterns');
  }

  if (patternReport.frontend) {
    recommendations.push('- **Frontend Guidelines** - Document component architecture and styling patterns');
  }

  if (recommendations.length === 0) {
    return '*Run `npm run setup` to generate guidelines based on detected patterns.*';
  }

  return `The following guidelines would be generated by running \`npm run setup\`:

${recommendations.join('\n')}

**Next Steps:**
1. Run \`npm run setup\` to generate full guidelines
2. Review generated guidelines in \`.guidelines/\`
3. Customize guidelines to match your team's preferences
4. Use \`npm run claude\` to generate Claude Code skills and agents`;
}

/**
 * Generate complete analysis report
 */
export function generateAnalysisReport(
  projectName: string,
  techProfile: TechProfile,
  patternReport: PatternReport
): AnalysisReport {
  const timestamp = new Date().toISOString().split('T')[0];

  const content = `# Code Analysis Report

**Project:** ${projectName}
**Generated:** ${timestamp}

---

## Executive Summary

This report provides a comprehensive analysis of your codebase, including detected technologies, patterns, and recommendations for documentation.

---

## Tech Stack

${generateTechStackSection(techProfile)}

---

## Project Structure

${generateStructureSection(techProfile)}

---

## Detected Patterns

${generatePatternsSection(patternReport)}

---

## Recommendations

${generateRecommendations(techProfile, patternReport)}

---

## About This Report

This analysis was generated by **GuideGen**, an AI-powered tool that analyzes your codebase and generates intelligent project guidelines, Claude Code skills, and enforcement agents.

**Commands:**
- \`npm run analyze\` - Generate this analysis report
- \`npm run setup\` - Generate full guidelines and documentation
- \`npm run claude\` - Generate Claude Code skills and agents

For more information, visit: https://github.com/lbouriez/GuideGen
`;

  return {
    content,
    fileName: 'ANALYSIS.md'
  };
}
