import time
from collections import defaultdict
from typing import Dict, List
from fastapi import Request
from app.core.exceptions import RateLimitExceededException


class InMemoryRateLimiter:
    """Sliding-window rate limiter for sensitive public endpoints."""

    def __init__(self, requests_limit: int = 15, window_seconds: int = 60):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def _clean_old_requests(self, key: str, current_time: float) -> None:
        threshold = current_time - self.window_seconds
        self.requests[key] = [t for t in self.requests[key] if t > threshold]

    def check(self, key: str) -> None:
        current_time = time.time()
        self._clean_old_requests(key, current_time)

        if len(self.requests[key]) >= self.requests_limit:
            raise RateLimitExceededException(
                f"Rate limit exceeded: maximum {self.requests_limit} requests per {self.window_seconds}s. Try again shortly."
            )

        self.requests[key].append(current_time)


# Pre-configured instances
login_rate_limiter = InMemoryRateLimiter(requests_limit=10, window_seconds=60)
tracking_rate_limiter = InMemoryRateLimiter(requests_limit=30, window_seconds=60)
submission_rate_limiter = InMemoryRateLimiter(requests_limit=10, window_seconds=60)


def get_client_ip(request: Request) -> str:
    """Extract real client IP considering forwarded proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"
