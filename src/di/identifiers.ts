/**
 * DI Container Identifiers
 * Symbols for type-safe dependency injection
 */
export const TYPES = {
  // File Services
  IFileSystem: Symbol.for('IFileSystem'),
  IFileReader: Symbol.for('IFileReader'),
  IFileWriter: Symbol.for('IFileWriter'),
  ITreeGenerator: Symbol.for('ITreeGenerator'),

  // Provider Services
  IProviderManager: Symbol.for('IProviderManager'),
  IProviderClient: Symbol.for('IProviderClient'),
  IProviderConfigManager: Symbol.for('IProviderConfigManager'),
  IProviderClientFactory: Symbol.for('IProviderClientFactory'),
  IErrorRecoveryHandler: Symbol.for('IErrorRecoveryHandler'),
  IRateLimiter: Symbol.for('IRateLimiter'),

  // Phase Executors
  IDiscoveryPhase: Symbol.for('IDiscoveryPhase'),
  IAnalysisPhase: Symbol.for('IAnalysisPhase'),
  IGuidelinesPhase: Symbol.for('IGuidelinesPhase'),
  IIndexesPhase: Symbol.for('IIndexesPhase'),
  IClaudeArtifactsPhase: Symbol.for('IClaudeArtifactsPhase'),

  // Workflows
  ISetupWorkflow: Symbol.for('ISetupWorkflow'),
  IGuidelinesWorkflow: Symbol.for('IGuidelinesWorkflow'),
  IIndexesWorkflow: Symbol.for('IIndexesWorkflow'),
  IClaudeWorkflow: Symbol.for('IClaudeWorkflow'),

  // Utils
  ILogger: Symbol.for('ILogger'),
  IInputValidator: Symbol.for('IInputValidator'),
  IConfigLoader: Symbol.for('IConfigLoader'),
} as const;

export type DIIdentifiers = typeof TYPES;
