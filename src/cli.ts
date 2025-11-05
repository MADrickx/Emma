/**
 * Secure CLI command execution module
 */

import { execFile, ExecFileOptions } from "child_process";
import { promisify } from "util";
import { CLICommandResult } from "./types";

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Execute a CLI command securely using execFile
 * @param command - Command to execute
 * @param args - Command arguments
 * @param options - Execution options
 * @returns Promise with command result
 */
export async function executeCommand(
  command: string,
  args: string[] = [],
  options: ExecFileOptions = {}
): Promise<CLICommandResult> {
  const timeout = options.timeout || DEFAULT_TIMEOUT;

  try {
    const result = await Promise.race([
      execFileAsync(command, args, {
        ...options,
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Command timeout")), timeout)
      ),
    ]);

    return {
      success: true,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    };
  } catch (error) {
    const err = error as { stdout?: Buffer; stderr?: Buffer; code?: number };
    return {
      success: false,
      stdout: err.stdout?.toString() || "",
      stderr: err.stderr?.toString() || "",
      error: error as Error,
    };
  }
}

/**
 * Validate command input to prevent injection attacks
 */
export function validateCommandInput(input: string): boolean {
  // Basic validation - no shell metacharacters
  const dangerousChars = /[;&|`$(){}[\]<>\\]|\n|\r/;
  return !dangerousChars.test(input);
}

/**
 * Validate UDID format (UUID format)
 */
export function validateUDID(udid: string): boolean {
  const uuidRegex =
    /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
  return uuidRegex.test(udid);
}

/**
 * Validate Android AVD name
 */
export function validateAVDName(name: string): boolean {
  // AVD names are typically alphanumeric with underscores and hyphens
  const avdNameRegex = /^[a-zA-Z0-9_-]+$/;
  return avdNameRegex.test(name) && name.length > 0 && name.length < 100;
}
