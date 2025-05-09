/// <reference types="vite/client" />

// Python API client for direct backend calls (bypassing Node proxy)

const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000/api';

export class PythonApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number = 500, details?: unknown) {
    super(message);
    this.name = 'PythonApiError';
    this.status = status;
    this.details = details;
  }
}

export async function pythonApiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${PYTHON_API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      throw new PythonApiError(
        `API request failed with status ${response.status}`,
        response.status,
        errorText
      );
    }

    // Python backend may or may not wrap data in {data: ...}
    const data = await response.json();
    if (data.data !== undefined) {
      return data.data as T;
    }
    return data as T;
  } catch (error) {
    if (error instanceof PythonApiError) throw error;
    if (error instanceof Error) throw new PythonApiError(error.message);
    throw new PythonApiError('Unknown fetch error');
  }
}

// Function specifically for file uploads (multipart/form-data)
export async function pythonApiUpload<T>(endpoint: string, formData: FormData): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${PYTHON_API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // **Important:** Do NOT set Content-Type manually for FormData
      // The browser will set it correctly with the boundary
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      throw new PythonApiError(
        `Upload failed with status ${response.status}`,
        response.status,
        errorText
      );
    }

    // Assuming the response is JSON
    const data = await response.json();
    if (data.data !== undefined) {
      return data.data as T;
    }
    return data as T;
  } catch (error) {
    if (error instanceof PythonApiError) throw error;
    if (error instanceof Error) throw new PythonApiError(error.message);
    throw new PythonApiError('Unknown upload error');
  }
} 