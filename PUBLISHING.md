# Publishing to VS Code Marketplace

Complete guide to publish your Emulator Manager extension to the VS Code Marketplace.

## Prerequisites

1. **Microsoft Account**: You need a Microsoft account (or Azure DevOps account)
2. **Personal Access Token**: Create a token with marketplace publishing permissions
3. **vsce**: VS Code Extension Manager (we'll install this)

## Step 1: Install vsce

Install the VS Code Extension Manager globally:

```bash
npm install -g @vscode/vsce
```

Verify installation:
```bash
vsce --version
```

## Step 2: Update package.json

Before publishing, make sure your `package.json` has:

1. **Publisher ID**: Replace `YOUR_PUBLISHER_NAME` with your unique publisher ID
   - Choose something unique (e.g., "yourname" or "yourcompany")
   - This will be part of your extension URL
   - Must be lowercase, alphanumeric, hyphens allowed

2. **Repository URL** (optional but recommended): Replace `YOUR_REPOSITORY_URL` with your GitHub/GitLab URL

Example:
```json
{
  "publisher": "john-doe",
  "repository": {
    "type": "git",
    "url": "https://github.com/john-doe/emulator-manager"
  }
}
```

## Step 3: Create a Personal Access Token

1. Go to https://dev.azure.com
2. Sign in with your Microsoft account
3. Click on your profile icon (top right) → **Security**
4. Click **Personal access tokens** (in the left sidebar)
5. Click **+ New Token**
6. Fill in the form:
   - **Name**: `VS Code Marketplace Publishing`
   - **Organization**: Select "All accessible organizations"
   - **Expiration**: Choose your preference (1 year recommended)
   - **Scopes**: Select **Custom defined**
   - Under **Marketplace**, check **Manage** (full access)
7. Click **Create**
8. **IMPORTANT**: Copy the token immediately - you won't be able to see it again!
   - It will look like: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 4: Create a Publisher Account

1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with your Microsoft account
3. Click **Create Publisher** (if you don't have one yet)
4. Fill in the details:
   - **Publisher ID**: Your unique identifier (must match what you put in `package.json`)
     - Example: `john-doe`
     - This becomes part of your extension URL
   - **Publisher Name**: Display name (can be different from ID)
     - Example: `John Doe` or `My Company`
   - **Support Email**: Your email address
5. Click **Create**

## Step 5: Prepare Your Extension

Make sure everything is ready:

```bash
# 1. Compile your extension
npm run compile

# 2. Verify no errors
# Check that the 'out' folder contains your compiled JavaScript files
```

## Step 6: Package Your Extension

Create a `.vsix` file (VS Code extension package):

```bash
vsce package
```

This will:
- Run `npm run compile` automatically (via `vscode:prepublish` script)
- Create a `.vsix` file like `emulator-manager-1.0.0.vsix`
- Show package size and included files

**Common issues:**
- If you get "Publisher not found", make sure you created the publisher account first
- If you get "Extension name is not valid", ensure the `name` field is lowercase with hyphens

## Step 7: Login to vsce

Login with your publisher ID and token:

```bash
vsce login YOUR_PUBLISHER_NAME
```

Example:
```bash
vsce login john-doe
```

When prompted, paste your Personal Access Token from Step 3.

## Step 8: Publish Your Extension

Publish to the marketplace:

```bash
vsce publish
```

This will:
- Upload your extension to the marketplace
- Make it available for everyone to install
- Take a few minutes to appear in search results

**First time publishing:**
- The extension will be published as version 1.0.0
- It may take 5-10 minutes to appear in the marketplace

## Step 9: Verify Publication

1. Go to https://marketplace.visualstudio.com
2. Search for "Emulator Manager" or your extension name
3. Your extension URL will be:
   ```
   https://marketplace.visualstudio.com/items?itemName=YOUR_PUBLISHER_NAME.emulator-manager
   ```

## Updating Your Extension

When you want to publish an update:

1. **Update version** in `package.json`:
   ```json
   {
     "version": "1.0.1"  // Use semantic versioning
   }
   ```

2. **Compile and package**:
   ```bash
   npm run compile
   vsce package
   ```

3. **Publish**:
   ```bash
   vsce publish
   ```

**Version guidelines:**
- `1.0.1` - Patch version (bug fixes)
- `1.1.0` - Minor version (new features, backward compatible)
- `2.0.0` - Major version (breaking changes)

## Alternative: Web UI Publishing

If you prefer using the web interface:

1. Go to https://marketplace.visualstudio.com/manage
2. Click **+ New extension**
3. Select **Visual Studio Code**
4. Upload your `.vsix` file
5. Fill in marketplace details (description, screenshots, etc.)
6. Click **Publish**

## Troubleshooting

### "Publisher ID not found"
- Make sure you created the publisher account at https://marketplace.visualstudio.com/manage
- Verify the `publisher` field in `package.json` matches exactly

### "Personal Access Token expired"
- Create a new token (Step 3)
- Login again: `vsce login YOUR_PUBLISHER_NAME`

### "Extension name is not valid"
- The `name` field must be lowercase
- Use hyphens, not underscores or spaces
- Example: `emulator-manager` ✅, `EmulatorManager` ❌

### "Package size too large"
- Maximum size is 100MB
- Check `.vscodeignore` to exclude unnecessary files
- Common exclusions: `node_modules`, `src`, `.git`, etc.

### Extension not appearing in search
- Wait 5-10 minutes after publishing
- Try searching by your publisher ID
- Check the marketplace management page to see publication status

## Publishing Checklist

Before publishing, make sure:

- [ ] Updated `publisher` in `package.json` (replace `YOUR_PUBLISHER_NAME`)
- [ ] Updated `repository` URL (optional but recommended)
- [ ] LICENSE file exists
- [ ] README.md is complete and accurate
- [ ] Extension compiles without errors (`npm run compile`)
- [ ] Tested extension locally (F5 in Cursor)
- [ ] Created publisher account
- [ ] Created Personal Access Token
- [ ] Successfully packaged (`vsce package`)
- [ ] Logged in (`vsce login`)
- [ ] Ready to publish!

## After Publishing

Once published, users can install your extension:

**Via Command Line:**
```bash
cursor --install-extension YOUR_PUBLISHER_NAME.emulator-manager
```

**Via Cursor UI:**
1. Open Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Search for "Emulator Manager"
3. Click Install

**Extension URL:**
```
https://marketplace.visualstudio.com/items?itemName=YOUR_PUBLISHER_NAME.emulator-manager
```

## Security Notes

- Never commit your Personal Access Token to git
- Tokens are stored locally in `~/.vsce` (macOS/Linux) or `%USERPROFILE%\.vsce` (Windows)
- You can revoke tokens anytime at https://dev.azure.com

## Need Help?

- VS Code Extension documentation: https://code.visualstudio.com/api
- Marketplace FAQ: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- vsce documentation: https://github.com/microsoft/vscode-vsce

