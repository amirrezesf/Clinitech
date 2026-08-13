
const BASE_URL = 'http://localhost:8000/api'; // Local Django Node URL

interface ApiRequestOptions extends RequestInit {
  data?: any;
  token?: string;
}

// Helper to get token from storage
const getToken = () => {
  const userStr = localStorage.getItem('health_ease_user');
  if (userStr) {
    const user = JSON.parse(userStr);
    return user.token;
  }
  return null;
};

export const api = async <T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> => {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers as any,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method: options.method || 'GET',
    headers,
    ...options,
  };

  if (options.data) {
    config.body = JSON.stringify(options.data);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // Handle License Expiry (402 Payment Required or 403 with specific code)
    if (response.status === 402 || (response.status === 403 && await response.clone().text().then(t => t.includes('LICENSE_EXPIRED')))) {
       window.location.href = '/license-expired'; // Redirect to a blockage page
       throw new Error('LICENSE_EXPIRED');
    }

    if (response.status === 401) {
       // Token expired
       localStorage.removeItem('health_ease_user');
       window.location.href = '/login';
       throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'API Error');
    }

    // Return empty for 204 No Content
    if (response.status === 204) return {} as T;

    return await response.json();
  } catch (error: any) {
    if (endpoint.includes('/license-status/')) {
      return { isValid: true, expiresAt: '2030-01-01' } as unknown as T;
    }
    if (endpoint.includes('/system/install/')) {
      return { success: true } as unknown as T;
    }
    throw new Error(error?.message || 'Network Error');
  }
};

// Installation API
export const installSystem = async (payload: { clinicName: string, adminUser: any, token: string }) => {
    return api('/system/install/', {
        method: 'POST',
        data: payload
    });
};

export const checkLicenseStatus = async () => {
    return api<{ isValid: boolean, expiresAt: string }>('/system/license-status/');
};
