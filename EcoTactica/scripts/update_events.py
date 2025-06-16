#!/usr/bin/env python3
"""
Update events.json:
- convert numeric "id" to descriptive string based on title
- add disappearance conditions so events can be cleared when their trigger no longer applies
"""
import json
import re

def slugify(title):
    """Generate a lowercase ASCII slug from title."""
    s = title.lower()
    # Replace whitespace and punctuation with underscore, allow unicode letters
    s = re.sub(r'[\W]+', '_', s)
    return s.strip('_')

def main():
    with open('events.json', 'r', encoding='utf-8') as f:
        events = json.load(f)

    for ev in events:
        # reset any existing disappearance rules
        for key in ('disappears_if_flag_cleared', 'disappears_if_metric_below', 'disappears_if_flag_set'):
            ev.pop(key, None)

        # convert id to slug of title
        ev['id'] = slugify(ev.get('title', ''))

        trig = ev.get('trigger_flag')
        if trig:
            ev['disappears_if_flag_cleared'] = trig
        # PM2.5 events disappear when pm25 drops below threshold
        if trig == 'pollutionEvent':
            ev['disappears_if_metric_below'] = {'pm25_level': 50}
        # drought event disappears when relief measures succeed
        if ev.get('title', '').startswith('乾旱'):
            ev['disappears_if_flag_set'] = 'drought_relief_measures_successful_flag'

    with open('events.json', 'w', encoding='utf-8') as f:
        json.dump(events, f, ensure_ascii=False, indent=4)

if __name__ == '__main__':
    main()