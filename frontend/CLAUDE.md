# Claude Development Commands

## CSD - Commit, Sync, Deploy
When the user types "CSD", perform these actions in sequence:

1. **TypeScript Check**: Run `npx tsc --noEmit` to check for TypeScript errors
2. **Lint**: Run `npm run lint` to check for code quality issues
3. **Commit**: Add all changes and create a git commit with an appropriate message
4. **Sync**: Push changes to the remote repository
5. **Deploy**: The changes will auto-deploy via Cloudflare Pages when pushed

This is a shorthand command to quickly validate, save and deploy all current work.

## Other Notes
- If TypeScript or lint checks fail, fix the issues before proceeding with commit
- Use descriptive commit messages that summarize the changes made
- Verify the deployment succeeds after pushing