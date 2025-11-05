/**
 * TreeView provider for displaying emulators in Cursor sidebar
 */

import * as vscode from 'vscode';
import { EmulatorItem, EmulatorPlatform } from './types';
import { listIOSSimulators, bootIOSSimulator, isSimulatorBooted } from './iosEmulator';
import { listAndroidEmulators, bootAndroidEmulator, isAndroidEmulatorRunning, getAndroidEmulatorStatus } from './androidEmulator';
import { checkXcodeAvailable, checkAndroidAvailable } from './platform';

export class EmulatorProvider implements vscode.TreeDataProvider<EmulatorItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<EmulatorItem | undefined | null | void> = new vscode.EventEmitter<EmulatorItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<EmulatorItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private iosEmulators: EmulatorItem[] = [];
  private androidEmulators: EmulatorItem[] = [];
  private statusPollInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL_MS = 5000; // Poll every 5 seconds

  constructor() {
    this.refresh();
    this.startStatusPolling();
  }

  dispose(): void {
    this.stopStatusPolling();
  }

  private startStatusPolling(): void {
    // Poll every 5 seconds to check for status changes
    this.statusPollInterval = setInterval(() => {
      this.checkStatusChanges();
    }, this.POLL_INTERVAL_MS);
  }

  private stopStatusPolling(): void {
    if (this.statusPollInterval) {
      clearInterval(this.statusPollInterval);
      this.statusPollInterval = null;
    }
  }

  refresh(): void {
    this.loadEmulators();
  }

  private async loadEmulators(): Promise<void> {
    // Build maps of existing items by ID for efficient updates
    const existingIOS = new Map<string, EmulatorItem>();
    const existingAndroid = new Map<string, EmulatorItem>();
    
    for (const item of this.iosEmulators) {
      existingIOS.set(item.id, item);
    }
    for (const item of this.androidEmulators) {
      existingAndroid.set(item.id, item);
    }

    let hasChanges = false;

    try {
      const iosItems: EmulatorItem[] = [];
      const androidItems: EmulatorItem[] = [];

      // Load iOS simulators
      const iosAvailable = await checkXcodeAvailable();
      if (iosAvailable) {
        try {
          const iosSimulators = await listIOSSimulators();
          for (const sim of iosSimulators) {
            const id = `ios-${sim.udid}`;
            const isRunning = isSimulatorBooted(sim);
            const newStatus = isRunning ? 'running' : 'stopped';
            const newIcon = isRunning ? '$(circle-filled)' : '$(circle-outline)';
            
            // Check if item exists and update in place, or create new
            const existing = existingIOS.get(id);
            if (existing) {
              // Update existing item in place if status changed
              if (existing.status !== newStatus || existing.icon !== newIcon) {
                existing.status = newStatus;
                existing.icon = newIcon;
                hasChanges = true;
              }
              iosItems.push(existing);
            } else {
              // New item
              iosItems.push({
                id: id,
                label: sim.name,
                platform: 'ios',
                status: newStatus,
                udid: sim.udid,
                icon: newIcon,
              });
              hasChanges = true;
            }
          }
        } catch (error) {
          iosItems.push({
            id: 'ios-error',
            label: error instanceof Error ? error.message : 'Error loading simulators',
            platform: 'ios',
            status: 'stopped',
            icon: '$(error)',
          });
          hasChanges = true;
        }
      } else {
        iosItems.push({
          id: 'ios-unavailable',
          label: 'Xcode not available',
          platform: 'ios',
          status: 'stopped',
          icon: '$(warning)',
        });
        hasChanges = true;
      }

      // Load Android emulators
      const androidAvailable = await checkAndroidAvailable();
      if (androidAvailable) {
        try {
          const androidEmulators = await listAndroidEmulators();
          for (const emu of androidEmulators) {
            const id = `android-${emu.name}`;
            const newStatus = await getAndroidEmulatorStatus(emu.name);
            const newIcon = newStatus === 'running' ? '$(circle-filled)' : newStatus === 'starting' ? '$(sync~spin)' : '$(circle-outline)';
            
            // Check if item exists and update in place, or create new
            const existing = existingAndroid.get(id);
            if (existing) {
              // Update existing item in place if status changed
              if (existing.status !== newStatus || existing.icon !== newIcon) {
                existing.status = newStatus;
                existing.icon = newIcon;
                hasChanges = true;
              }
              androidItems.push(existing);
            } else {
              // New item
              androidItems.push({
                id: id,
                label: emu.name,
                platform: 'android',
                status: newStatus,
                name: emu.name,
                icon: newIcon,
              });
              hasChanges = true;
            }
          }
        } catch (error) {
          androidItems.push({
            id: 'android-error',
            label: error instanceof Error ? error.message : 'Error loading emulators',
            platform: 'android',
            status: 'stopped',
            icon: '$(error)',
          });
          hasChanges = true;
        }
      } else {
        androidItems.push({
          id: 'android-unavailable',
          label: 'Android Studio not available',
          platform: 'android',
          status: 'stopped',
          icon: '$(warning)',
        });
        hasChanges = true;
      }

      // Only update arrays and fire event if there were changes
      if (hasChanges || this.iosEmulators.length !== iosItems.length || this.androidEmulators.length !== androidItems.length) {
        this.iosEmulators = iosItems;
        this.androidEmulators = androidItems;
        this._onDidChangeTreeData.fire();
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load emulators: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getTreeItem(element: EmulatorItem): vscode.TreeItem {
    if (element.isCategory) {
      // Category item (iOS or Android header)
      const treeItem = new vscode.TreeItem(
        element.label,
        vscode.TreeItemCollapsibleState.Expanded
      );
      treeItem.id = element.id;
      
      // Use platform-specific icons - apple for iOS, chip for Android
      const categoryIcon = element.platform === 'ios' ? 'apple' : 'chip';
      treeItem.iconPath = new vscode.ThemeIcon(categoryIcon);
      
      // Add badge count
      const count = element.children?.length || 0;
      treeItem.description = `${count} available`;
      
      return treeItem;
    }

    // Emulator item
    const treeItem = new vscode.TreeItem(
      element.label,
      vscode.TreeItemCollapsibleState.None
    );

    treeItem.id = element.id;
    if (element.icon) {
      const iconName = element.icon.replace('$(', '').replace(')', '');
      treeItem.iconPath = new vscode.ThemeIcon(iconName);
    }
    
    // Add platform badge/tag
    const platformTag = element.platform === 'ios' ? 'iOS' : 'Android';
    const statusBadge = element.status === 'running' ? '🟢 Running' : element.status === 'starting' ? '🟡 Starting...' : '';
    treeItem.description = statusBadge ? `${platformTag} • ${statusBadge}` : platformTag;
    
    treeItem.contextValue = element.platform === 'ios' ? 'iosEmulator' : 'androidEmulator';
    treeItem.command = {
      command: element.platform === 'ios' ? 'emulatorManager.startIOS' : 'emulatorManager.startAndroid',
      title: 'Start Emulator',
      arguments: [element],
    };

    // Add tooltip with status
    const statusText = element.status === 'running' ? '🟢 Running' : element.status === 'starting' ? '🟡 Starting...' : '⚪ Stopped';
    treeItem.tooltip = `${element.label}\nPlatform: ${platformTag}\nStatus: ${statusText}\n\nClick to start this emulator`;

    return treeItem;
  }

  getChildren(element?: EmulatorItem): EmulatorItem[] {
    // Root level - show categories
    if (!element) {
      return [
        {
          id: 'ios-category',
          label: 'iOS Simulators',
          platform: 'ios',
          status: 'stopped',
          isCategory: true,
          icon: 'device-mobile',
          children: this.iosEmulators,
        },
        {
          id: 'android-category',
          label: 'Android Emulators',
          platform: 'android',
          status: 'stopped',
          isCategory: true,
          icon: 'device-mobile',
          children: this.androidEmulators,
        },
      ];
    }

    // Return children for category items
    if (element.isCategory && element.children) {
      return element.children;
    }

    return [];
  }

  async startEmulator(item: EmulatorItem): Promise<void> {
    if (item.isCategory) {
      return; // Don't start category items
    }

    if (item.status === 'running') {
      return;
    }

    // Update status to starting
    let updated = false;
    if (item.platform === 'ios') {
      const index = this.iosEmulators.findIndex(e => e.id === item.id);
      if (index !== -1) {
        this.iosEmulators[index].status = 'starting';
        this.iosEmulators[index].icon = '$(sync~spin)';
        updated = true;
      }
    } else {
      const index = this.androidEmulators.findIndex(e => e.id === item.id);
      if (index !== -1) {
        this.androidEmulators[index].status = 'starting';
        this.androidEmulators[index].icon = '$(sync~spin)';
        updated = true;
      }
    }

    if (updated) {
      this._onDidChangeTreeData.fire();
    }

    try {
      if (item.platform === 'ios' && item.udid) {
        await bootIOSSimulator(item.udid);
      } else if (item.platform === 'android' && item.name) {
        await bootAndroidEmulator(item.name);
        
        // For Android, check status more frequently as it boots
        // The emulator appears in adb devices quickly but takes time to fully boot
        setTimeout(() => {
          this.checkStatusChanges();
        }, 1000);
        setTimeout(() => {
          this.checkStatusChanges();
        }, 3000);
        setTimeout(() => {
          this.checkStatusChanges();
        }, 5000);
      }

      // Use checkStatusChanges instead of full refresh for smoother updates
      setTimeout(() => {
        this.checkStatusChanges();
      }, 2000);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to start emulator: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      // Reset status on error
      if (item.platform === 'ios') {
        const index = this.iosEmulators.findIndex(e => e.id === item.id);
        if (index !== -1) {
          this.iosEmulators[index].status = 'stopped';
          this.iosEmulators[index].icon = '$(circle-outline)';
          this._onDidChangeTreeData.fire();
        }
      } else {
        const index = this.androidEmulators.findIndex(e => e.id === item.id);
        if (index !== -1) {
          this.androidEmulators[index].status = 'stopped';
          this.androidEmulators[index].icon = '$(circle-outline)';
          this._onDidChangeTreeData.fire();
        }
      }
    }
  }

  /**
   * Check for status changes without full reload (more efficient)
   */
  private async checkStatusChanges(): Promise<void> {
    let hasChanges = false;

    try {
      // Check iOS simulator status changes
      const iosAvailable = await checkXcodeAvailable();
      if (iosAvailable) {
        try {
          const iosSimulators = await listIOSSimulators();
          for (const sim of iosSimulators) {
            const existingIndex = this.iosEmulators.findIndex(e => e.id === `ios-${sim.udid}`);
            if (existingIndex !== -1) {
              const existing = this.iosEmulators[existingIndex];
              const isRunning = isSimulatorBooted(sim);
              const newStatus = isRunning ? 'running' : 'stopped';
              
              if (existing.status !== newStatus) {
                // Status changed - update it
                this.iosEmulators[existingIndex].status = newStatus;
                this.iosEmulators[existingIndex].icon = isRunning ? '$(circle-filled)' : '$(circle-outline)';
                hasChanges = true;
              }
            }
          }
        } catch (error) {
          // Silently fail during polling - don't spam errors
        }
      }

      // Check Android emulator status changes
      const androidAvailable = await checkAndroidAvailable();
      if (androidAvailable) {
        try {
          const androidEmulators = await listAndroidEmulators();
          for (const emu of androidEmulators) {
            const existingIndex = this.androidEmulators.findIndex(e => e.id === `android-${emu.name}`);
            if (existingIndex !== -1) {
              const existing = this.androidEmulators[existingIndex];
              try {
                const newStatus = await getAndroidEmulatorStatus(emu.name);
                
                if (existing.status !== newStatus) {
                  // Status changed - update it
                  this.androidEmulators[existingIndex].status = newStatus;
                  this.androidEmulators[existingIndex].icon = 
                    newStatus === 'running' ? '$(circle-filled)' : 
                    newStatus === 'starting' ? '$(sync~spin)' : 
                    '$(circle-outline)';
                  hasChanges = true;
                }
              } catch (statusError) {
                // If status check fails, don't update - might be temporary
                // Continue to next emulator
                continue;
              }
            }
          }
        } catch (error) {
          // Silently fail during polling - don't spam errors
        }
      }

      // Only update UI if there were actual changes
      if (hasChanges) {
        this._onDidChangeTreeData.fire();
      }
    } catch (error) {
      // Silently fail during polling - avoid unhandled promise rejections
    }
  }
}

