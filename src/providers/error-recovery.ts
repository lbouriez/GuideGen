/**
 * Error Recovery Handler
 * Handles provider errors and automatic recovery
 */

import type { AnalysisDepth } from '../types';
import { printSuccess, printInfo, stopAllSpinners } from '../utils/display';

export class ErrorRecoveryHandler {
  /**
   * Check if error should trigger provider reconfiguration
   */
  shouldReconfigureProvider(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : '';
    const errorString = JSON.stringify(error);

    // Check for various provider errors that should trigger reconfiguration
    return (
      // Model decommissioned
      errorMessage.startsWith('MODEL_DECOMMISSIONED:') ||
      // Billing/spend limit errors
      errorString.includes('spend_limit_reached') ||
      errorString.includes('spend alert') ||
      // Auth errors
      errorString.includes('invalid_api_key') ||
      errorString.includes('authentication_error') ||
      // Rate limit errors that might indicate billing issues
      (errorString.includes('rate_limit') && errorString.includes('billing'))
    );
  }

  /**
   * Display appropriate error message based on error type
   */
  displayErrorMessage(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : '';
    const errorString = JSON.stringify(error);

    // Stop all spinners before showing interactive prompts
    stopAllSpinners();

    // Determine error type and show appropriate message
    if (errorMessage.startsWith('MODEL_DECOMMISSIONED:')) {
      console.log('\n⚠️  Model decommissioned detected!');
      console.log('The configured model is no longer available.');
    } else if (errorString.includes('spend_limit_reached') || errorString.includes('spend alert')) {
      console.log('\n⚠️  API billing limit reached!');
      console.log('Your current provider has hit a spending limit.');
    } else if (errorString.includes('invalid_api_key') || errorString.includes('authentication_error')) {
      console.log('\n⚠️  Authentication error!');
      console.log('Your API key appears to be invalid or expired.');
    } else {
      console.log('\n⚠️  Provider error detected!');
      console.log('There was an issue with your current AI provider.');
    }

    console.log('Let\'s reconfigure your provider settings...\n');
  }

  /**
   * Display success message after recovery
   */
  displayRecoverySuccess(): void {
    printSuccess('✅ Provider reconfigured successfully!');
    printInfo('Retrying your request with the new provider...\n');
  }

  /**
   * Handle provider error with automatic recovery
   */
  async handleProviderError<T>(
    error: unknown,
    depth: AnalysisDepth,
    reconfigureCallback: (depth: AnalysisDepth) => Promise<void>,
    retryFn: () => Promise<T>
  ): Promise<T> {
    // Display error message
    this.displayErrorMessage(error);

    // Reconfigure provider
    await reconfigureCallback(depth);

    // Display success
    this.displayRecoverySuccess();

    // Retry with new client
    return await retryFn();
  }
}
