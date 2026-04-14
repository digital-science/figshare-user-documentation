"""
HTTP client for Figshare API v2.

Reads configuration from environment variables:
  FIGSHARE_TOKEN    — personal access token (required for private/account endpoints)
  FIGSHARE_BASE_URL — API base URL (default: https://api.figshare.com/v2)
"""

import os
from typing import Any

import httpx

DEFAULT_BASE_URL = "https://api.figshare.com/v2"
MAX_PAGE_SIZE = 50
MAX_TOTAL_RESULTS = 1000

# Human-readable error messages keyed by HTTP status code.
_ERROR_MESSAGES: dict[int, str] = {
    400: "Bad request: {detail}",
    401: "Authentication failed — check your FIGSHARE_TOKEN environment variable",
    403: "Access denied: your token does not have permission for this operation",
    404: "Resource not found",
    409: "Conflict: {detail}",
    422: "Validation error: {detail}",
    429: "Rate limit exceeded — please try again later",
    500: "Figshare API server error",
    502: "Figshare API is temporarily unavailable (502)",
    503: "Figshare API is temporarily unavailable (503)",
}


def _build_error_message(status_code: int, response_body: dict | None) -> str:
    """Produce a human-readable error string from an HTTP error response."""
    template = _ERROR_MESSAGES.get(status_code, f"Unexpected error (HTTP {status_code})")
    # Try to extract a detail message from the response body.
    detail = ""
    if response_body:
        detail = (
            response_body.get("message")
            or response_body.get("detail")
            or response_body.get("error")
            or str(response_body)
        )
    return template.format(detail=detail) if "{detail}" in template else template


class FigshareClient:
    """Thin async wrapper around httpx for Figshare API v2."""

    def __init__(self) -> None:
        raw_url = os.getenv("FIGSHARE_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
        self.base_url = self._normalize_base_url(raw_url)
        token = os.getenv("FIGSHARE_TOKEN", "")
        # Auth header only set when a token is present — public endpoints work without it.
        self._headers: dict[str, str] = {"Content-Type": "application/json"}
        if token:
            self._headers["Authorization"] = f"token {token}"

    @staticmethod
    def _normalize_base_url(url: str) -> str:
        """Upgrade http:// to https:// for non-local URLs.

        Remote Figshare instances redirect http→https, but the 301 Location header
        sometimes omits the 'api.' subdomain, resulting in silent 404s. Upgrading
        the scheme upfront avoids the redirect entirely.
        """
        if url.startswith("http://") and not any(
            url.startswith(f"http://{h}") for h in ("localhost", "127.0.0.1", "0.0.0.0")
        ):
            return "https://" + url[len("http://"):]
        return url

    @property
    def has_token(self) -> bool:
        return "Authorization" in self._headers

    async def _request(
        self,
        method: str,
        path: str,
        params: dict | None = None,
        json: dict | None = None,
    ) -> Any:
        """Execute an HTTP request and return the parsed JSON body.

        Raises RuntimeError with a human-readable message on non-2xx responses.
        """
        url = f"{self.base_url}{path}"
        # Strip None values from query params so we don't send ?foo=None.
        clean_params = {k: v for k, v in (params or {}).items() if v is not None}

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as http:
            response = await http.request(
                method=method,
                url=url,
                headers=self._headers,
                params=clean_params or None,
                json=json,
            )

        if response.is_success:
            # Handle empty bodies (204 No Content, 205 Reset Content, or any 2xx with no body).
            if not response.content:
                return {}
            return response.json()

        # Parse error body if available.
        body = None
        try:
            body = response.json()
        except Exception:
            pass

        raise RuntimeError(_build_error_message(response.status_code, body))

    async def get(self, path: str, params: dict | None = None) -> Any:
        return await self._request("GET", path, params=params)

    async def post(self, path: str, json: dict | None = None, params: dict | None = None) -> Any:
        return await self._request("POST", path, params=params, json=json)

    async def put(self, path: str, json: dict | None = None) -> Any:
        return await self._request("PUT", path, json=json)

    async def patch(self, path: str, json: dict | None = None) -> Any:
        return await self._request("PATCH", path, json=json)

    async def delete(self, path: str) -> Any:
        return await self._request("DELETE", path)


def clamp_page_size(page_size: int) -> int:
    """Clamp page_size to the allowed range [1, MAX_PAGE_SIZE]."""
    return max(1, min(page_size, MAX_PAGE_SIZE))
