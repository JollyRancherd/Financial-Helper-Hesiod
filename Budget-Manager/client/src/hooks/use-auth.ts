import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { AuthCredentialsRequest } from "@shared/routes";
import { apiFetch } from "@/lib/api-fetch";

export function useAuth() {
  return useQuery({
    queryKey: [api.auth.me.path],
    retry: false,
    queryFn: async () => {
      const res = await apiFetch(api.auth.me.path);
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch auth state");
      return api.auth.me.responses[200].parse(await res.json());
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AuthCredentialsRequest) => {
      const validated = api.auth.register.input.parse(data);
      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to create account" }));
        throw new Error(body.message || "Failed to create account");
      }
      const json = await res.json();
      if (json.token) localStorage.setItem("budget_auth_token", json.token);
      return { id: json.id as number, username: json.username as string, isNew: !!json.isNew };
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], { id: user.id, username: user.username });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== api.auth.me.path,
      });
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AuthCredentialsRequest) => {
      const validated = api.auth.login.input.parse(data);
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to log in" }));
        throw new Error(body.message || "Failed to log in");
      }
      const json = await res.json();
      if (json.token) localStorage.setItem("budget_auth_token", json.token);
      return { id: json.id as number, username: json.username as string };
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== api.auth.me.path,
      });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch(api.auth.logout.path, { method: api.auth.logout.method });
      localStorage.removeItem("budget_auth_token");
      if (!res.ok) throw new Error("Failed to log out");
      return api.auth.logout.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData([api.auth.me.path], null);
    },
  });
}
