/**
 * Platform detection and utility functions
 */

import * as os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";

export type Platform = "darwin" | "linux" | "win32";

export function getPlatform(): Platform {
  return os.platform() as Platform;
}

export function isMacOS(): boolean {
  return getPlatform() === "darwin";
}

export function isWindows(): boolean {
  return getPlatform() === "win32";
}

export function isLinux(): boolean {
  return getPlatform() === "linux";
}

/**
 * Check if Xcode command line tools are available
 */
export async function checkXcodeAvailable(): Promise<boolean> {
  if (!isMacOS()) {
    return false;
  }

  try {
    const execFileAsync = promisify(execFile);
    await execFileAsync("xcrun", ["--version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get default Android SDK paths for each platform
 */
function getDefaultAndroidPaths(): string[] {
  const paths: string[] = [];
  const platform = getPlatform();

  if (platform === "darwin") {
    // macOS default location
    paths.push(
      path.join(
        os.homedir(),
        "Library",
        "Android",
        "sdk",
        "emulator",
        "emulator"
      )
    );
  } else if (platform === "win32") {
    // Windows default locations
    const localAppData = process.env.LOCALAPPDATA || "";
    const userProfile = process.env.USERPROFILE || "";

    if (localAppData) {
      paths.push(
        path.join(localAppData, "Android", "Sdk", "emulator", "emulator.exe")
      );
    }
    if (userProfile) {
      paths.push(
        path.join(
          userProfile,
          "AppData",
          "Local",
          "Android",
          "Sdk",
          "emulator",
          "emulator.exe"
        )
      );
    }
  } else if (platform === "linux") {
    // Linux default locations
    paths.push(
      path.join(os.homedir(), "Android", "Sdk", "emulator", "emulator")
    );
    paths.push(path.join(os.homedir(), "android-sdk", "emulator", "emulator"));
  }

  return paths;
}

/**
 * Check if Android SDK/emulator tools are available
 */
export async function checkAndroidAvailable(): Promise<boolean> {
  try {
    const execFileAsync = promisify(execFile);
    // Try to find emulator command in PATH
    const emulatorCmd = isWindows() ? "emulator.exe" : "emulator";
    await execFileAsync(emulatorCmd, ["-version"], { timeout: 5000 });
    return true;
  } catch {
    // Check environment variables
    const androidHome =
      process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
    if (androidHome) {
      const emulatorExe = isWindows() ? "emulator.exe" : "emulator";
      const emulatorPath = path.join(androidHome, "emulator", emulatorExe);
      if (fs.existsSync(emulatorPath)) {
        return true;
      }
    }

    // Check platform-specific default locations
    const defaultPaths = getDefaultAndroidPaths();
    for (const defaultPath of defaultPaths) {
      if (fs.existsSync(defaultPath)) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Get Android emulator path
 */
export async function getAndroidEmulatorPath(): Promise<string | null> {
  const emulatorExe = isWindows() ? "emulator.exe" : "emulator";

  // Check environment variables first
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (androidHome) {
    const emulatorPath = path.join(androidHome, "emulator", emulatorExe);
    if (fs.existsSync(emulatorPath)) {
      return emulatorPath;
    }
  }

  // Check platform-specific default locations
  const defaultPaths = getDefaultAndroidPaths();
  for (const defaultPath of defaultPaths) {
    if (fs.existsSync(defaultPath)) {
      return defaultPath;
    }
  }

  // Try to find emulator in PATH
  try {
    const execFileAsync = promisify(execFile);
    if (isWindows()) {
      // Windows uses 'where' instead of 'which'
      await execFileAsync("where", [emulatorExe], { timeout: 5000 });
    } else {
      await execFileAsync("which", [emulatorExe], { timeout: 5000 });
    }
    return emulatorExe;
  } catch {
    return null;
  }
}

/**
 * Get default Android ADB paths for each platform
 */
function getDefaultAdbPaths(): string[] {
  const paths: string[] = [];
  const platform = getPlatform();

  if (platform === "darwin") {
    // macOS default location
    paths.push(
      path.join(
        os.homedir(),
        "Library",
        "Android",
        "sdk",
        "platform-tools",
        "adb"
      )
    );
  } else if (platform === "win32") {
    // Windows default locations
    const localAppData = process.env.LOCALAPPDATA || "";
    const userProfile = process.env.USERPROFILE || "";

    if (localAppData) {
      paths.push(
        path.join(localAppData, "Android", "Sdk", "platform-tools", "adb.exe")
      );
    }
    if (userProfile) {
      paths.push(
        path.join(
          userProfile,
          "AppData",
          "Local",
          "Android",
          "Sdk",
          "platform-tools",
          "adb.exe"
        )
      );
    }
  } else if (platform === "linux") {
    // Linux default locations
    paths.push(
      path.join(os.homedir(), "Android", "Sdk", "platform-tools", "adb")
    );
    paths.push(path.join(os.homedir(), "android-sdk", "platform-tools", "adb"));
  }

  return paths;
}

/**
 * Get Android ADB path
 */
export async function getAndroidAdbPath(): Promise<string | null> {
  const adbExe = isWindows() ? "adb.exe" : "adb";

  // Check environment variables first
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (androidHome) {
    const adbPath = path.join(androidHome, "platform-tools", adbExe);
    if (fs.existsSync(adbPath)) {
      return adbPath;
    }
  }

  // Check platform-specific default locations
  const defaultPaths = getDefaultAdbPaths();
  for (const defaultPath of defaultPaths) {
    if (fs.existsSync(defaultPath)) {
      return defaultPath;
    }
  }

  // Try to find adb in PATH
  try {
    const execFileAsync = promisify(execFile);
    if (isWindows()) {
      // Windows uses 'where' instead of 'which'
      await execFileAsync("where", [adbExe], { timeout: 5000 });
    } else {
      await execFileAsync("which", [adbExe], { timeout: 5000 });
    }
    return adbExe;
  } catch {
    return null;
  }
}
