#!/usr/bin/env python3
import csv
import json

def split_list(s):
    if not s:
        return []
    return [item.strip() for item in s.split(',') if item.strip()]

def main():
    events = []
    strategies = []
    with open('ecotactica_cards.csv', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            item = {
                'id': int(row['編號']),
                'type': 'event' if row['類型'] == '事件' else 'strategy',
                'title': row['標題'].strip(),
                'description': row['描述'].strip(),
                'effect_biodiversity': int(row['生物多樣性']),
                'effect_economy': int(row['經濟']),
                'effect_public_trust': int(row['公共信任']),
                'effect_climate': int(row['氣候']),
                'effect_social': int(row['社會']),
                'trigger_flag': row['trigger_flag'].strip() or None,
                'required_flag': split_list(row['required_flag']),
                'prohibit_flag': split_list(row['prohibit_flag']),
                'delay_flag': (row.get('延遲旗標') or '').strip() or None,
                'delay_turns': int(row.get('延遲回合') or 0) if (row.get('延遲回合') or '').strip().isdigit() else 0,
                'extra_info': (row.get('額外資訊') or '').strip(),
            }
            if item['type'] == 'event':
                events.append(item)
            else:
                strategies.append(item)

    events.sort(key=lambda x: x['id'])
    strategies.sort(key=lambda x: x['id'])

    with open('events.json', 'w', encoding='utf-8') as f:
        json.dump(events, f, ensure_ascii=False, indent=4)

    with open('strategies.json', 'w', encoding='utf-8') as f:
        json.dump(strategies, f, ensure_ascii=False, indent=4)

if __name__ == '__main__':
    main()