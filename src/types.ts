/**
 * Type definitions for emulator data structures
 */

export interface IOSSimulator {
  udid: string;
  name: string;
  state: "Booted" | "Shutdown" | "Shutting Down";
  deviceTypeIdentifier: string;
  runtime: string;
}

export interface IOSSimulatorListResponse {
  devices: {
    [runtime: string]: IOSSimulator[];
  };
}

export interface AndroidEmulator {
  name: string;
  path?: string;
  status?: "running" | "stopped";
}

export type EmulatorPlatform = "ios" | "android";

export interface EmulatorItem {
  id: string;
  label: string;
  platform: EmulatorPlatform;
  status: "running" | "stopped" | "starting";
  udid?: string; // For iOS
  name?: string; // For Android
  icon?: string;
  isCategory?: boolean; // For grouping categories
  children?: EmulatorItem[]; // For category items
}

export interface CLICommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: Error;
}
