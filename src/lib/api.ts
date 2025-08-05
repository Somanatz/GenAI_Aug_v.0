
// src/lib/api.ts
import type { UserRole, ForumCategory, ForumThread } from '@/interfaces';

let API_BASE_URL_ENV = process.env.NEXT_PUBLIC_API_URL;
let API_BASE_URL: string;
let API_ENDPOINT_BASE: string;

if (!API_BASE_URL_ENV) {
  console.warn(
    "WARNING: NEXT_PUBLIC_API_URL environment variable is not set. " +
    "Defaulting to http://127.0.0.1:8000. " +
    "Ensure your Django backend is running there, or set the variable in a .env.local file."
  );
  API_BASE_URL = 'http://127.0.0.1:8000';
} else {
  API_BASE_URL = API_BASE_URL_ENV;
}
API_ENDPOINT_BASE = `${API_BASE_URL}/api`;


interface ApiError {
  message: string;
  details?: Record<string, any>;
}

// User interface should match backend CustomUserSerializer including profiles
interface UserData {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  is_school_admin?: boolean;
  administered_school?: { id: number; name: string; school_id_code: string; } | null;
  student_profile?: any | null; // Replace 'any' with actual StudentProfileData
  teacher_profile?: any | null; // Replace 'any' with actual TeacherProfileData
  parent_profile?: any | null; // Replace 'any' with actual ParentProfileData
  profile_completed?: boolean;
}


async function request<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  body?: any,
  isFormData: boolean = false,
  useApiPrefix: boolean = true, // Default to true
  authRequired: boolean = true, // New parameter, defaults to true
): Promise<T> {
  const headers: HeadersInit = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  // Only add the token if auth is required for the endpoint
  if (authRequired) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }
  }


  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }
  
  const baseUrlToUse = useApiPrefix ? API_ENDPOINT_BASE : API_BASE_URL;
  const fullUrl = `${baseUrlToUse}${endpoint}`;


  try {
    const response = await fetch(fullUrl, config);

    if (!response.ok) {
      let errorData;
      let errorMessage = `HTTP error ${response.status}`;
      try {
        errorData = await response.json();
        if (errorData?.detail) {
            errorMessage = errorData.detail;
        } else if (errorData?.non_field_errors && Array.isArray(errorData.non_field_errors) && errorData.non_field_errors.length > 0) {
            errorMessage = errorData.non_field_errors.join('; '); // More specific for this case
        } else if (typeof errorData === 'object' && errorData !== null) {
            const fieldErrors = Object.entries(errorData)
                .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
                .join('; ');
            if (fieldErrors) errorMessage = fieldErrors;
        }
      } catch (e) {
        errorMessage = response.statusText || `HTTP error ${response.status} (non-JSON response)`;
      }
      console.error(`API Error (${response.status}) on ${method} ${fullUrl}:`, errorMessage, errorData || '(No JSON error data)');
      throw new Error(errorMessage);
    }
    
    if (response.status === 204) {
        return undefined as T; 
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const responseText = await response.text();
      if (responseText) {
        const responseData = JSON.parse(responseText);
        // Handle paginated results for GET requests by returning the 'results' array if it exists
        if (method === 'GET' && responseData && typeof responseData === 'object' && 'results' in responseData && Array.isArray(responseData.results)) {
            return responseData as T; // Return the whole pagination object
        }
        return responseData as T;
      } else {
        return undefined as T;
      }
    } else {
      return undefined as T;
    }

  } catch (error) {
    console.error(`Network or other error on ${method} ${fullUrl}:`, error);
    throw error; 
  }
}

export const api = {
  get: <T>(endpoint: string, authRequired = true) => request<T>(endpoint, 'GET', undefined, false, true, authRequired),
  post: <T>(endpoint: string, body: any, isFormData: boolean = false, authRequired = true) => request<T>(endpoint, 'POST', body, isFormData, true, authRequired),
  put: <T>(endpoint: string, body: any, isFormData: boolean = false, authRequired = true) => request<T>(endpoint, 'PUT', body, isFormData, true, authRequired),
  patch: <T>(endpoint: string, body: any, isFormData: boolean = false, authRequired = true) => request<T>(endpoint, 'PATCH', body, isFormData, true, authRequired),
  delete: <T>(endpoint: string, authRequired = true) => request<T>(endpoint, 'DELETE', undefined, false, true, authRequired),
  getCategories:()=>client.get('/forum/categories/').then(r=>r.data),
  getThreads:(slug?:string)=>client.get(slug?`/forum/threads/?category__slug=${slug}`:'/forum/threads/').then(r=>r.data),
  createThread:(category:number,title:string)=>client.post('/forum/threads/',{category,title}).then(r=>r.data),
  createPost:(thread:number,content:string)=>client.post('/forum/posts/',{thread,content}).then(r=>r.data)
};


export const loginUser = async (credentials: any) => {
  const response = await request<{ token: string }>('/token-auth/', 'POST', credentials, false, true, false); 
  if (response.token) {
    localStorage.setItem('authToken', response.token);
  }
  return response;
};

export const signupUser = async (userData: FormData) => { 
  return request<UserData>('/signup/', 'POST', userData, true, true, false);
};

export const fetchCurrentUser = async (): Promise<UserData | null> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  if (!token) return null;
  try {
    const userData = await request<UserData>('/users/me/', 'GET', undefined, false, true, true);
    return userData;
  } catch (error) {
    console.error("Error fetching current user, possibly invalid token:", error);
    if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken'); 
    }
    return null;
  }
};

export const logoutUser = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
    }
};

import axios from 'axios'
const client=axios.create({baseURL:process.env.NEXT_PUBLIC_API_ROOT||'http://localhost:8000/api',withCredentials:true})
export const apipost={
  get:(url:string)=>client.get(url).then(r=>r.data),
  post:(url:string,data:any)=>client.post(url,data).then(r=>r.data),
  getCategories:()=>client.get('/forum/categories/').then(r=>r.data),
  getThreads:(slug?:string)=>client.get(slug?`/forum/threads/?category__slug=${slug}`:'/forum/threads/').then(r=>r.data),
  createThread:(category:number,title:string)=>client.post('/forum/threads/',{category,title}).then(r=>r.data),
  createPost:(thread:number,content:string)=>client.post('/forum/posts/',{thread,content}).then(r=>r.data)
}
