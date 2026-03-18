import logging
from typing import Dict, Any

import requests
from django.conf import settings

try:
    from groq import Groq
except Exception:  # pragma: no cover - library is optional at runtime
    Groq = None  # type: ignore

logger = logging.getLogger(__name__)


class GroqClient:
    """Tiny wrapper around the Groq SDK with a predictable fallback.

    If the SDK fails to initialize (e.g., version mismatch / proxies kwarg issue),
    we fall back to calling the HTTP API directly before using the static fallback.
    """

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or getattr(settings, "GROQ_API_KEY", "") or ""
        self.client = None

        if self.api_key and Groq:
            try:
                self.client = Groq(api_key=self.api_key)
            except Exception as exc:  # pragma: no cover - network/auth failures
                logger.warning("Failed to init Groq client, will try HTTP fallback: %s", exc)
                self.client = None
        elif not self.api_key:
            logger.info("No GROQ_API_KEY provided. Using fallback responses.")

    def _fallback_response(self, prompt: str) -> Dict[str, Any]:
        """Return a deterministic, test-friendly response."""
        return {
            "success": True,
            "answer": (
                "AI service unavailable right now. "
                "Here is a safe, generic guidance based on your question: "
                f"{prompt[:200]}"
            ),
            "model": "fallback",
            "confidence": 0.55,
        }

    def _http_chat_completion(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Direct HTTP call to Groq API (bypasses SDK)."""
        if not self.api_key:
            return self._fallback_response(user_prompt)

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": 500,
            "temperature": 0.3,
        }

        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            answer = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
            )
            if not answer:
                raise ValueError("Empty answer from Groq HTTP API")
            return {
                "success": True,
                "answer": answer,
                "model": data.get("model", "groq:http"),
                "confidence": 0.7,
            }
        except Exception as exc:
            logger.error("Groq HTTP completion failed: %s", exc)
            return self._fallback_response(user_prompt)

    def ask_groq(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Request a completion; gracefully degrade when SDK fails."""
        if self.client:
            try:
                response = self.client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    max_tokens=800,
                    temperature=0.3,
                )
                answer = response.choices[0].message.content.strip()
                return {
                    "success": True,
                    "answer": answer,
                    "model": "groq:llama-3.1-8b-instant",
                    "confidence": 0.7,
                }
            except Exception as exc:  # pragma: no cover - depends on external service
                logger.error("Groq SDK completion failed: %s", exc)

        # If SDK missing or failed, try HTTP API; otherwise fallback.
        return self._http_chat_completion(system_prompt, user_prompt)

