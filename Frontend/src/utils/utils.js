

export const BACKEND_URL = import.meta.env.DEV 
  ? "http://127.0.0.1:8000"       
  : import.meta.env.VITE_BACKEND_URL;