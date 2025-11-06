/**
 * Main extension entry point
 */

import * as vscode from "vscode";
import { EmulatorProvider } from "./emulatorProvider";
import { EmulatorItem } from "./types";

let emulatorProvider: EmulatorProvider;

export function activate(context: vscode.ExtensionContext) {
  // Suppress punycode deprecation warnings
  const originalEmitWarning = process.emitWarning;
  process.emitWarning = function (warning: string | Error, ...args: any[]) {
    if (typeof warning === "string" && warning.includes("punycode")) {
      return; // Suppress punycode deprecation warnings
    }
    return originalEmitWarning.call(process, warning, ...args);
  };

  // Create emulator provider
  emulatorProvider = new EmulatorProvider(context.extensionUri.fsPath);

  // Register tree view
  const treeView = vscode.window.createTreeView("emulatorManagerView", {
    treeDataProvider: emulatorProvider,
    showCollapseAll: false,
  });

  // Register refresh command
  const refreshCommand = vscode.commands.registerCommand(
    "emulatorManager.refresh",
    () => {
      emulatorProvider.refresh();
    }
  );

  // Register start iOS command
  const startIOSCommand = vscode.commands.registerCommand(
    "emulatorManager.startIOS",
    async (item: EmulatorItem) => {
      await emulatorProvider.startEmulator(item);
    }
  );

  // Register start Android command
  const startAndroidCommand = vscode.commands.registerCommand(
    "emulatorManager.startAndroid",
    async (item: EmulatorItem) => {
      await emulatorProvider.startEmulator(item);
    }
  );

  // Add commands to context subscriptions
  context.subscriptions.push(
    treeView,
    refreshCommand,
    startIOSCommand,
    startAndroidCommand,
    {
      dispose: () => {
        // Cleanup polling when extension deactivates
        emulatorProvider.dispose();
      },
    }
  );
}

export function deactivate() {
  // Cleanup polling
  if (emulatorProvider) {
    emulatorProvider.dispose();
  }
}
