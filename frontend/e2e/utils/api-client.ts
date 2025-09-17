import { APIRequestContext } from '@playwright/test';

export class APIClient {
  private baseURL: string = 'http://localhost:8888/v1';

  constructor(private request: APIRequestContext) {}

  async register(data: any) {
    const response = await this.request.post(`${this.baseURL}/auth/register`, {
      data,
    });

    if (response.ok()) {
      return response.json();
    }
    throw new Error(`Registration failed: ${response.status()}`);
  }

  async login(data: any) {
    const response = await this.request.post(`${this.baseURL}/auth/login`, {
      data,
    });

    if (response.ok()) {
      return response.json();
    }
    throw new Error(`Login failed: ${response.status()}`);
  }

  async getProfile(token: string) {
    const response = await this.request.get(`${this.baseURL}/users/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok()) {
      return response.json();
    }
    throw new Error(`Profile fetch failed: ${response.status()}`);
  }

  async getBooks(token?: string) {
    const headers: any = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await this.request.get(`${this.baseURL}/books`, {
      headers,
    });

    if (response.ok()) {
      return response.json();
    }
    throw new Error(`Books fetch failed: ${response.status()}`);
  }
}