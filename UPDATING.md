# Updating Your Project Guidelines

This guide explains how to evolve your project guidelines as your codebase changes.

## Overview

**Initial Setup** (first time):
```bash
npm run setup
```

**Updating Existing Guidelines** (as your project evolves):
```bash
npm run guidelines  # Update guidelines
npm run indexes     # Update index files
npm run claude      # Update Claude skills and agents
```

## How Update Mode Works

When you run any command and existing files are detected, you'll be prompted:

```
⚠️  Existing files detected in: /your/project/.guidelines

What would you like to do?

  [O] Override  - Delete and regenerate everything (destructive)
  [U] Update    - Intelligently merge with existing files (recommended)
  [C] Cancel    - Exit without making changes

Your choice [O/U/C]:
```

## Update Mode (Recommended)

**What it does:**

1. **Analyzes your current codebase** - Detects new patterns, frameworks, and best practices
2. **Reads your existing files** - Loads all current guidelines, indexes, skills, and agents
3. **Intelligently merges** - Uses AI to decide what to:
   - ✅ **Keep** - Existing content that's still relevant
   - ➕ **Add** - New patterns/rules detected in your codebase
   - 📝 **Update** - Outdated sections that need refreshing
   - ❌ **Remove** - Obsolete content (asks for confirmation if significant)

4. **Shows dry-run preview** - Displays all changes before writing
5. **Asks for confirmation** - You approve before any files are modified

**Example:**

```bash
$ npm run guidelines

Running discovery...
Running analysis...
Generating guidelines from codebase patterns...
Reading existing guidelines...
Intelligently merging with existing content...

📋 Dry-Run Preview:
──────────────────────────────────────────────────

backend/dependency-injection.md:

✅ Added:
  + Testing Best Practices: Added section on testing DI containers

📝 Modified:
  ~ Provider Registration: Updated with new @injectable decorator syntax

✓ Kept 4 sections unchanged

testing/vitest-testing.md:

✅ Added:
  + Snapshot Testing: New pattern detected for component snapshots

✓ Kept 6 sections unchanged

──────────────────────────────────────────────────

2 file(s) will be modified.

✅ Proceed with these changes? (Y/n)
```

## Override Mode (Destructive)

**What it does:**

- Deletes ALL existing files
- Regenerates everything from scratch
- Loses any manual customizations

**When to use:**

- You want to start completely fresh
- Guidelines are severely out of sync with your codebase
- You haven't made many manual customizations

**⚠️ Warning:** This will ask for confirmation before deleting.

## Typical Workflows

### Adding a New Feature

You've added a new authentication system to your app:

```bash
# Update guidelines to capture new auth patterns
npm run guidelines

# Update indexes to reference new guidelines
npm run indexes

# Update Claude artifacts to enforce new auth rules
npm run claude
```

The AI will detect your new auth code and:
- Add new guidelines for authentication
- Update indexes with new sections
- Create enforcement agents for auth best practices

### Refactoring Existing Code

You've refactored your backend to use a new architecture:

```bash
npm run guidelines
```

The AI will:
- Keep existing guidelines that still apply
- Update architecture guidelines to match new patterns
- Suggest removing outdated patterns (with confirmation)

### Regular Maintenance

Run this monthly or after major changes:

```bash
npm run guidelines && npm run indexes && npm run claude
```

Or create a script in your `package.json`:

```json
{
  "scripts": {
    "update-guidelines": "npm run guidelines && npm run indexes && npm run claude"
  }
}
```

## Manual Customizations

The intelligent merge system preserves your manual edits. To guarantee a section is never changed:

Add a marker comment:

```markdown
<!-- MANUAL EDIT -->
## My Custom Section

This content will always be preserved during updates.
```

Or for indexes, use custom sections:

```markdown
<!-- CUSTOM START -->
## My Additional Resources

- [Custom Link](https://example.com)
<!-- CUSTOM END -->
```

## What Gets Updated

### Guidelines (`npm run guidelines`)

- **Added**: New patterns detected in your codebase
- **Updated**: Existing patterns with new examples or rules
- **Removed**: Patterns that no longer exist in your code (with confirmation)
- **Kept**: Everything else, including manual customizations

### Indexes (`npm run indexes`)

- **Added**: Links to new guidelines
- **Updated**: Section descriptions and organization
- **Removed**: Links to deleted guidelines (with confirmation)
- **Kept**: Custom sections marked with `<!-- CUSTOM -->`

### Claude Artifacts (`npm run claude`)

- **Skills**: Updated workflows based on new guidelines
- **Agents**: Updated enforcement rules based on new patterns
- **CLAUDE.md**: Refreshed with current critical rules and commands

## Non-Interactive Mode

For CI/CD or automated workflows, skip the prompts:

```bash
# Defaults to update mode, no prompts
npm run guidelines -- --no-interactive

# Force override mode
npm run guidelines -- --override --no-interactive
```

## Troubleshooting

### "No guidelines found. Run guidelines generation first."

You need to run `npm run setup` first to create initial guidelines.

### "Merge failed, using new content"

The AI couldn't intelligently merge. This falls back to using the new content. Review the changes carefully.

### Changes not detected

Try increasing verbosity:

```bash
npm run guidelines -- --verbose
```

## Best Practices

1. **Update regularly** - After major feature additions or refactorings
2. **Review dry-run previews** - Don't blindly accept all changes
3. **Use version control** - Commit guidelines to git so you can review diffs
4. **Customize freely** - Add your own sections, the merge system will preserve them
5. **Run all three commands** - Guidelines → Indexes → Claude for full consistency

## Example: Full Update Cycle

```bash
# 1. Pull latest code from team
git pull

# 2. Update guidelines to match current codebase
npm run guidelines
# Review dry-run preview
# Press 'Y' to accept changes

# 3. Update indexes
npm run indexes
# Review and accept

# 4. Update Claude artifacts
npm run claude
# Review and accept

# 5. Review changes in git
git diff .guidelines .claude CLAUDE.md

# 6. Commit if satisfied
git add .guidelines .claude CLAUDE.md
git commit -m "chore: update guidelines after auth system refactor"
git push
```

## Questions?

- **How often should I update?** - After significant code changes or monthly
- **Will I lose my customizations?** - No, the intelligent merge preserves manual edits
- **Can I preview without writing?** - Yes, the dry-run preview shows all changes before writing
- **What if I want to undo?** - Use git to revert: `git checkout -- .guidelines`

## Technical Details

The intelligent merge system:

1. Runs full analysis in memory (no writes yet)
2. Reads all existing files from disk
3. Sends both to AI with prompt: "Intelligently merge these, preserving manual edits"
4. AI returns merged content + change summary
5. Shows you the changes (dry-run preview)
6. Writes only if you confirm

Think of it like asking Claude Code: "Review my current guidelines and update them based on my current codebase."

---

Generated by **GuideGen** - AI-powered documentation that evolves with your code.
