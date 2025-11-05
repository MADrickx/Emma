/**
 * Android Emulator management module
 */

import { executeCommand, validateAVDName } from './cli';
import { AndroidEmulator } from './types';
import { checkAndroidAvailable, getAndroidEmulatorPath, getAndroidAdbPath } from './platform';
import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as os from 'os';

/**
 * Parse Android emulator list output
 * Output format is one AVD name per line
 */
function parseAndroidEmulatorList(output: string): AndroidEmulator[] {
  const lines = output.trim().split('\n').filter(line => line.trim().length > 0);
  return lines.map(name => ({
    name: name.trim(),
    status: 'stopped' as const,
  }));
}

/**
 * Get list of available Android emulators
 */
export async function listAndroidEmulators(): Promise<AndroidEmulator[]> {
  const isAvailable = await checkAndroidAvailable();
  if (!isAvailable) {
    throw new Error('Android emulator tools are not available. Please install Android Studio and ensure emulator is in PATH.');
  }

  const emulatorPath = await getAndroidEmulatorPath();
  if (!emulatorPath) {
    throw new Error('Android emulator command not found. Please ensure ANDROID_HOME is set or emulator is in PATH.');
  }

  const result = await executeCommand(emulatorPath, ['-list-avds']);

  if (!result.success) {
    throw new Error(`Failed to list Android emulators: ${result.stderr || result.error?.message}`);
  }

  try {
    return parseAndroidEmulatorList(result.stdout);
  } catch (error) {
    throw new Error(`Failed to parse emulator list: ${error}`);
  }
}

/**
 * Get AVD name from running emulator processes by checking command line
 * This is useful when adb commands fail but we can see the process
 */
async function getAVDNameFromProcesses(emulatorName: string): Promise<boolean> {
  try {
    const platform = os.platform();
    let command: string;
    let args: string[];

    if (platform === 'win32') {
      // Windows: use wmic or tasklist
      command = 'wmic';
      args = ['process', 'where', 'name="emulator.exe"', 'get', 'commandline'];
    } else if (platform === 'darwin') {
      // macOS: use ps with ax to show all processes
      command = 'ps';
      args = ['ax', '-o', 'command'];
    } else {
      // Linux: use ps
      command = 'ps';
      args = ['-eo', 'command'];
    }

    const result = await executeCommand(command, args, { timeout: 3000 });
    
    if (result.success) {
      const output = result.stdout.toLowerCase();
      // Check if any emulator process has this AVD name in its command line
      // Look for patterns like "-avd emulatorName" or "avd=emulatorName"
      const escapedName = emulatorName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const avdPattern = new RegExp(`[-_]avd[\\s=]+${escapedName}`, 'i');
      if (avdPattern.test(output)) {
        return true;
      }
    }
  } catch {
    // Silently fail
  }

  return false;
}

/**
 * Check if Android system services are running (indicates system is booted)
 */
async function isAndroidSystemRunning(adbCmd: string, serial: string): Promise<boolean> {
  try {
    // Method 1: Check service list - if we get services, system is running
    const serviceResult = await executeCommand(adbCmd, ['-s', serial, 'shell', 'service', 'list'], {
      timeout: 3000,
    });
    if (serviceResult.success && serviceResult.stdout.trim().length > 0) {
      return true;
    }
  } catch {
    // Continue to next method
  }

  try {
    // Method 2: Check dumpsys - if we can dump services, system is running
    const dumpsysResult = await executeCommand(adbCmd, ['-s', serial, 'shell', 'dumpsys', 'activity', 'services'], {
      timeout: 3000,
    });
    if (dumpsysResult.success && dumpsysResult.stdout.trim().length > 0) {
      return true;
    }
  } catch {
    // Continue to next method
  }

  try {
    // Method 3: Check boot_completed property
    const bootResult = await executeCommand(adbCmd, ['-s', serial, 'shell', 'getprop', 'sys.boot_completed'], {
      timeout: 2000,
    });
    if (bootResult.success && bootResult.stdout.trim() === '1') {
      return true;
    }
  } catch {
    // Continue
  }

  return false;
}

/**
 * Get AVD name from an emulator device using multiple methods
 * Returns the AVD name if found, null otherwise
 */
async function getEmulatorAVDName(adbCmd: string, serial: string): Promise<string | null> {
  // Method 1: Try emu avd name command (most reliable when available)
  try {
    const avdResult = await executeCommand(adbCmd, ['-s', serial, 'emu', 'avd', 'name'], {
      timeout: 3000,
    });
    if (avdResult.success) {
      // Clean the output - remove "OK", newlines, and trim whitespace
      let avdName = avdResult.stdout
        .replace(/OK/g, '')  // Remove "OK" text
        .replace(/\r\n/g, '\n')  // Normalize line endings
        .replace(/\n/g, ' ')  // Replace newlines with spaces
        .trim();  // Trim whitespace
      
      if (avdName) {
        return avdName;
      }
    }
  } catch {
    // Continue to next method
  }

  // Method 2: Try getprop ro.boot.qemu.avd_name (works during boot)
  try {
    const propResult = await executeCommand(adbCmd, ['-s', serial, 'shell', 'getprop', 'ro.boot.qemu.avd_name'], {
      timeout: 3000,
    });
    if (propResult.success) {
      const avdName = propResult.stdout.trim();
      if (avdName) {
        return avdName;
      }
    }
  } catch {
    // Continue to next method
  }

  // Method 3: Try getprop ro.kernel.qemu.avd_name (alternative property)
  try {
    const propResult = await executeCommand(adbCmd, ['-s', serial, 'shell', 'getprop', 'ro.kernel.qemu.avd_name'], {
      timeout: 3000,
    });
    if (propResult.success) {
      const avdName = propResult.stdout.trim();
      if (avdName) {
        return avdName;
      }
    }
  } catch {
    // Continue to next method
  }

  return null;
}

/**
 * Get all running Android emulators with their AVD names
 * Returns a map of AVD name -> status
 */
async function getAllRunningEmulators(adbCmd: string): Promise<Map<string, 'running' | 'starting'>> {
  const runningEmulators = new Map<string, 'running' | 'starting'>();
  
  try {
    const result = await executeCommand(adbCmd, ['devices', '-l']);
    
    if (!result.success && result.stdout.trim().length === 0) {
      return runningEmulators;
    }
    
    const lines = result.stdout.split('\n').filter(line => line.trim().length > 0);
    
    // Find all emulator devices
    const emulatorSerials: Array<{ serial: string; status: string }> = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length >= 2) {
        const serial = parts[0];
        const status = parts[1];
        if (serial.startsWith('emulator-')) {
          emulatorSerials.push({ serial, status });
        }
      }
    }
    
    // For each device, get its AVD name and status
    for (const { serial, status } of emulatorSerials) {
      const avdName = await getEmulatorAVDName(adbCmd, serial);
      if (avdName) {
        if (status === 'device') {
          // Check if fully booted
          const isRunning = await isAndroidSystemRunning(adbCmd, serial);
          runningEmulators.set(avdName, isRunning ? 'running' : 'starting');
        } else {
          // Offline, bootloader, etc. - it's starting
          runningEmulators.set(avdName, 'starting');
        }
      }
    }
  } catch {
    // Silently fail
  }
  
  return runningEmulators;
}

/**
 * Get Android emulator status from adb devices output
 * Returns: 'running' | 'starting' | 'stopped'
 */
export async function getAndroidEmulatorStatus(emulatorName: string): Promise<'running' | 'starting' | 'stopped'> {
  try {
    // Try to find ADB path (it might not be in PATH)
    let adbCmd = await getAndroidAdbPath();
    if (!adbCmd) {
      // Fallback to just 'adb' if not found (might be in PATH)
      adbCmd = process.platform === 'win32' ? 'adb.exe' : 'adb';
    }
    
    // Get all running emulators and their AVD names
    const runningEmulators = await getAllRunningEmulators(adbCmd);
    
    // Check if our emulator is in the running list
    const status = runningEmulators.get(emulatorName);
    if (status) {
      return status;
    }
    
    // Also check process-based detection as fallback
    const foundInProcesses = await getAVDNameFromProcesses(emulatorName);
    if (foundInProcesses) {
      // If found in processes but not in ADB, it might be starting
      // But we can't be certain which device it is if multiple exist
      if (runningEmulators.size === 1) {
        // Only one device running, assume it's ours
        const onlyStatus = Array.from(runningEmulators.values())[0];
        return onlyStatus;
      } else if (runningEmulators.size === 0) {
        // No devices in ADB but found in processes - it's starting
        return 'starting';
      } else {
        // Multiple devices - can't be certain
        return 'stopped';
      }
    }
    
    return 'stopped';
  } catch {
    return 'stopped';
  }
}

/**
 * Check if an Android emulator is running using adb
 */
export async function isAndroidEmulatorRunning(emulatorName: string): Promise<boolean> {
  const status = await getAndroidEmulatorStatus(emulatorName);
  return status === 'running';
}

/**
 * Get running Android emulators
 */
export async function getRunningAndroidEmulators(): Promise<AndroidEmulator[]> {
  const allEmulators = await listAndroidEmulators();
  const running: AndroidEmulator[] = [];

  for (const emulator of allEmulators) {
    const isRunning = await isAndroidEmulatorRunning(emulator.name);
    if (isRunning) {
      running.push({ ...emulator, status: 'running' });
    }
  }

  return running;
}

/**
 * Boot an Android emulator
 * @param avdName - AVD name
 */
export async function bootAndroidEmulator(avdName: string): Promise<void> {
  if (!validateAVDName(avdName)) {
    throw new Error(`Invalid AVD name format: ${avdName}`);
  }

  const isAvailable = await checkAndroidAvailable();
  if (!isAvailable) {
    throw new Error('Android emulator tools are not available');
  }

  const emulatorPath = await getAndroidEmulatorPath();
  if (!emulatorPath) {
    throw new Error('Android emulator command not found');
  }

  // Check if already running
  const isRunning = await isAndroidEmulatorRunning(avdName);
  if (isRunning) {
    return;
  }

  // Start emulator in background using spawn (detached mode)
  // The emulator process runs independently and doesn't block
  return new Promise<void>((resolve, reject) => {
    const emulatorProcess = spawn(emulatorPath, ['-avd', avdName], {
      detached: true,
      stdio: 'ignore', // Ignore stdin, stdout, stderr to run completely in background
    });

    // Unref the process so it doesn't keep the parent process alive
    emulatorProcess.unref();

    // Give the process a moment to start
    // If spawn fails immediately, we'll catch it
    emulatorProcess.on('error', (error) => {
      reject(new Error(`Failed to start emulator: ${error.message}`));
    });

    // Resolve immediately - the emulator is starting
    // The polling mechanism will detect when it's actually running
    setTimeout(() => {
      resolve();
    }, 100);
  });
}

