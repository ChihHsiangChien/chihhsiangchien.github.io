from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Sequence

Edge = Dict[str, str]


def read_timetable(path: Path, direction: str) -> List[Edge]:
    """Convert a timetable csv into a list of edges with direction.

    direction: "上行" or "下行" to tag each edge.
    """
    edges: List[Edge] = []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        stations: Sequence[str] = header[1:]
        for row in reader:
            if not row:
                continue
            train_no = row[0]
            times = row[1:]
            # pad times to station count to avoid IndexError on trailing empties
            if len(times) < len(stations):
                times += [""] * (len(stations) - len(times))

            n = len(stations)
            # Create edges from station i to every downstream station j>i
            for i in range(n - 1):
                dep = (times[i] or "").strip()
                if not dep:
                    continue
                for j in range(i + 1, n):
                    arr = (times[j] or "").strip()
                    if not arr:
                        continue
                    edge: Edge = {
                        "train": train_no,
                        "from": stations[i],
                        "to": stations[j],
                        "dep": dep,
                        "arr": arr,
                        "direction": direction,
                    }
                    edges.append(edge)
    return edges


def group_by_origin(edges: Sequence[Edge]) -> Dict[str, List[Edge]]:
    grouped: Dict[str, List[Edge]] = defaultdict(list)
    for edge in edges:
        grouped[edge["from"]].append(edge)
    return grouped


def main() -> None:
    base = Path(__file__).resolve().parent
    west_file = base / "west.csv"
    east_file = base / "east.csv"
    out_file = base / "edges_from.json"

    west_edges = read_timetable(west_file, direction="上行")
    east_edges = read_timetable(east_file, direction="下行")

    all_edges = west_edges + east_edges
    edges_from = group_by_origin(all_edges)

    payload = {
        "edges": all_edges,
        "edges_from": edges_from,
    }
    out_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(all_edges)} edges to {out_file}")


if __name__ == "__main__":
    main()
