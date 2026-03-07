export function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("budget_auth_token");
  const headers = new Headers(init?.headers);
  if (token) headers.set("x-auth-token", token);
  if (!(init?.body instanceof FormData)) {
    if (!headers.has("Content-Type") && init?.body) {
      headers.set("Content-Type", "application/json");
    }
  }
  return fetch(input, { ...init, headers, credentials: "include" });
}
