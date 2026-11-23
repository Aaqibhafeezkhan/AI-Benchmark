export function providerErrorMessage(status: number, responseBody = ""): string {
  const normalized = responseBody.toLowerCase()
  if (normalized.includes("model") && (normalized.includes("not found") || normalized.includes("not available") || normalized.includes("unsupported"))) {
    return "This model is not currently available through Hugging Face Inference Providers. Choose another model or check its provider availability."
  }
  if (status === 401) return "Hugging Face authentication failed. Check your token and its Inference Providers permission."
  if (status === 403) return "Hugging Face denied this request. Check token permissions and model access."
  if (status === 429) return "Hugging Face rate limit reached. Wait before retrying or choose another provider."
  if (status >= 500) return "Hugging Face is temporarily unavailable. Retry the comparison in a moment."
  return "Hugging Face could not complete this request. Check the selected model and try again."
}

export function providerNetworkErrorMessage(): string {
  return "Could not reach Hugging Face Inference Providers. Check your connection and retry."
}
