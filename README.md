# Emulator Manager

A simple and naïve Cursor 2.0 plugin that lets you list and start iOS and Android emulators directly from Cursor's sidebar.

## Features

- 📱 **List iOS Simulators**: View all available iOS simulators from Xcode
- 🤖 **List Android Emulators**: View all available Android Virtual Devices (AVDs)
- ▶️ **Start Emulators**: Start any emulator with a single click
- 🔄 **Real-time Status**: See which emulators are currently running
- 🔃 **Refresh**: Manually refresh the emulator list on demand

## Requirements

### iOS Simulators
- **macOS only** - iOS simulators are only available on macOS
- Xcode installed
- Xcode Command Line Tools (`xcrun` must be available in PATH)

### Android Emulators
- **Cross-platform** - Works on macOS, Windows, and Linux
- Android Studio installed
- Android SDK with emulator tools
- The extension automatically detects:
  - Environment variables: `ANDROID_HOME` or `ANDROID_SDK_ROOT`
  - Default installation paths:
    - **macOS**: `~/Library/Android/sdk`
    - **Windows**: `%LOCALAPPDATA%\Android\Sdk` or `%USERPROFILE%\AppData\Local\Android\Sdk`
    - **Linux**: `~/Android/Sdk` or `~/android-sdk`
  - PATH environment variable (if tools are in PATH)
- `adb` command available (for status detection)

## Installation

1. Clone or download this repository
2. Open the project in Cursor
3. Run `npm install` to install dependencies
4. Run `npm run compile` to build the extension
5. Press `F5` to open a new Cursor window with the extension loaded
6. Or package the extension: `npm install -g vsce && vsce package`

## Usage

1. Open Cursor
2. Look for the "Emulators" view in the Explorer sidebar
3. The view will automatically load available iOS and Android emulators
4. Click on any emulator to start it
5. Use the refresh button (🔄) to reload the emulator list

### Emulator Status Indicators

- 🟢 **Filled circle**: Emulator is currently running
- ⚪ **Outline circle**: Emulator is stopped/available
- ⚠️ **Warning icon**: Tool (Xcode/Android Studio) not available
- ❌ **Error icon**: Error loading emulators

## Commands

- `emulatorManager.refresh`: Refresh the emulator list
- `emulatorManager.startIOS`: Start selected iOS simulator
- `emulatorManager.startAndroid`: Start selected Android emulator

## Troubleshooting

### iOS Simulators Not Showing

- Ensure Xcode is installed: `xcode-select --print-path`
- Verify `xcrun` is available: `xcrun --version`
- Make sure you have at least one iOS simulator installed in Xcode

### Android Emulators Not Showing

- Verify Android Studio is installed
- Check that `emulator` command is in PATH: 
  - **macOS/Linux**: `which emulator`
  - **Windows**: `where emulator.exe`
- Or set `ANDROID_HOME` environment variable:
  - **macOS/Linux**:
    ```bash
    export ANDROID_HOME=$HOME/Library/Android/sdk
    export PATH=$PATH:$ANDROID_HOME/emulator
    export PATH=$PATH:$ANDROID_HOME/platform-tools
    ```
  - **Windows** (PowerShell):
    ```powershell
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
    $env:PATH += ";$env:ANDROID_HOME\emulator;$env:ANDROID_HOME\platform-tools"
    ```
- The extension will also automatically check default installation paths
- Ensure you have created at least one AVD in Android Studio

### Emulator Fails to Start

- For iOS: Check that the simulator UDID is valid
- For Android: Verify the AVD name is correct and the emulator isn't already running
- Check Cursor's output panel for detailed error messages

## Development

### Project Structure

```
src/
  ├── extension.ts          # Main extension entry point
  ├── emulatorProvider.ts   # TreeView provider for UI
  ├── iosEmulator.ts        # iOS simulator management
  ├── androidEmulator.ts    # Android emulator management
  ├── cli.ts                # Secure CLI command execution
  ├── platform.ts           # Platform detection utilities
  └── types.ts              # TypeScript type definitions
```

### Building

```bash
npm install
npm run compile
```

### Debugging

1. Open the project in Cursor
2. Press `F5` to launch a new Cursor window with the extension loaded
3. Use the Debug Console to see output
4. Check the Output panel for extension logs

## Security

This extension uses secure command execution practices:
- Uses `execFile` instead of `exec` to prevent shell injection
- Validates all inputs before executing commands
- Validates UDID and AVD name formats
- Implements timeout protection for long-running commands

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please ensure your code follows the project's TypeScript and security best practices outlined in `SENIOR_RULES.md`.

