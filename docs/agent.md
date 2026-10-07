
# Development principles

- Understand the complete workflow before implementing isolated features.
- Prefer simple architecture over clever architecture.
- Keep UI, business logic, persistence, and external integrations separated.
- Each module should have one clear responsibility.
- Do not access the database directly from UI components.
- Do not duplicate business rules across files.
- Prefer explicit interfaces between modules.
- Avoid large "god" files/classes.
- If a module grows too broad, propose a refactor.
- New business logic must have tests.

# Testing

Before completing a task:
- Run unit tests.
- Run integration tests where relevant.
- Run lint/type checks.
- Report exactly what was tested.
- Do not claim something works if it was not tested.

# Workflow

- Plan significant changes before implementation.
- Make focused changes.
- Do not modify unrelated functionality.
- Explain architectural changes.
