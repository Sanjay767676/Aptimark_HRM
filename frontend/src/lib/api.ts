const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') ?? '';

export async function apiRequest(path: string, options: RequestInit = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${apiBaseUrl}${normalizedPath}`, options);

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response;
}
