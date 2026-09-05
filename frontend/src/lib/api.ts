import axios, { type AxiosRequestConfig } from "axios";
import { ZodError } from "zod";
import type { ApiErrorDto, AuthSessionDto } from "@flagarena/shared";

export const http = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 20000,
});
let accessToken: string | null = null;
let refreshRequest: Promise<AuthSessionDto> | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}
export async function refreshSession() {
  refreshRequest ??= http
    .post<AuthSessionDto>("/auth/refresh")
    .then(({ data }) => {
      setAccessToken(data.accessToken);
      return data;
    })
    .finally(() => {
      refreshRequest = null;
    });
  return refreshRequest;
}
http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config as AxiosRequestConfig & { retried?: boolean };
    if (
      error.response?.status === 401 &&
      request &&
      !request.url?.startsWith("/auth/") &&
      !request.retried
    ) {
      request.retried = true;
      try {
        if (
          !accessToken ||
          request.headers?.Authorization === `Bearer ${accessToken}`
        )
          await refreshSession();
        return await http(request);
      } catch {
        setAccessToken(null);
        window.dispatchEvent(new Event("session-ended"));
      }
    }
    throw error;
  },
);
export function errorMessage(error: unknown): string {
  if (error instanceof ZodError)
    return error.issues
      .map((issue) => `${issue.path.join(".") || "Form"}: ${issue.message}`)
      .join(". ");
  if (axios.isAxiosError<ApiErrorDto>(error)) {
    if (!error.response)
      return "API unavailable. Check that the backend is running.";
    const body = error.response.data;
    const details = body?.details
      ? Object.entries(body.details)
          .map(([field, messages]) => `${field}: ${messages.join(". ")}`)
          .join(". ")
      : "";
    return (
      details || body?.message || `Request failed (${error.response.status})`
    );
  }
  return error instanceof Error
    ? error.message
    : "Request failed. Retry the action.";
}
export async function readApi<T>(
  path: string,
  params?: Record<string, unknown>,
): Promise<T> {
  if (import.meta.env.DEV && sessionStorage.getItem("flagarena-preview")) {
    return (await import("../preview/data")).previewRead(path, params) as T;
  }
  return (await http.get<T>(path, { params })).data;
}
export async function writeApi<T = { message: string }>(
  method: "post" | "put" | "patch" | "delete",
  path: string,
  body?: unknown,
): Promise<T> {
  if (import.meta.env.DEV && sessionStorage.getItem("flagarena-preview"))
    throw new Error("Preview is read-only. Connect the API to save changes.");
  return (
    await http.request<T>({
      method,
      url: path,
      data: body,
      timeout: body instanceof FormData ? 0 : 20000,
    })
  ).data;
}
export async function downloadResource(
  id: string,
  filename: string,
  eventId?: string,
) {
  if (import.meta.env.DEV && sessionStorage.getItem("flagarena-preview"))
    throw new Error("Connect the API to download this file.");
  const response = await http.get(`/resources/${id}/download`, {
    params: { eventId },
    responseType: "blob",
    timeout: 120000,
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
