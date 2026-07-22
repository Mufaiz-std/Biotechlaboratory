export function getApiData(response) {
  const body = response.data;
  if (body && typeof body.success === "boolean") {
    if (!body.success) {
      throw new Error(body.message || "Request failed");
    }
    return body.data;
  }
  return body;
}

export function getApiErrorMessage(error) {
  const data = error.response?.data;
  if (data?.message) return data.message;
  return error.message || "An unexpected error occurred";
}
