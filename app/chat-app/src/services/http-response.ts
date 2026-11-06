type TextResponse = Pick<Response, "status" | "text">;

/**
 * Parses an API response without copying an unexpected HTML body (or any
 * other potentially sensitive response content) into application logs.
 */
export async function parseJsonResponse<T>(
  response: TextResponse,
  invalidJsonMessage = "Сървърът върна невалиден JSON.",
): Promise<T> {
  const rawResponse = await response.text();

  try {
    return JSON.parse(rawResponse) as T;
  } catch {
    throw new Error(`${invalidJsonMessage} (HTTP ${response.status})`);
  }
}
