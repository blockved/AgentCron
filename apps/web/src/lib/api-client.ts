export class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ code: number; data: T; message: string }> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (options.body !== undefined && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(path, { ...options, headers });
    const contentType = res.headers.get("content-type") || "";
    const json = contentType.includes("application/json")
      ? await res.json()
      : {
          code: res.ok ? 0 : res.status,
          data: null,
          message: await res.text(),
        };

    if (!res.ok || json.code !== 0) {
      throw new Error(json.message || "Request failed");
    }

    return json;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  del<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export const api = new ApiClient();
