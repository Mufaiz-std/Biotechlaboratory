import axios from "axios";
import { getApiErrorMessage } from "./apiHelpers";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
    // Required when accessing via ngrok tunnel to skip the browser warning page
    "ngrok-skip-browser-warning": "1",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(new Error(getApiErrorMessage(error))),
);

export default api;

/** @deprecated use getApiData from apiHelpers */
export function unwrapResponse(response) {
  return response.data;
}
