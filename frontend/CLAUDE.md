# Claude Development Commands

## CS - Commit, Sync
When the user types "CS", perform these actions in sequence:

1. **TypeScript Check**: Run `cd frontend && npx tsc --noEmit` to check for TypeScript errors
2. **Lint**: Run `cd frontend && npm run lint` to check for code quality issues
3. **Commit**: Add all changes and create a git commit with an appropriate message
4. **Sync**: Push changes to the remote repository

Deployment happens automatically via Cloudflare Pages when changes are pushed.

This is a shorthand command to quickly validate and save all current work.

## Development Reminders
- **Current lint issues**: 27 problems (24 errors, 3 warnings) need attention:
  - TypeScript `any` types should be properly typed
  - React Hook dependency warnings need resolution
  - Function types should use proper TypeScript definitions
- **Priority**: Fix `any` types in services and components for better type safety
- **Location**: Run lint from `/frontend` directory: `cd frontend && npm run lint`

## Other Notes
- If TypeScript or lint checks fail, fix the issues before proceeding with commit
- Use descriptive commit messages that summarize the changes made
- Deployment to production happens automatically after successful push