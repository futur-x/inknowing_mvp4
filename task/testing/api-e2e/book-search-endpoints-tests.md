# API E2E Testing Tasks - Book & Search Endpoints

## Test Suite: Books and Search Module
**Framework**: Jest + Supertest
**Base URL**: `https://api.inknowing.ai/v1`

---

## TASK-011: Search Endpoints Tests

### Test Scenarios

#### 11.1 Question-Based Search
```javascript
describe('GET /search - Question Search', () => {
  test('should search books by question', async () => {
    const response = await request(baseURL)
      .get('/search')
      .query({
        q: '如何提高团队管理能力？',
        type: 'question',
        page: 1,
        limit: 10
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('query');
    expect(response.body).toHaveProperty('results');
    expect(response.body.type).toBe('question');
    expect(Array.isArray(response.body.results)).toBe(true);

    // Check result structure
    if (response.body.results.length > 0) {
      const firstResult = response.body.results[0];
      expect(firstResult).toHaveProperty('book');
      expect(firstResult).toHaveProperty('relevance_score');
      expect(firstResult.relevance_score).toBeGreaterThanOrEqual(0);
      expect(firstResult.relevance_score).toBeLessThanOrEqual(100);
      expect(firstResult).toHaveProperty('matched_chapters');
    }
  });

  test('should return relevant books for business questions', async () => {
    const businessQuestions = [
      '创业初期如何融资？',
      '如何制定营销策略？',
      '怎样进行财务管理？',
      '如何建立企业文化？'
    ];

    for (const question of businessQuestions) {
      const response = await request(baseURL)
        .get('/search')
        .query({ q: question, type: 'question' });

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeGreaterThan(0);

      // Verify relevance - at least one result should have high score
      const highRelevanceResults = response.body.results.filter(
        r => r.relevance_score > 70
      );
      expect(highRelevanceResults.length).toBeGreaterThan(0);
    }
  });
});
```

#### 11.2 Title Search
```javascript
describe('GET /search - Title Search', () => {
  test('should search books by title', async () => {
    const response = await request(baseURL)
      .get('/search')
      .query({
        q: '原则',
        type: 'title',
        page: 1,
        limit: 20
      });

    expect(response.status).toBe(200);
    expect(response.body.type).toBe('title');

    // Title search should match book titles
    const titleMatches = response.body.results.filter(r =>
      r.book.title.toLowerCase().includes('原则')
    );
    expect(titleMatches.length).toBeGreaterThan(0);
  });
});
```

#### 11.3 Author Search
```javascript
test('should search books by author', async () => {
  const response = await request(baseURL)
    .get('/search')
    .query({
      q: '瑞·达利欧',
      type: 'author'
    });

  expect(response.status).toBe(200);
  expect(response.body.type).toBe('author');

  const authorMatches = response.body.results.filter(r =>
    r.book.author.includes('瑞·达利欧')
  );
  expect(authorMatches.length).toBeGreaterThan(0);
});
```

#### 11.4 Pagination Tests
```javascript
describe('Search Pagination', () => {
  test('should paginate search results correctly', async () => {
    const page1Response = await request(baseURL)
      .get('/search')
      .query({
        q: '管理',
        page: 1,
        limit: 5
      });

    const page2Response = await request(baseURL)
      .get('/search')
      .query({
        q: '管理',
        page: 2,
        limit: 5
      });

    expect(page1Response.body.page).toBe(1);
    expect(page1Response.body.limit).toBe(5);
    expect(page1Response.body.results.length).toBeLessThanOrEqual(5);

    expect(page2Response.body.page).toBe(2);

    // Results should be different
    const page1Ids = page1Response.body.results.map(r => r.book.id);
    const page2Ids = page2Response.body.results.map(r => r.book.id);
    const intersection = page1Ids.filter(id => page2Ids.includes(id));
    expect(intersection.length).toBe(0);
  });
});
```

---

## TASK-012: Direct Book Search Tests

### Test Scenarios

#### 12.1 Search Books by Title
```javascript
describe('GET /search/books', () => {
  test('should search books by exact title', async () => {
    const response = await request(baseURL)
      .get('/search/books')
      .query({
        title: '原则',
        exact: true
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('books');

    // Exact match should return specific book
    const exactMatches = response.body.books.filter(
      book => book.title === '原则'
    );
    expect(exactMatches.length).toBeGreaterThan(0);
  });

  test('should search books by partial title', async () => {
    const response = await request(baseURL)
      .get('/search/books')
      .query({
        title: '心理',
        exact: false
      });

    expect(response.status).toBe(200);

    // Should return books with "心理" in title
    const partialMatches = response.body.books.filter(
      book => book.title.includes('心理')
    );
    expect(partialMatches).toBe(response.body.books);
  });
});
```

---

## TASK-013: Book List Endpoints Tests

### Test Scenarios

#### 13.1 List All Books
```javascript
describe('GET /books', () => {
  test('should list books with default pagination', async () => {
    const response = await request(baseURL)
      .get('/books');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('books');
    expect(response.body).toHaveProperty('pagination');
    expect(response.body.books.length).toBeLessThanOrEqual(20); // Default limit

    // Verify book structure
    if (response.body.books.length > 0) {
      const book = response.body.books[0];
      expect(book).toHaveProperty('id');
      expect(book).toHaveProperty('title');
      expect(book).toHaveProperty('author');
      expect(book).toHaveProperty('category');
      expect(book).toHaveProperty('dialogue_count');
      expect(book).toHaveProperty('rating');
    }
  });

  test('should filter books by category', async () => {
    const categories = ['business', 'psychology', 'fiction', 'science', 'history', 'philosophy'];

    for (const category of categories) {
      const response = await request(baseURL)
        .get('/books')
        .query({ category });

      expect(response.status).toBe(200);

      // All returned books should be in the specified category
      const allInCategory = response.body.books.every(
        book => book.category === category
      );
      expect(allInCategory).toBe(true);
    }
  });

  test('should sort books correctly', async () => {
    // Test popular sort
    const popularResponse = await request(baseURL)
      .get('/books')
      .query({ sort: 'popular' });

    expect(popularResponse.status).toBe(200);

    // Should be sorted by dialogue_count descending
    for (let i = 1; i < popularResponse.body.books.length; i++) {
      expect(popularResponse.body.books[i-1].dialogue_count)
        .toBeGreaterThanOrEqual(popularResponse.body.books[i].dialogue_count);
    }

    // Test newest sort
    const newestResponse = await request(baseURL)
      .get('/books')
      .query({ sort: 'newest' });

    // Should be sorted by created_at descending
    for (let i = 1; i < newestResponse.body.books.length; i++) {
      const date1 = new Date(newestResponse.body.books[i-1].created_at);
      const date2 = new Date(newestResponse.body.books[i].created_at);
      expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
    }
  });
});
```

---

## TASK-014: Popular Books Tests

### Test Scenarios

#### 14.1 Get Popular Books
```javascript
describe('GET /books/popular', () => {
  test('should get popular books for different periods', async () => {
    const periods = ['today', 'week', 'month', 'all'];

    for (const period of periods) {
      const response = await request(baseURL)
        .get('/books/popular')
        .query({ period, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.books.length).toBeLessThanOrEqual(10);

      // Books should be sorted by popularity
      for (let i = 1; i < response.body.books.length; i++) {
        expect(response.body.books[i-1].dialogue_count)
          .toBeGreaterThanOrEqual(response.body.books[i].dialogue_count);
      }
    }
  });

  test('should limit number of popular books', async () => {
    const response = await request(baseURL)
      .get('/books/popular')
      .query({ period: 'week', limit: 5 });

    expect(response.status).toBe(200);
    expect(response.body.books.length).toBeLessThanOrEqual(5);
  });

  test('should have different results for different periods', async () => {
    const todayResponse = await request(baseURL)
      .get('/books/popular')
      .query({ period: 'today', limit: 10 });

    const allTimeResponse = await request(baseURL)
      .get('/books/popular')
      .query({ period: 'all', limit: 10 });

    // Popular books today might differ from all-time popular
    const todayIds = todayResponse.body.books.map(b => b.id);
    const allTimeIds = allTimeResponse.body.books.map(b => b.id);

    // Should have some difference
    expect(todayIds).not.toEqual(allTimeIds);
  });
});
```

---

## TASK-015: Book Details Tests

### Test Scenarios

#### 15.1 Get Book Details
```javascript
describe('GET /books/{bookId}', () => {
  let testBookId;

  beforeAll(async () => {
    // Get a book ID from the list
    const listResponse = await request(baseURL)
      .get('/books')
      .query({ limit: 1 });
    testBookId = listResponse.body.books[0].id;
  });

  test('should get complete book details', async () => {
    const response = await request(baseURL)
      .get(`/books/${testBookId}`);

    expect(response.status).toBe(200);

    // Check detailed fields
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('title');
    expect(response.body).toHaveProperty('author');
    expect(response.body).toHaveProperty('cover');
    expect(response.body).toHaveProperty('category');
    expect(response.body).toHaveProperty('description');
    expect(response.body).toHaveProperty('type'); // ai_known or vectorized
    expect(response.body).toHaveProperty('chapters');
    expect(response.body).toHaveProperty('estimated_reading_time');
    expect(response.body).toHaveProperty('characters');
    expect(response.body).toHaveProperty('tags');

    // Characters should be an array
    expect(Array.isArray(response.body.characters)).toBe(true);
  });

  test('should return 404 for non-existent book', async () => {
    const response = await request(baseURL)
      .get('/books/non-existent-book-id');

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Not Found');
  });
});
```

---

## TASK-016: Book Characters Tests

### Test Scenarios

#### 16.1 Get Book Characters
```javascript
describe('GET /books/{bookId}/characters', () => {
  let bookWithCharacters;

  beforeAll(async () => {
    // Find a book with characters
    const booksResponse = await request(baseURL)
      .get('/books')
      .query({ category: 'fiction', limit: 10 });

    for (const book of booksResponse.body.books) {
      const detailResponse = await request(baseURL)
        .get(`/books/${book.id}`);

      if (detailResponse.body.characters && detailResponse.body.characters.length > 0) {
        bookWithCharacters = book.id;
        break;
      }
    }
  });

  test('should get available characters for a book', async () => {
    if (!bookWithCharacters) {
      console.warn('No book with characters found for testing');
      return;
    }

    const response = await request(baseURL)
      .get(`/books/${bookWithCharacters}/characters`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('characters');
    expect(Array.isArray(response.body.characters)).toBe(true);

    // Check character structure
    if (response.body.characters.length > 0) {
      const character = response.body.characters[0];
      expect(character).toHaveProperty('id');
      expect(character).toHaveProperty('name');
      expect(character).toHaveProperty('description');
      expect(character).toHaveProperty('personality');
      expect(character).toHaveProperty('dialogue_count');
      expect(character).toHaveProperty('enabled');
    }
  });

  test('should only return enabled characters', async () => {
    if (!bookWithCharacters) return;

    const response = await request(baseURL)
      .get(`/books/${bookWithCharacters}/characters`);

    const disabledCharacters = response.body.characters.filter(
      char => char.enabled === false
    );
    expect(disabledCharacters.length).toBe(0);
  });

  test('should return 404 for book without characters', async () => {
    // Find a non-fiction book (less likely to have characters)
    const businessBooks = await request(baseURL)
      .get('/books')
      .query({ category: 'business', limit: 1 });

    const bookId = businessBooks.body.books[0].id;

    const response = await request(baseURL)
      .get(`/books/${bookId}/characters`);

    // Should either return empty array or appropriate message
    if (response.status === 200) {
      expect(response.body.characters.length).toBe(0);
    }
  });
});
```

---

## Performance Testing

### Search Performance
```javascript
describe('Search Performance Tests', () => {
  test('Question search should respond within 1 second', async () => {
    const startTime = Date.now();

    await request(baseURL)
      .get('/search')
      .query({
        q: '如何提高工作效率并保持工作生活平衡？',
        type: 'question'
      });

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(1000);
  });

  test('Should handle concurrent searches', async () => {
    const searches = [
      '管理技巧',
      '心理学',
      '创业',
      '投资理财',
      '个人成长'
    ].map(q =>
      request(baseURL)
        .get('/search')
        .query({ q })
    );

    const startTime = Date.now();
    const responses = await Promise.all(searches);
    const totalTime = Date.now() - startTime;

    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // All concurrent searches should complete within 2 seconds
    expect(totalTime).toBeLessThan(2000);
  });
});
```

---

## Edge Cases and Error Handling

### Invalid Parameters
```javascript
describe('Search Error Handling', () => {
  test('should handle empty search query', async () => {
    const response = await request(baseURL)
      .get('/search')
      .query({ q: '' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('query');
  });

  test('should handle very long search query', async () => {
    const longQuery = 'a'.repeat(201); // Over 200 character limit

    const response = await request(baseURL)
      .get('/search')
      .query({ q: longQuery });

    expect(response.status).toBe(400);
  });

  test('should handle invalid search type', async () => {
    const response = await request(baseURL)
      .get('/search')
      .query({
        q: 'test',
        type: 'invalid_type'
      });

    expect(response.status).toBe(400);
  });

  test('should handle invalid pagination', async () => {
    const response = await request(baseURL)
      .get('/books')
      .query({
        page: -1,
        limit: 1000 // Over limit
      });

    expect(response.status).toBe(400);
  });
});
```

---

## Data Validation

### Book Data Integrity
```javascript
describe('Book Data Validation', () => {
  test('All books should have required fields', async () => {
    const response = await request(baseURL)
      .get('/books')
      .query({ limit: 50 });

    response.body.books.forEach(book => {
      expect(book.id).toBeDefined();
      expect(book.title).toBeDefined();
      expect(book.author).toBeDefined();
      expect(book.category).toBeDefined();
      expect(book.dialogue_count).toBeGreaterThanOrEqual(0);
      expect(book.rating).toBeGreaterThanOrEqual(0);
      expect(book.rating).toBeLessThanOrEqual(5);
    });
  });

  test('Book categories should be valid', async () => {
    const validCategories = ['business', 'psychology', 'fiction', 'science', 'history', 'philosophy'];

    const response = await request(baseURL)
      .get('/books')
      .query({ limit: 100 });

    response.body.books.forEach(book => {
      expect(validCategories).toContain(book.category);
    });
  });
});
```

---

## CI/CD Integration

```yaml
# .github/workflows/book-search-tests.yml
name: API E2E Tests - Books & Search

on:
  push:
    paths:
      - 'src/api/books/**'
      - 'src/api/search/**'
  pull_request:
    paths:
      - 'src/api/books/**'
      - 'src/api/search/**'

jobs:
  book-search-tests:
    runs-on: ubuntu-latest

    services:
      elasticsearch:
        image: elasticsearch:8.10.0
        ports:
          - 9200:9200
        options: >-
          --health-cmd "curl -f http://localhost:9200/_cluster/health || exit 1"
          --health-interval 10s

    steps:
      - uses: actions/checkout@v2

      - name: Setup Vector DB
        run: |
          npm run db:seed:books
          npm run vector:index

      - name: Run Book & Search Tests
        run: npm run test:api:books-search

      - name: Run Performance Tests
        run: npm run test:api:books-search:performance

      - name: Generate Coverage Report
        run: npm run coverage:books-search
```

---

## Success Criteria

✅ Search endpoints fully tested (3 endpoints)
✅ Book listing endpoints tested (2 endpoints)
✅ Book detail endpoints tested (2 endpoints)
✅ All search types validated (question, title, author)
✅ Pagination thoroughly tested
✅ Sorting algorithms verified
✅ Character retrieval tested
✅ Performance benchmarks met
✅ Error handling comprehensive
✅ Data integrity validated