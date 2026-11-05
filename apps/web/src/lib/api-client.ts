import { getApiBaseUrl } from './public-env'

const API_URL = getApiBaseUrl()

export const apiClient = {
  async get<T>(path: string, token?: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`)
    }
    return res.json()
  },

  async post<T>(path: string, body: unknown, token?: string): Promise<T> {
    try {
      const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      
      if (!res.ok) {
        let errorData: any = {}
        try {
          errorData = await res.json()
        } catch {
          // If response is not JSON, use status text
          errorData = { error: res.statusText || `Request failed: ${res.status}` }
        }
        
        // Handle different error formats
        const errorMessage = 
          errorData?.error?.message || 
          errorData?.error || 
          errorData?.message || 
          (typeof errorData?.error === 'object' ? JSON.stringify(errorData.error) : errorData?.error) ||
          res.statusText || 
          `Request failed: ${res.status}`
        
        throw new Error(errorMessage)
      }
      
      return res.json()
    } catch (error: any) {
      // Handle network errors
      if (error.message === 'Failed to fetch' || error.message === 'Load failed' || error.message.includes('NetworkError')) {
        throw new Error('Cannot connect to server. Please check your connection and ensure the API is running.')
      }
      throw error
    }
  },

  async delete<T>(path: string, token?: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new Error(error.error ?? 'Request failed')
    }
    return res.json()
  },

  async put<T>(path: string, body: unknown, token?: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new Error(error.error ?? 'Request failed')
    }
    return res.json()
  },
}

export type ApiResponse<T> = { data: T }


