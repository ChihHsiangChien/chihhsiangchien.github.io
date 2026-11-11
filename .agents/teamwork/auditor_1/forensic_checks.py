import re
import os
import sys

script_path = "microDefend/script.js"
html_path = "microDefend/index.html"
css_path = "microDefend/style.css"

print("--- 1. Checking Dynamic Code Injection / External Network Calls ---")
with open(script_path, "r", encoding="utf-8") as f:
    js_code = f.read()

patterns = [
    r"eval\(",
    r"new\s+Function\(",
    r"createElement\([\"']script",
    r"import\(",
    r"fetch\(",
    r"XMLHttpRequest",
    r"WebSocket\(",
]

for p in patterns:
    matches = list(re.finditer(p, js_code))
    print(f"  Pattern {p}: {len(matches)} occurrences")
    for m in matches:
        start = max(0, m.start() - 30)
        end = min(len(js_code), m.end() + 30)
        print(f"    Context: {js_code[start:end]!r}")

print("\n--- 2. Checking Math & Differential Equations in script.js ---")
math_patterns = [
    r"Math\.sqrt",
    r"Math\.atan2",
    r"Math\.sin",
    r"Math\.cos",
    r"Math\.hypot",
    r"Math\.min",
    r"Math\.max",
    r"Math\.random",
    r"dx\s*\*|vx\s*\+|vy\s*\+",
    r"evalCubicBezier",
    r"friction|drag|damping|viscosity",
    r"gradient|diffus",
]

for mp in math_patterns:
    matches = list(re.finditer(mp, js_code, re.IGNORECASE))
    print(f"  Math pattern {mp}: {len(matches)} matches")

print("\n--- 3. Checking Object Pool Architecture in script.js ---")
pool_patterns = [
    r"Pool",
    r"resetLnSvgPools",
    r"finalizeLnSvgPools",
    r"resetP3SvgPools",
    r"finalizeP3SvgPools",
    r"resetP4SvgPools",
    r"finalizeP4SvgPools",
    r"resetAllSvgPools",
    r"finalizeAllSvgPools",
    r"style\.display\s*=\s*['\"]none['\"]",
]

for pp in pool_patterns:
    matches = list(re.finditer(pp, js_code))
    print(f"  Pool pattern {pp}: {len(matches)} matches")

print("\n--- 4. Checking Event Listener Bindings in script.js ---")
listener_matches = list(re.finditer(r"addEventListener\([\"']([^\"']+)[\"'],\s*([a-zA-Z0-9_$.]+|\([^)]*\)\s*=>)", js_code))
print(f"  Total addEventListener calls: {len(listener_matches)}")
event_types = {}
for m in listener_matches:
    etype = m.group(1)
    event_types[etype] = event_types.get(etype, 0) + 1
for et, count in sorted(event_types.items()):
    print(f"    Event '{et}': {count} listeners")

