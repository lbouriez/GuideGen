/**
 * Interactive Setup Wizard
 * Handles user interaction for provider configuration
 */

import inquirer from 'inquirer';
import type { ProviderConfig } from './types';
import { ProviderType, DEFAULT_MODELS } from './types';
import { printInfo, printSuccess, stopAllSpinners } from '../utils/display';

export class InteractiveSetup {
  /**
   * Ask if user wants to use existing configuration
   */
  async promptUseExistingConfig(config: ProviderConfig): Promise<boolean> {
    const providerName = config.provider === ProviderType.ANTHROPIC ? 'Anthropic Claude' : 'Groq';

    stopAllSpinners();
    const { useExisting } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useExisting',
        message: `Found existing ${providerName} configuration. Use it?`,
        default: true,
      },
    ]);

    return useExisting;
  }

  /**
   * Run full setup wizard
   */
  async runSetupWizard(currentConfig?: ProviderConfig | null): Promise<ProviderConfig> {
    printInfo('\n🤖 AI Provider Setup');
    printInfo('==================\n');

    // Provider selection
    const { provider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Which AI provider would you like to use?',
        choices: [
          { name: 'Anthropic Claude (Recommended)', value: ProviderType.ANTHROPIC },
          { name: 'Groq (Fast & Cost-effective)', value: ProviderType.GROQ },
        ],
        default: currentConfig?.provider || ProviderType.ANTHROPIC,
      },
    ]);

    // Get API key
    const apiKey = await this.promptForApiKey(provider, currentConfig);

    // Get model selection
    const models = await this.promptForModels(provider, currentConfig);

    return {
      provider,
      apiKey,
      models,
    };
  }

  /**
   * Prompt for API key
   */
  private async promptForApiKey(
    provider: ProviderType,
    currentConfig?: ProviderConfig | null
  ): Promise<string> {
    const providerName = provider === ProviderType.ANTHROPIC ? 'Anthropic' : 'Groq';
    const providerChanged = currentConfig && currentConfig.provider !== provider;
    const hasExistingKey = currentConfig?.apiKey && !providerChanged;

    if (hasExistingKey) {
      // Offer to keep existing API key
      const { keepExisting } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'keepExisting',
          message: `Keep existing ${providerName} API key?`,
          default: true,
        },
      ]);

      if (keepExisting) {
        printSuccess('Using existing API key');
        return currentConfig.apiKey;
      }
    }

    // Prompt for new API key
    const apiKeyPrompt = provider === ProviderType.ANTHROPIC
      ? 'Get your API key from: https://console.anthropic.com/'
      : 'Get your API key from: https://console.groq.com/';

    printInfo(`\n🔑 ${providerName} API Key Setup`);
    printInfo(apiKeyPrompt);

    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: `Enter your ${providerName} API key:`,
        validate: (input: string) => this.validateApiKey(input, provider),
      },
    ]);

    return apiKey;
  }

  /**
   * Validate API key format
   */
  private validateApiKey(input: string, provider: ProviderType): string | boolean {
    if (!input.trim()) {
      return 'API key is required';
    }
    if (provider === ProviderType.ANTHROPIC && !input.startsWith('sk-ant-')) {
      return 'Invalid Anthropic API key format. Should start with "sk-ant-"';
    }
    if (provider === ProviderType.GROQ && !input.startsWith('gsk_')) {
      return 'Invalid Groq API key format. Should start with "gsk_"';
    }
    return true;
  }

  /**
   * Prompt for model selection
   */
  private async promptForModels(
    provider: ProviderType,
    currentConfig?: ProviderConfig | null
  ): Promise<{ quick: string; standard: string; thorough: string }> {
    printInfo(`\n🧠 Model Selection`);
    printInfo('Choose your preferred models for different analysis depths:');

    const defaultModels = DEFAULT_MODELS[provider];
    const modelChoices = this.getModelChoices(provider);

    const { quickModel, standardModel, thoroughModel } = await inquirer.prompt([
      {
        type: 'list',
        name: 'quickModel',
        message: 'Quick analysis model (fast, for basic detection):',
        choices: modelChoices.quick,
        default: currentConfig?.models?.quick || defaultModels.quick,
      },
      {
        type: 'list',
        name: 'standardModel',
        message: 'Standard analysis model (balanced, for detailed analysis):',
        choices: modelChoices.standard,
        default: currentConfig?.models?.standard || defaultModels.standard,
      },
      {
        type: 'list',
        name: 'thoroughModel',
        message: 'Thorough analysis model (slow, for comprehensive analysis):',
        choices: modelChoices.thorough,
        default: currentConfig?.models?.thorough || defaultModels.thorough,
      },
    ]);

    return {
      quick: quickModel,
      standard: standardModel,
      thorough: thoroughModel,
    };
  }

  /**
   * Get available model choices for a provider
   */
  private getModelChoices(provider: ProviderType) {
    if (provider === ProviderType.ANTHROPIC) {
      return {
        quick: [
          { name: 'Claude 3.5 Haiku (Fast, cost-effective)', value: 'claude-3-5-haiku-latest' },
          { name: 'Claude 3.5 Sonnet (Balanced)', value: 'claude-3-5-sonnet-latest' },
        ],
        standard: [
          { name: 'Claude 3.5 Sonnet (Recommended)', value: 'claude-3-5-sonnet-latest' },
          { name: 'Claude 3 Opus (Most capable)', value: 'claude-3-opus-latest' },
        ],
        thorough: [
          { name: 'Claude 3.5 Sonnet (Recommended)', value: 'claude-3-5-sonnet-latest' },
          { name: 'Claude 3 Opus (Most thorough)', value: 'claude-3-opus-latest' },
        ],
      };
    } else {
      return {
        quick: [
          { name: 'Llama 3.1 8B Instant (Fastest)', value: 'llama-3.1-8b-instant' },
          { name: 'Llama 3.3 70B Versatile (Balanced)', value: 'llama-3.3-70b-versatile' },
        ],
        standard: [
          { name: 'Llama 3.3 70B Versatile (Recommended)', value: 'llama-3.3-70b-versatile' },
          { name: 'GPT-OSS 20B (Fast reasoning)', value: 'openai/gpt-oss-20b' },
        ],
        thorough: [
          { name: 'GPT-OSS 120B (Most capable)', value: 'openai/gpt-oss-120b' },
          { name: 'Llama 3.3 70B Versatile (Balanced)', value: 'llama-3.3-70b-versatile' },
        ],
      };
    }
  }
}
