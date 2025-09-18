# Claude Development Commands

## CS - Commit, Sync
When the user types "CS", perform these actions in sequence:

1. **TypeScript Check**: Run `npx tsc --noEmit` to check for TypeScript errors
2. **Lint**: Run `npm run lint` to check for code quality issues
3. **Commit**: Add all changes and create a git commit with an appropriate message
4. **Sync**: Push changes to the remote repository

Deployment happens automatically via Cloudflare Pages when changes are pushed.

This is a shorthand command to quickly validate and save all current work.

## Other Notes
- If TypeScript or lint checks fail, fix the issues before proceeding with commit
- Use descriptive commit messages that summarize the changes made
- Deployment to production happens automatically after successful push