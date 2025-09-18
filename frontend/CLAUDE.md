# Claude Development Commands

## CSD - Commit, Sync, Deploy
When the user types "CSD", perform these actions in sequence:

1. **Commit**: Add all changes and create a git commit with an appropriate message
2. **Sync**: Push changes to the remote repository
3. **Deploy**: The changes will auto-deploy via Cloudflare Pages when pushed

This is a shorthand command to quickly save and deploy all current work.

## Other Notes
- Always check for any build errors before committing
- Use descriptive commit messages that summarize the changes made
- Verify the deployment succeeds after pushing