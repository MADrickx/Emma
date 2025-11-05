# Publishing to VS Code Marketplace

## Prerequisites

1. **Microsoft Account**: You need a Microsoft account (or Azure DevOps account)
2. **Personal Access Token**: Create a token with marketplace publishing permissions

## Step 1: Update package.json

Edit `package.json` and replace:
- `YOUR_PUBLISHER_NAME` - Your unique publisher ID (e.g., "john-doe" or "yourcompany")
- `YOUR_REPOSITORY_URL` - Your GitHub/GitLab repository URL (optional but recommended)

## Step 2: Install vsce (VS Code Extension Manager)

```bash
npm install -g @vscode/vsce
```

## Step 3: Create a Personal Access Token

1. Go to https://dev.azure.com
2. Sign in with your Microsoft account
3. Click on your profile icon → **Security** → **Personal access tokens**
4. Click **+ New Token**
5. Set:
   - **Name**: VS Code Marketplace Publishing
   - **Organization**: All accessible organizations
   - **Expiration**: Choose your preference (1 year recommended)
   - **Scopes**: Select **Custom defined**
   - Under **Marketplace**, check **Manage** (full access)
6. Click **Create**
7. **Copy the token immediately** - you won't be able to see it again!

## Step 4: Create a Publisher Account

1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with your Microsoft account
3. Click **Create Publisher**
4. Fill in:
   - **Publisher ID**: Your unique identifier (will be part of the extension URL)
   - **Publisher Name**: Display name
   - **Support Email**: Your email
5. Click **Create**

## Step 5: Package Your Extension

```bash
# Make sure everything is compiled
npm run compile

# Package the extension (creates a .vsix file)
vsce package
```

This creates a file like `emulator-manager-1.0.0.vsix`

## Step 6: Publish to Marketplace

### Option A: Using vsce (Recommended)

```bash
# Login with your Personal Access Token
vsce login YOUR_PUBLISHER_NAME

# When prompted, enter your Personal Access Token

# Publish
vsce publish
```

### Option B: Using the Web UI

1. Go to https://marketplace.visualstudio.com/manage
2. Click **+ New extension**
3. Select **Visual Studio Code**
4. Upload your `.vsix` file
5. Fill in the details and submit

## Step 7: Update Your Extension

For future updates:

1. Update the version in `package.json` (use semantic versioning: 1.0.1, 1.1.0, etc.)
2. Run `npm run compile`
3. Run `vsce package`
4. Run `vsce publish` (or upload the new .vsix file)

## Troubleshooting

### "Extension name is not valid"
- Make sure the `name` field in package.json is lowercase and uses hyphens
- Example: `emulator-manager` ✅, `EmulatorManager` ❌

### "Publisher ID not found"
- Make sure you've created the publisher account first
- Check that the `publisher` field in package.json matches your Publisher ID exactly

### "Personal Access Token expired"
- Create a new token and login again: `vsce login YOUR_PUBLISHER_NAME`

## Publishing Checklist

- [ ] Updated `publisher` in package.json
- [ ] Updated `repository` URL (optional)
- [ ] Added LICENSE file
- [ ] README.md is complete and accurate
- [ ] Extension compiles without errors (`npm run compile`)
- [ ] Tested the extension locally (F5)
- [ ] Created publisher account
- [ ] Created Personal Access Token
- [ ] Successfully packaged (`vsce package`)
- [ ] Ready to publish!

## After Publishing

Once published, your extension will be available at:
`https://marketplace.visualstudio.com/items?itemName=YOUR_PUBLISHER_NAME.emulator-manager`

Users can install it with:
- VS Code: `code --install-extension YOUR_PUBLISHER_NAME.emulator-manager`
- Or search for "Emulator Manager" in the Extensions view

