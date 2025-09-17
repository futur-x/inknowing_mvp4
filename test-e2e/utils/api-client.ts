import { APIRequestContext, expect } from '@playwright/test';

export class APIClient {
  private baseURL = 'http://localhost:8888/v1';

  constructor(private request: APIRequestContext) {}

  /**
   * Register new user
   */
  async register(data: {
    type: 'phone' | 'wechat';
    phone?: string;
    code?: string;
    username?: string;
    nickname?: string;
  }) {
    const response = await this.request.post(`${this.baseURL}/auth/register`, {
      data
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Registration failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Login user
   */
  async login(data: {
    type: 'phone' | 'password';
    phone?: string;
    username?: string;
    password?: string;
    code?: string;
  }) {
    const response = await this.request.post(`${this.baseURL}/auth/login`, {
      data
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Login failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get user profile
   */
  async getProfile(token: string) {
    const response = await this.request.get(`${this.baseURL}/users/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Get profile failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get books list
   */
  async getBooks(params: {
    category?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const queryParams = new URLSearchParams();
    if (params.category) queryParams.append('category', params.category);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const response = await this.request.get(`${this.baseURL}/books?${queryParams}`);

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Get books failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Search books
   */
  async searchBooks(query: string, filters?: any) {
    const response = await this.request.post(`${this.baseURL}/search/books`, {
      data: {
        query,
        filters
      }
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Search books failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Create dialogue
   */
  async createDialogue(token: string, data: {
    book_id: string;
    character_id?: string;
    initial_message?: string;
  }) {
    const response = await this.request.post(`${this.baseURL}/dialogue/create`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Create dialogue failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Upload book
   */
  async uploadBook(token: string, file: Buffer, metadata: {
    title: string;
    author: string;
    category?: string;
  }) {
    const formData = new FormData();
    formData.append('file', new Blob([file]), 'test-book.txt');
    formData.append('title', metadata.title);
    formData.append('author', metadata.author);
    if (metadata.category) {
      formData.append('category', metadata.category);
    }

    const response = await this.request.post(`${this.baseURL}/upload/book`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      multipart: {
        file: {
          name: 'test-book.txt',
          mimeType: 'text/plain',
          buffer: file
        },
        title: metadata.title,
        author: metadata.author,
        category: metadata.category || ''
      }
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Upload book failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get upload status
   */
  async getUploadStatus(token: string, uploadId: string) {
    const response = await this.request.get(`${this.baseURL}/upload/status/${uploadId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Get upload status failed: ${error}`);
    }

    return response.json();
  }
}