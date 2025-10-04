# CRUSH.md - Transcriber Project

## Development Commands

### Environment Setup
```bash
source venv/bin/activate  # Activate virtual environment
pip install -r requirements.txt  # Install dependencies
```

### Development
```bash
streamlit run app.py  # Run the application
python -m pytest tests/  # Run all tests
python -m pytest tests/test_specific.py  # Run single test file
python -m pytest -k "test_name"  # Run specific test
python -m pytest -v  # Verbose test output
python -m flake8 src/  # Lint code
python -m black src/  # Format code
python -m isort src/  # Sort imports
python -m mypy src/  # Type checking
```

## Code Style Guidelines

### Project Structure
- Main entry point: `app.py`
- Core modules in `src/transcriber/`
- Tests in `tests/`
- Transcripts output in `transcripts/` (auto-created)

### Import Style
- Use relative imports within the package: `from .utils import ...`
- Standard library imports first, then third-party, then local imports
- Use `isort` for import organization

### Formatting & Linting
- Use `black` for code formatting (line length 88)
- Use `flake8` for linting
- Use `mypy` for static type checking
- Use `isort` for import sorting

### Naming Conventions
- Functions and variables: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private methods: prefix with `_`
- Module-level constants in separate `constants.py` files

### Type Hints
- Add type hints to all function signatures
- Use `from typing import ...` for complex types
- Return types are mandatory for public APIs
- Use Optional[T] for nullable return types

### Error Handling
- Use specific exceptions, avoid bare `except:`
- Raise custom exceptions with descriptive messages
- Use context managers for resource cleanup
- Log errors with appropriate context

### Testing
- Write unit tests in `tests/` directory following `test_<module>.py` pattern
- Use descriptive test names: `test_<function>_<scenario>`
- Mock external dependencies (API calls, file I/O)
- Use fixtures for common test setup
- Achieve >80% code coverage

### Architecture Patterns
- Separate concerns: UI, business logic, data access
- Use service classes for complex operations
- Factory pattern for creating clients/services
- Context managers for resource management
- Dependency injection for testability

### Git Workflow
- Write conventional commits: `feat:`, `fix:`, `refactor:`, `test:`
- Keep commits focused and atomic
- Include tests in the same commit when applicable
- Format with `black` and sort imports with `isort` before committing