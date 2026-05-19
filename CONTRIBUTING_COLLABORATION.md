# Contributing to Collaboration Workspace

This guide covers contributing to the Real-Time Collaboration Workspace feature of InnoVision.

## Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_USERNAME/Innovision-Open-Source.git
cd Innovision-Open-Source
git remote add upstream https://github.com/ItsVikasA/Innovision-Open-Source.git
```

### 2. Set Up Firebase

Copy `.env.example` to `.env.local` and add valid Firebase credentials:

```bash
cp .env.example .env.local
```

Update with your Firebase project details in `.env.local`.

### 3. Install & Run

```bash
npm install
npm run dev
```

Access at `http://localhost:3000/collaboration`

## Project Structure

```
src/
├── app/
│   ├── api/collaboration/     # API routes
│   │   ├── rooms/
│   │   ├── messages/
│   │   ├── presence/
│   │   └── activity/
│   └── collaboration/
│       └── page.jsx           # Main workspace page
├── components/
│   └── collaboration/         # UI components
│       ├── WorkspacePanel.jsx
│       ├── MessageThread.jsx
│       ├── PresenceIndicator.jsx
│       ├── IssueLinkedChannel.jsx
│       ├── ContributorActivityFeed.jsx
│       ├── ContributorDirectory.jsx
│       └── __tests__/
├── contexts/
│   └── collaboration.jsx      # Global state
├── lib/
│   ├── collaboration-service.js
│   ├── message-store.js
│   ├── presence-manager.js
│   ├── activity-stream.js
│   └── __tests__/
└── ...
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/collaboration-xxx
# or
git checkout -b fix/collaboration-xxx
# or
git checkout -b docs/collaboration-xxx
```

### 2. Make Changes

Follow these conventions:

#### Code Style

- Use `'use client'` at top of client components
- Follow existing component patterns
- Use Tailwind CSS for styling
- Export named functions for services

#### Component Example

```jsx
'use client';
import { useEffect, useState } from 'react';

export default function MyComponent({ prop1, prop2 }) {
  const [state, setState] = useState('');

  useEffect(() => {
    // Side effect logic
  }, []);

  return (
    <div className="flex flex-col">
      {/* JSX */}
    </div>
  );
}
```

#### Service Example

```javascript
import { db } from './firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

export async function myFunction(params) {
  try {
    // Implementation
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

#### API Route Example

```javascript
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    
    // Validate
    if (!body.required) {
      return NextResponse.json(
        { error: 'Missing required field' },
        { status: 400 }
      );
    }

    // Process
    const result = await doSomething(body);

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
```

### 3. Test Your Changes

#### Run Tests

```bash
npm run test
npm run test:watch
```

#### Manual Testing

```bash
# Open two tabs
http://localhost:3000/collaboration

# Tab 1: Send a message
# Tab 2: Verify message appears in real-time

# Check console for errors
# Verify dark mode compatibility
# Check mobile responsiveness
```

### 4. Commit Changes

Follow commit message format:

```
feat(collaboration): add issue-linked channels
↑         ↑            ↑
│         │            └─ subject in imperative mood
│         └─ scope
└─ type: feat, fix, docs, style, refactor, test, chore

Short (50 chars or less) summary

More detailed explanation of changes if needed.
- Bullet point 1
- Bullet point 2

Fixes #123
```

**Commit types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting (no code change)
- `refactor` - Refactoring code
- `test` - Adding/updating tests
- `chore` - Build/dependencies

### 5. Push & Create PR

```bash
git push origin feature/collaboration-xxx
```

Go to GitHub and create Pull Request:
- Link related issues: `Fixes #123`
- Describe changes clearly
- Add testing notes
- Reference any documentation

## Feature Development

### Adding a New Component

1. **Create component file**:
   ```jsx
   // src/components/collaboration/MyComponent.jsx
   'use client';
   export default function MyComponent() { ... }
   ```

2. **Export from index** (if index exists):
   ```javascript
   export { default as MyComponent } from './MyComponent';
   ```

3. **Write tests**:
   ```javascript
   // src/components/collaboration/__tests__/MyComponent.test.jsx
   import { render } from '@testing-library/react';
   import MyComponent from '../MyComponent';
   ```

4. **Update docs**:
   - Add to `COLLABORATION_COMPONENTS.md`
   - Include usage example
   - Document props and features

### Adding a New API Route

1. **Create route file**:
   ```javascript
   // src/app/api/collaboration/myendpoint/route.js
   export async function POST(req) { ... }
   export async function GET(req) { ... }
   ```

2. **Add validation**:
   ```javascript
   if (!body.required) {
     return NextResponse.json({ error: 'msg' }, { status: 400 });
   }
   ```

3. **Document endpoint**:
   - Add to `COLLABORATION_API.md`
   - Include request/response examples
   - Document error cases

### Adding a New Service

1. **Create service file**:
   ```javascript
   // src/lib/my-service.js
   export async function myFunction() { ... }
   export function subscribeToData(callback) { ... }
   ```

2. **Write tests**:
   ```javascript
   // src/lib/__tests__/my-service.test.js
   describe('my-service', () => { ... });
   ```

3. **Document usage**:
   - Add examples to `COLLABORATION_COMPONENTS.md`
   - Include in architecture docs

## Testing Guidelines

### Unit Tests

Test services and utils with mocked Firebase:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { myFunction } from '@/lib/my-service';

describe('my-service', () => {
  it('should do something', async () => {
    const result = await myFunction({ test: true });
    expect(result).toBe(expected);
  });

  it('should handle errors', async () => {
    expect(() => myFunction(invalid)).toThrow();
  });
});
```

### Component Tests

Test components with mocked context:

```javascript
import { render, screen } from '@testing-library/react';
import MyComponent from '@/components/collaboration/MyComponent';

vi.mock('@/contexts/collaboration', () => ({
  useCollaboration: () => ({ messages: [], presence: [] })
}));

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />);
    expect(screen.getByText('text')).toBeInTheDocument();
  });
});
```

### Test Coverage

Run coverage check:

```bash
npm run test -- --coverage
```

Target: **80%+ coverage** for collaboration features

## Code Review Process

### Before Submitting

- [ ] Tests pass: `npm run test`
- [ ] No lint errors: `npm run lint`
- [ ] Code formatted: `npm run format`
- [ ] Docs updated
- [ ] Changelog mentioned (if applicable)

### Review Criteria

Reviewers will check:

1. **Functionality** - Does it work as intended?
2. **Code Quality** - Is it clean and maintainable?
3. **Security** - Are there security vulnerabilities?
4. **Performance** - Will it scale?
5. **Tests** - Is it tested properly?
6. **Documentation** - Are changes documented?
7. **Alignment** - Does it follow project patterns?

## Documentation

### Update These Files

When adding features:

1. **COLLABORATION_SETUP.md** - Setup/installation changes
2. **COLLABORATION_API.md** - New endpoints
3. **COLLABORATION_COMPONENTS.md** - New components
4. **COLLABORATION_ARCHITECTURE.md** - Architecture changes
5. **README.md** - High-level feature mention

### Documentation Template

**Component**:
```markdown
### ComponentName

Brief description.

**Props:**
- prop1 (type) - Description
- prop2 (type) - Description

**Example:**
\`\`\`jsx
import ComponentName from '@/components/collaboration/ComponentName';
\`\`\`
```

**API Route**:
```markdown
#### Endpoint Path

Description.

**Request:**
\`\`\`json
{ "field": "value" }
\`\`\`

**Response:**
\`\`\`json
{ "result": "value" }
\`\`\`
```

## Issue Types & Labels

### Issue Labels

- `collaboration` - Related to collaboration workspace
- `bug` - Bug fix needed
- `feature` - Feature request
- `documentation` - Documentation needed
- `good first issue` - Good for beginners
- `help wanted` - Need community help

### Good First Issues for New Contributors

1. Add missing component tests
2. Improve documentation
3. Add activity types
4. Enhance UI/styling
5. Add error handling

## Getting Help

### Resources

- [COLLABORATION_SETUP.md](COLLABORATION_SETUP.md)
- [COLLABORATION_API.md](COLLABORATION_API.md)
- [COLLABORATION_COMPONENTS.md](COLLABORATION_COMPONENTS.md)
- [COLLABORATION_ARCHITECTURE.md](COLLABORATION_ARCHITECTURE.md)

### Ask Questions

1. Check existing issues/discussions
2. Review documentation
3. Check code comments
4. Ask in GitHub discussions
5. Reach out to maintainers

## Recognition

All contributors are recognized:

- In GitHub commit history
- Contributors list in CONTRIBUTORS.md
- Monthly contributor spotlight
- Special badges for major contributions

## Code of Conduct

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md):

- Be respectful and inclusive
- Welcome diverse perspectives
- Focus on constructive feedback
- Report violations to maintainers

## License

All contributions are under the InnoVision license. By contributing, you agree to license your work under the same terms.

---

## Quick Reference

### Useful Commands

```bash
# Start dev server
npm run dev

# Run tests
npm run test
npm run test:watch

# Check coverage
npm run test -- --coverage

# Format code
npm run format

# Lint code
npm run lint

# Build for production
npm run build
```

### Common Git Commands

```bash
# Update branch with latest upstream
git fetch upstream
git rebase upstream/main

# Push changes
git push origin feature/my-feature

# After merge, clean up
git branch -d feature/my-feature
git push origin --delete feature/my-feature
```

## Thank You!

Thank you for contributing to make InnoVision better! Your efforts help foster a collaborative open-source community. 🎉
