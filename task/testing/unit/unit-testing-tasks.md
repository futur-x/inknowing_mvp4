# Unit Testing Tasks - InKnowing Platform

## Test Suite: Component and Function Unit Tests
**Framework**: Jest + React Testing Library + Vitest
**Coverage Target**: > 80%

---

## TASK-051: Authentication Service Unit Tests

### Implementation
```javascript
// auth.service.test.js
describe('AuthService', () => {
  describe('validatePhone', () => {
    test('should validate Chinese phone numbers', () => {
      expect(validatePhone('13800138000')).toBe(true);
      expect(validatePhone('19912345678')).toBe(true);
      expect(validatePhone('12345678901')).toBe(false);
      expect(validatePhone('138001380')).toBe(false);
    });
  });

  describe('generateToken', () => {
    test('should generate valid JWT token', () => {
      const user = { id: '123', phone: '13800138000' };
      const token = generateToken(user);

      expect(token).toBeDefined();
      expect(token.split('.').length).toBe(3);

      const decoded = jwt.decode(token);
      expect(decoded.id).toBe('123');
    });

    test('should include expiration time', () => {
      const token = generateToken({ id: '123' });
      const decoded = jwt.decode(token);

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });

  describe('hashPassword', () => {
    test('should hash password with salt', async () => {
      const password = 'Test123456';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    test('should generate different hashes for same password', async () => {
      const password = 'Test123456';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    test('should verify correct password', async () => {
      const password = 'Test123456';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const hash = await hashPassword('Test123456');
      const isValid = await verifyPassword('Wrong123', hash);

      expect(isValid).toBe(false);
    });
  });
});
```

---

## TASK-052: Book Service Unit Tests

### Implementation
```javascript
// book.service.test.js
describe('BookService', () => {
  describe('calculateRelevanceScore', () => {
    test('should calculate relevance score for question', () => {
      const book = {
        title: '原则',
        description: '关于生活和工作的原则',
        tags: ['管理', '决策', '投资']
      };

      const score = calculateRelevanceScore(
        book,
        '如何做出更好的决策？'
      );

      expect(score).toBeGreaterThan(70);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should return low score for unrelated question', () => {
      const book = {
        title: '红楼梦',
        description: '中国古典文学名著'
      };

      const score = calculateRelevanceScore(
        book,
        'How to program in Python?'
      );

      expect(score).toBeLessThan(30);
    });
  });

  describe('extractCharacters', () => {
    test('should extract characters from book content', () => {
      const content = '林黛玉说道："宝哥哥，你来了。" 贾宝玉回应...';
      const characters = extractCharacters(content);

      expect(characters).toContain('林黛玉');
      expect(characters).toContain('贾宝玉');
    });

    test('should handle books without characters', () => {
      const content = '管理的本质是...';
      const characters = extractCharacters(content);

      expect(characters).toEqual([]);
    });
  });

  describe('estimateReadingTime', () => {
    test('should calculate reading time', () => {
      const content = 'a'.repeat(3000); // 3000 characters
      const time = estimateReadingTime(content);

      // Assuming 300 chars/minute reading speed
      expect(time).toBe(10);
    });
  });
});
```

---

## TASK-053: Dialogue Service Unit Tests

### Implementation
```javascript
// dialogue.service.test.js
describe('DialogueService', () => {
  describe('createSession', () => {
    test('should create dialogue session', () => {
      const session = createSession({
        userId: 'user123',
        bookId: 'book456',
        type: 'book'
      });

      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user123');
      expect(session.bookId).toBe('book456');
      expect(session.status).toBe('active');
      expect(session.messages).toEqual([]);
    });

    test('should create character dialogue session', () => {
      const session = createSession({
        userId: 'user123',
        bookId: 'book456',
        characterId: 'char789',
        type: 'character'
      });

      expect(session.characterId).toBe('char789');
      expect(session.type).toBe('character');
    });
  });

  describe('processMessage', () => {
    test('should process user message', async () => {
      const mockAI = jest.fn().mockResolvedValue({
        content: 'AI response',
        references: []
      });

      const response = await processMessage(
        'sessionId',
        'User question',
        mockAI
      );

      expect(response.role).toBe('assistant');
      expect(response.content).toBe('AI response');
      expect(mockAI).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User question'
        })
      );
    });

    test('should include context in AI call', async () => {
      const mockAI = jest.fn();
      const context = {
        bookTitle: '原则',
        previousMessages: ['msg1', 'msg2']
      };

      await processMessage('sessionId', 'Question', mockAI, context);

      expect(mockAI).toHaveBeenCalledWith(
        expect.objectContaining({
          context
        })
      );
    });
  });

  describe('checkQuota', () => {
    test('should allow dialogue within quota', () => {
      const user = {
        membership: 'free',
        quotaUsed: 5,
        quotaLimit: 20
      };

      const canProceed = checkQuota(user);
      expect(canProceed).toBe(true);
    });

    test('should block dialogue when quota exhausted', () => {
      const user = {
        membership: 'free',
        quotaUsed: 20,
        quotaLimit: 20
      };

      const canProceed = checkQuota(user);
      expect(canProceed).toBe(false);
    });
  });
});
```

---

## TASK-054: Upload Service Unit Tests

### Implementation
```javascript
// upload.service.test.js
describe('UploadService', () => {
  describe('validateFile', () => {
    test('should accept valid file types', () => {
      expect(validateFile({ type: 'text/plain', size: 1000 })).toBe(true);
      expect(validateFile({ type: 'application/pdf', size: 1000 })).toBe(true);
    });

    test('should reject invalid file types', () => {
      expect(validateFile({ type: 'image/jpeg', size: 1000 })).toBe(false);
      expect(validateFile({ type: 'application/msword', size: 1000 })).toBe(false);
    });

    test('should reject oversized files', () => {
      const largeFile = { type: 'text/plain', size: 11 * 1024 * 1024 }; // 11MB
      expect(validateFile(largeFile)).toBe(false);
    });
  });

  describe('extractTextFromPDF', () => {
    test('should extract text from PDF buffer', async () => {
      const pdfBuffer = Buffer.from('mock pdf content');
      const text = await extractTextFromPDF(pdfBuffer);

      expect(text).toBeDefined();
      expect(typeof text).toBe('string');
    });
  });

  describe('preprocessText', () => {
    test('should clean and normalize text', () => {
      const raw = '  Chapter 1\n\n\nSome   text   with    spaces  ';
      const processed = preprocessText(raw);

      expect(processed).toBe('Chapter 1\nSome text with spaces');
    });

    test('should handle special characters', () => {
      const text = 'Text with — special • characters';
      const processed = preprocessText(text);

      expect(processed).not.toContain('—');
      expect(processed).not.toContain('•');
    });
  });

  describe('detectChapters', () => {
    test('should identify chapter markers', () => {
      const text = `
        第一章 介绍
        内容...
        Chapter 2: Methods
        内容...
      `;

      const chapters = detectChapters(text);

      expect(chapters).toHaveLength(2);
      expect(chapters[0].title).toContain('介绍');
      expect(chapters[1].title).toContain('Methods');
    });
  });
});
```

---

## TASK-055: React Component Unit Tests

### Implementation
```javascript
// SearchBar.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchBar from './SearchBar';

describe('SearchBar Component', () => {
  test('should render search input', () => {
    render(<SearchBar />);

    const input = screen.getByPlaceholderText(/输入你的问题/i);
    expect(input).toBeInTheDocument();
  });

  test('should handle search submission', async () => {
    const onSearch = jest.fn();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: /搜索/i });

    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.click(button);

    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  test('should show search suggestions', async () => {
    const suggestions = ['suggestion 1', 'suggestion 2'];
    render(<SearchBar suggestions={suggestions} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('suggestion 1')).toBeInTheDocument();
      expect(screen.getByText('suggestion 2')).toBeInTheDocument();
    });
  });

  test('should validate empty search', () => {
    const onSearch = jest.fn();
    render(<SearchBar onSearch={onSearch} />);

    const button = screen.getByRole('button', { name: /搜索/i });
    fireEvent.click(button);

    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByText(/请输入搜索内容/i)).toBeInTheDocument();
  });
});
```

```javascript
// BookCard.test.jsx
describe('BookCard Component', () => {
  const mockBook = {
    id: '123',
    title: '原则',
    author: '瑞·达利欧',
    cover: '/cover.jpg',
    rating: 4.5,
    dialogueCount: 1234
  };

  test('should display book information', () => {
    render(<BookCard book={mockBook} />);

    expect(screen.getByText('原则')).toBeInTheDocument();
    expect(screen.getByText('瑞·达利欧')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  test('should handle click event', () => {
    const onClick = jest.fn();
    render(<BookCard book={mockBook} onClick={onClick} />);

    fireEvent.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalledWith('123');
  });

  test('should show placeholder for missing cover', () => {
    const bookWithoutCover = { ...mockBook, cover: null };
    render(<BookCard book={bookWithoutCover} />);

    const placeholder = screen.getByAltText(/book cover/i);
    expect(placeholder.src).toContain('placeholder');
  });
});
```

---

## TASK-056: Utility Function Unit Tests

### Implementation
```javascript
// utils.test.js
describe('Utility Functions', () => {
  describe('formatDate', () => {
    test('should format date correctly', () => {
      const date = new Date('2024-01-20T10:30:00');
      expect(formatDate(date)).toBe('2024年1月20日');
      expect(formatDate(date, 'time')).toBe('10:30');
    });

    test('should handle relative time', () => {
      const now = new Date();
      const yesterday = new Date(now - 24 * 60 * 60 * 1000);

      expect(formatDate(yesterday, 'relative')).toBe('昨天');
    });
  });

  describe('truncateText', () => {
    test('should truncate long text', () => {
      const text = 'a'.repeat(200);
      const truncated = truncateText(text, 100);

      expect(truncated.length).toBe(103); // 100 + '...'
      expect(truncated.endsWith('...')).toBe(true);
    });

    test('should not truncate short text', () => {
      const text = 'Short text';
      expect(truncateText(text, 100)).toBe(text);
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    test('should debounce function calls', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 300);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      jest.runAllTimers();

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('parseJWT', () => {
    test('should parse valid JWT', () => {
      const token = 'eyJ...'; // Valid JWT
      const parsed = parseJWT(token);

      expect(parsed).toHaveProperty('exp');
      expect(parsed).toHaveProperty('iat');
    });

    test('should handle invalid JWT', () => {
      const invalid = 'not.a.jwt';
      expect(() => parseJWT(invalid)).toThrow();
    });
  });
});
```

---

## TASK-057: State Management Unit Tests

### Implementation
```javascript
// store.test.js
import { configureStore } from '@reduxjs/toolkit';
import userReducer, { setUser, logout } from './userSlice';

describe('User State Management', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: { user: userReducer }
    });
  });

  test('should handle user login', () => {
    const user = {
      id: '123',
      phone: '13800138000',
      membership: 'free'
    };

    store.dispatch(setUser(user));

    const state = store.getState();
    expect(state.user.currentUser).toEqual(user);
    expect(state.user.isAuthenticated).toBe(true);
  });

  test('should handle logout', () => {
    store.dispatch(setUser({ id: '123' }));
    store.dispatch(logout());

    const state = store.getState();
    expect(state.user.currentUser).toBeNull();
    expect(state.user.isAuthenticated).toBe(false);
  });

  test('should update user quota', () => {
    store.dispatch(setUser({ id: '123', quotaUsed: 5 }));
    store.dispatch(incrementQuota());

    const state = store.getState();
    expect(state.user.currentUser.quotaUsed).toBe(6);
  });
});
```

---

## TASK-058: API Client Unit Tests

### Implementation
```javascript
// apiClient.test.js
import apiClient from './apiClient';
import axios from 'axios';

jest.mock('axios');

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should add auth header when token exists', async () => {
    localStorage.setItem('token', 'test-token');
    axios.get.mockResolvedValue({ data: {} });

    await apiClient.get('/test');

    expect(axios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer test-token'
        }
      })
    );
  });

  test('should handle 401 errors', async () => {
    axios.get.mockRejectedValue({
      response: { status: 401 }
    });

    await expect(apiClient.get('/test')).rejects.toThrow('Unauthorized');
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('should retry failed requests', async () => {
    axios.get
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValue({ data: 'success' });

    const result = await apiClient.get('/test');

    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(result.data).toBe('success');
  });
});
```

---

## TASK-059: Custom Hooks Unit Tests

### Implementation
```javascript
// hooks.test.js
import { renderHook, act } from '@testing-library/react';
import { useDebounce, useLocalStorage, usePagination } from './hooks';

describe('Custom Hooks', () => {
  describe('useDebounce', () => {
    jest.useFakeTimers();

    test('should debounce value updates', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      expect(result.current).toBe('initial');

      rerender({ value: 'updated' });
      expect(result.current).toBe('initial');

      act(() => {
        jest.runAllTimers();
      });

      expect(result.current).toBe('updated');
    });
  });

  describe('useLocalStorage', () => {
    test('should persist value to localStorage', () => {
      const { result } = renderHook(() =>
        useLocalStorage('testKey', 'defaultValue')
      );

      const [value, setValue] = result.current;
      expect(value).toBe('defaultValue');

      act(() => {
        setValue('newValue');
      });

      expect(localStorage.getItem('testKey')).toBe('"newValue"');
      expect(result.current[0]).toBe('newValue');
    });
  });

  describe('usePagination', () => {
    test('should manage pagination state', () => {
      const { result } = renderHook(() =>
        usePagination({ totalItems: 100, itemsPerPage: 10 })
      );

      expect(result.current.currentPage).toBe(1);
      expect(result.current.totalPages).toBe(10);

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.currentPage).toBe(2);

      act(() => {
        result.current.goToPage(5);
      });

      expect(result.current.currentPage).toBe(5);
    });
  });
});
```

---

## Test Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.js',
    '!src/serviceWorker.js',
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
  ],
};
```

---

## Success Criteria

✅ Authentication service fully tested
✅ Book service functions tested
✅ Dialogue service logic validated
✅ Upload service processing tested
✅ React components tested with RTL
✅ Utility functions comprehensive coverage
✅ State management tested
✅ API client behavior verified
✅ Custom hooks tested
✅ 80%+ code coverage achieved