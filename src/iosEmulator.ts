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
        // Ensure each device has the runtime field set
        const devicesWithRuntime = devices.map((device) => ({
          ...device,
          runtime: device.runtime || runtime, // Use device runtime if present, otherwise use the key
        }));
        simulators.push(...devicesWithRuntime);
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

/**
 * Extract device subtype from deviceTypeIdentifier or name
 * Returns the device category (iPhone, iPad, Apple Watch, etc.)
 */
export function getIOSDeviceSubtype(simulator: IOSSimulator): "iPhone" | "iPad" | "Apple Watch" | "Apple Vision" | "Apple TV" | "Other" {
  const identifier = simulator.deviceTypeIdentifier.toLowerCase();
  const name = simulator.name.toLowerCase();

  // Check deviceTypeIdentifier first (more reliable)
  if (identifier.includes('iphone')) {
    return 'iPhone';
  }
  if (identifier.includes('ipad')) {
    return 'iPad';
  }
  if (identifier.includes('watch') || identifier.includes('apple watch')) {
    return 'Apple Watch';
  }
  if (identifier.includes('vision') || identifier.includes('vision pro')) {
    return 'Apple Vision';
  }
  if (identifier.includes('tv') || identifier.includes('appletv')) {
    return 'Apple TV';
  }

  // Fallback to name parsing
  if (name.includes('iphone')) {
    return 'iPhone';
  }
  if (name.includes('ipad')) {
    return 'iPad';
  }
  if (name.includes('watch')) {
    return 'Apple Watch';
  }
  if (name.includes('vision')) {
    return 'Apple Vision';
  }
  if (name.includes('tv')) {
    return 'Apple TV';
  }

  return 'Other';
}

/**
 * Extract iOS version from runtime string
 * Handles formats like:
 * - "iOS 17.0"
 * - "com.apple.CoreSimulator.SimRuntime.iOS-17-0"
 * - "watchOS 10.0"
 * - "com.apple.CoreSimulator.SimRuntime.watchOS-10-0"
 * Returns version string (e.g., "17.0") or undefined if not found
 */
export function extractIOSVersion(runtime: string): string | undefined {
  if (!runtime) {
    return undefined;
  }

  // Try to match formats like "iOS 17.0", "watchOS 10.0", etc.
  const simpleMatch = runtime.match(/(?:iOS|watchOS|tvOS|visionOS)\s+(\d+\.\d+(?:\.\d+)?)/i);
  if (simpleMatch) {
    return simpleMatch[1];
  }

  // Try to match formats like "com.apple.CoreSimulator.SimRuntime.iOS-17-0"
  const identifierMatch = runtime.match(/(?:iOS|watchOS|tvOS|visionOS)-(\d+)-(\d+)/i);
  if (identifierMatch) {
    return `${identifierMatch[1]}.${identifierMatch[2]}`;
  }

  // Try to match any version pattern like "17.0", "16.4.1"
  const versionMatch = runtime.match(/(\d+\.\d+(?:\.\d+)?)/);
  if (versionMatch) {
    return versionMatch[1];
  }

  return undefined;
}

