"""
robots.txt parsing and matching per RFC 9309, including the '*' and '$'
wildcards that Python's urllib.robotparser doesn't support.
"""
import re
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Dict, List, Optional, Tuple


@dataclass
class Rule:
    allow: bool
    pattern: str

    @property
    def regex(self):
        return _compile(self.pattern)


@dataclass
class Group:
    agents: List[str] = field(default_factory=list)
    rules: List[Rule] = field(default_factory=list)
    crawl_delay: Optional[float] = None


@lru_cache(maxsize=4096)
def _compile(pattern: str):
    anchored = pattern.endswith("$")
    body = pattern[:-1] if anchored else pattern
    regex = "".join(".*" if ch == "*" else re.escape(ch) for ch in body)
    return re.compile(regex + ("$" if anchored else ""))


class RobotsTxt:
    def __init__(self, text: str):
        self.groups: List[Group] = []
        self.sitemaps: List[str] = []
        self._parse(text or "")

    def _parse(self, text: str) -> None:
        current: Optional[Group] = None
        last_was_agent = False
        for raw in text.splitlines():
            line = raw.split("#", 1)[0].strip()
            if ":" not in line:
                continue
            key, value = (part.strip() for part in line.split(":", 1))
            key = key.lower()
            if key == "user-agent":
                if current is None or not last_was_agent:
                    current = Group()
                    self.groups.append(current)
                current.agents.append(value.lower())
                last_was_agent = True
                continue
            last_was_agent = False
            if key == "sitemap":
                self.sitemaps.append(value)
            elif current is None:
                continue
            elif key in ("allow", "disallow") and value:
                current.rules.append(Rule(key == "allow", value))
            elif key == "crawl-delay":
                try:
                    current.crawl_delay = float(value)
                except ValueError:
                    pass

    def group_for(self, token: str) -> Tuple[Optional[str], List[Rule]]:
        """
        Rules that apply to a crawler's product token. Groups naming the token
        (case-insensitive) are merged; otherwise the '*' group applies.
        Returns (matched agent name or None, rules).
        """
        token = token.lower()
        matched = [g for g in self.groups if token in g.agents]
        if matched:
            return token, [r for g in matched for r in g.rules]
        wildcard = [g for g in self.groups if "*" in g.agents]
        if wildcard:
            return "*", [r for g in wildcard for r in g.rules]
        return None, []

    @staticmethod
    def evaluate(rules: List[Rule], path: str) -> Tuple[bool, Optional[Rule]]:
        """(allowed, deciding rule). Longest matching pattern wins; Allow wins ties."""
        if not path:
            path = "/"
        if path == "/robots.txt" or path.startswith("/robots.txt?"):
            return True, None
        best: Optional[Rule] = None
        for rule in rules:
            if rule.regex.match(path):
                if (best is None or len(rule.pattern) > len(best.pattern)
                        or (len(rule.pattern) == len(best.pattern) and rule.allow and not best.allow)):
                    best = rule
        return (True if best is None else best.allow), best

    def is_allowed(self, token: str, path: str) -> bool:
        return self.evaluate(self.group_for(token)[1], path)[0]

    def agents(self) -> Dict[str, int]:
        """User-agent names mentioned, with their rule counts."""
        result: Dict[str, int] = {}
        for g in self.groups:
            for a in g.agents:
                result[a] = result.get(a, 0) + len(g.rules)
        return result
