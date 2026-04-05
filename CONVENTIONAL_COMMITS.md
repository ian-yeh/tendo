# Conventional Commits Guidelines

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification for structured and clear commit history.

## Commit Message Format

```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description | Example |
| :--- | :--- | :--- |
| **feat** | A new feature | `feat(api): add screenshot streaming` |
| **fix** | A bug fix | `fix(web): resolve login redirect issue` |
| **docs** | Documentation changes | `docs: update setup instructions` |
| **style** | Formatting, missing semi-colons, etc. (no code changes) | `style: lint check fix` |
| **refactor** | Code change that neither fixes a bug nor adds a feature | `refactor: modularize browser service` |
| **perf** | Code change that improves performance | `perf: optimized Gemini vision requests` |
| **test** | Adding or correcting tests | `test: add unit tests for agent logic` |
| **chore** | Build scripts, dependencies, CI etc. | `chore: update playwright to v1.42` |
| **revert** | Reverting a previous commit | `revert: feat: add experimental feature` |

### Scope (Optional)

The scope provides additional context about the part of the codebase the change affects:
- `api`
- `web`
- `cli`
- `core`
- `ci` / `dx`

### Rules

1.  **Subject Line**:
    - Use imperative, present tense ("add", not "added").
    - Don't capitalize the first letter.
    - No period (`.`) at the end.
    - Keep it under 50 characters if possible.
2.  **Body (Optional)**:
    - Use if the change requires explanation.
    - Explain the "what" and "why" of the change, not the "how".
3.  **Breaking Changes**:
    - Indicated by a `!` after the type/scope or by `BREAKING CHANGE:` in the footer.
    - Example: `feat(api)!: redesign test session endpoint`

## Why Conventional Commits?

- **Automation**: Allows automated generation of CHANGELOGs.
- **Clarity**: Makes it easier for team members (and AI agents) to scan the history.
- **Ecosystem**: Standardizes the development workflow across the project.
