/**
 * iOS Simulator management module
 */

import { executeCommand, validateUDID } from './cli';
import { IOSSimulator, IOSSimulatorListResponse } from './types';
import { checkXcodeAvailable } from './platform';
import * as vscode from 'vscode';

/**
 * Parse iOS simulator list JSON response
 */
function parseIOSSimulatorList(jsonString: string): IOSSimulator[] {
  try {
    const data: IOSSimulatorListResponse = JSON.parse(jsonString);
    const simulators: IOSSimulator[] = [];

    // Iterate through all runtimes and collect devices
    for (const runtime in data.devices) {
      const devices = data.devices[runtime];
      if (Array.isArray(devices)) {
        simulators.push(...devices);
      }
    }

    return simulators;
  } catch (error) {
    throw new Error(`Failed to parse iOS simulator list: ${error}`);
  }
}

/**
 * Get list of available iOS simulators
 */
export async function listIOSSimulators(): Promise<IOSSimulator[]> {
  const isAvailable = await checkXcodeAvailable();
  if (!isAvailable) {
    throw new Error('Xcode command line tools are not available');
  }

  const result = await executeCommand('xcrun', ['simctl', 'list', '--json', 'devices']);

  if (!result.success) {
    throw new Error(`Failed to list iOS simulators: ${result.stderr || result.error?.message}`);
  }

  try {
    return parseIOSSimulatorList(result.stdout);
  } catch (error) {
    throw new Error(`Failed to parse simulator list: ${error}`);
  }
}

/**
 * Boot an iOS simulator
 * @param udid - Simulator UDID
 */
export async function bootIOSSimulator(udid: string): Promise<void> {
  if (!validateUDID(udid)) {
    throw new Error(`Invalid UDID format: ${udid}`);
  }

  const isAvailable = await checkXcodeAvailable();
  if (!isAvailable) {
    throw new Error('Xcode command line tools are not available');
  }

  const result = await executeCommand('xcrun', ['simctl', 'boot', udid]);

  if (!result.success) {
    // Check if simulator is already booted
    if (result.stderr.includes('already booted')) {
      return;
    }
    throw new Error(`Failed to boot simulator: ${result.stderr || result.error?.message}`);
  }

  // Open Simulator app
  try {
    await executeCommand('open', ['-a', 'Simulator']);
  } catch {
    // Non-critical error - simulator might already be open
    // Silently fail
  }
}

/**
 * Check if a simulator is currently booted
 */
export function isSimulatorBooted(simulator: IOSSimulator): boolean {
  return simulator.state === 'Booted';
}

/**
 * Get running iOS simulators
 */
export async function getRunningIOSSimulators(): Promise<IOSSimulator[]> {
  const simulators = await listIOSSimulators();
  return simulators.filter(isSimulatorBooted);
}

