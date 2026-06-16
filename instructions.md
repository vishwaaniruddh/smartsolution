# Assistant Development & Testing Rules

1. **Read Files First**: Always read the relevant files to understand the codebase and requirements before making any modifications or proposing changes.
2. **No Automatic Browser Testing**: Do not open the browser, perform browser actions, or start browser subagents unless the user specifically instructs you to open the browser and test.
3. **No Automatic Release Packaging**: Do not run any production build commands or packaging scripts (such as `node scripts/pack-release.cjs`) unless explicitly instructed by the user.
