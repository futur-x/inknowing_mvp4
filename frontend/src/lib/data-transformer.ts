/**
 * Data Transformation Utilities
 * Handles conversion between API snake_case and frontend camelCase
 * Ensures business logic conservation between backend and frontend
 */

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Recursively transform object keys from snake_case to camelCase
 */
export function transformSnakeToCamel<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(transformSnakeToCamel) as any;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const transformed: any = {};

    Object.keys(obj).forEach(key => {
      const camelKey = snakeToCamel(key);
      transformed[camelKey] = transformSnakeToCamel(obj[key]);
    });

    return transformed;
  }

  return obj;
}

/**
 * Recursively transform object keys from camelCase to snake_case
 */
export function transformCamelToSnake<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(transformCamelToSnake) as any;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const transformed: any = {};

    Object.keys(obj).forEach(key => {
      const snakeKey = camelToSnake(key);
      transformed[snakeKey] = transformCamelToSnake(obj[key]);
    });

    return transformed;
  }

  return obj;
}

/**
 * Transform Book data from API format to frontend format
 * Specifically handles the dialogue_count -> dialogueCount conversion
 */
export function transformBookData(apiBook: any): any {
  const transformed = transformSnakeToCamel(apiBook);

  // Ensure critical fields are properly mapped
  if ('dialogue_count' in apiBook) {
    transformed.dialogueCount = apiBook.dialogue_count;
  }
  if ('rating_count' in apiBook) {
    transformed.ratingCount = apiBook.rating_count;
  }
  if ('cover_url' in apiBook || 'cover' in apiBook) {
    transformed.coverUrl = apiBook.cover_url || apiBook.cover;
  }
  if ('created_at' in apiBook) {
    transformed.createdAt = apiBook.created_at;
  }
  if ('updated_at' in apiBook) {
    transformed.updatedAt = apiBook.updated_at;
  }

  // Set defaults for missing fields
  if (!transformed.dialogueCount && transformed.dialogueCount !== 0) {
    transformed.dialogueCount = 0;
  }
  if (!transformed.ratingCount && transformed.ratingCount !== 0) {
    transformed.ratingCount = 0;
  }
  if (!transformed.rating && transformed.rating !== 0) {
    transformed.rating = 0;
  }

  // Default values for frontend-specific fields
  transformed.difficulty = transformed.difficulty || 'beginner';
  transformed.language = transformed.language || '中文';
  transformed.status = transformed.status || 'published';
  transformed.uploadSource = transformed.uploadSource || 'admin';
  transformed.vectorized = transformed.vectorized || false;

  return transformed;
}

/**
 * Transform array of books
 */
export function transformBooksData(apiBooks: any[]): any[] {
  return apiBooks.map(transformBookData);
}

/**
 * Transform BookListResponse from API
 */
export function transformBookListResponse(apiResponse: any): any {
  return {
    books: transformBooksData(apiResponse.books || []),
    pagination: transformSnakeToCamel(apiResponse.pagination)
  };
}