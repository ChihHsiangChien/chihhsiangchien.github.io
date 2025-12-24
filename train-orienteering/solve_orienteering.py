from __future__ import annotations

import argparse
import json
from collections import defaultdict
from dataclasses import dataclass
from heapq import heappop, heappush
from pathlib import Path
from typing import Dict, List, Optional, Tuple


def parse_hhmm(s: str) -> int:
    h, m = s.strip().split(":")
    return int(h) * 60 + int(m)


def fmt_hhmm(t: int) -> str:
    h = (t // 60) % 24
    m = t % 60
    return f"{h}:{m:02d}"


def fmt_wait(minutes: int) -> str:
    return f"stay {minutes} min" if minutes >= 0 else "stay N/A"


def pad(name: str, width: int = 4) -> str:
    """Pad station names for aligned printing (monospace assumption)."""
    return name.ljust(width)


@dataclass(frozen=True)
class Edge:
    train: str
    origin: str
    dest: str
    dep: int
    arr: int
    direction: str


def load_edges(json_path: Path) -> Tuple[Dict[str, List[Edge]], List[str]]:
    data = json.loads(json_path.read_text(encoding="utf-8"))
    edges: List[Edge] = []
    stations_set = set()
    for e in data["edges"]:
        dep = e["dep"].strip()
        arr = e["arr"].strip()
        # ignore malformed rows
        if not dep or not arr or ":" not in dep or ":" not in arr:
            continue
        edge = Edge(
            train=str(e["train"]),
            origin=e["from"],
            dest=e["to"],
            dep=parse_hhmm(dep),
            arr=parse_hhmm(arr),
            direction=e.get("direction", ""),
        )
        stations_set.add(edge.origin)
        stations_set.add(edge.dest)
        edges.append(edge)

    edges_by_from: Dict[str, List[Edge]] = defaultdict(list)
    for e in edges:
        edges_by_from[e.origin].append(e)
    for lst in edges_by_from.values():
        lst.sort(key=lambda x: x.dep)

    stations = sorted(stations_set)
    return edges_by_from, stations


def earliest_arrival_with_choice(
    edges_by_from: Dict[str, List[Edge]],
    src: str,
    start_time: int,
    dst: str,
    dwell: int,
) -> Optional[Tuple[int, Optional[Edge]]]:
    # time-dependent earliest arrival using event times; first leg has no dwell requirement
    INF = 10**9
    best: Dict[str, int] = defaultdict(lambda: INF)
    pq: List[Tuple[int, str, bool, Optional[Edge]]] = []  # (time, station, is_first, first_edge)
    best[src] = start_time
    heappush(pq, (start_time, src, True, None))
    while pq:
        t, u, first, first_edge = heappop(pq)
        if t > best[u]:
            continue
        if u == dst:
            return t, first_edge
        ready = t if first else t + dwell
        for e in edges_by_from.get(u, []):
            if e.dep < ready:
                continue
            nt = e.arr
            if nt < best[e.dest]:
                best[e.dest] = nt
                heappush(pq, (nt, e.dest, False, e if first else first_edge))
    return None


def earliest_arrival(
    edges_by_from: Dict[str, List[Edge]],
    src: str,
    start_time: int,
    dst: str,
    dwell: int,
) -> Optional[int]:
    r = earliest_arrival_with_choice(edges_by_from, src, start_time, dst, dwell)
    return None if r is None else r[0]


def solve(
    edges_by_from: Dict[str, List[Edge]],
    stations: List[str],
    start_station: str,
    end_station: str,
    start_time: int,
    end_time: int,
    dwell: int,
    must: List[str],
    allowed: Optional[List[str]] = None,
):
    idx = {s: i for i, s in enumerate(stations)}
    start_idx = idx[start_station]
    end_idx = idx[end_station]

    best_count = 0
    best_path: List[Edge] = []
    found = False

    # Build masks
    must_mask = 0
    for s in must:
        must_mask |= 1 << idx[s]
    # When using exclude semantics externally, compute allowed_set here from all stations,
    # then remove excluded later by reading args in main. Since we pass allowed=None from main,
    # default to all stations and rely on 'allowed' only when explicitly provided.
    if allowed is None or len(allowed) == 0:
        allowed_set = set(stations)
    else:
        allowed_set = set(allowed) | {start_station} | set(must)
    allowed_mask = 0
    for s in allowed_set:
        allowed_mask |= 1 << idx[s]

    # memo for return feasibility to end, round time to 5 minutes to reduce states
    return_cache: Dict[Tuple[str, int], Optional[int]] = {}

    def can_return(st: str, t: int) -> Optional[int]:
        key = (st, (t // 5) * 5)
        if key not in return_cache:
            return_cache[key] = earliest_arrival(edges_by_from, st, t, end_station, dwell)
        return return_cache[key]

    def dfs(cur: str, t: int, visited_mask: int, path: List[Edge], arrived: bool):
        nonlocal best_count, best_path, found
        # Option to close trip now: check earliest return
        ea = can_return(cur, t + (dwell if arrived else 0))
        if ea is not None and ea <= end_time and (visited_mask & must_mask) == must_mask:
            visited_cnt = bin(visited_mask & allowed_mask).count("1")
            if visited_cnt > best_count:
                best_count = visited_cnt
                best_path = path.copy()
                found = True

        # Explore next moves
        ready = t if not arrived else t + dwell
        for e in edges_by_from.get(cur, []):
            if e.dep < ready:
                continue
            if e.arr > end_time:
                continue
            v = e.dest
            v_idx = idx[v]
            if v not in allowed_set:
                continue
            if v_idx == end_idx and visited_mask & (1 << end_idx):
                # allow returning to end only for trip closure handled above
                pass
            if visited_mask & (1 << v_idx):
                continue
            # prune if we can't get back after taking this edge
            ea2 = can_return(v, e.arr + dwell)
            if ea2 is None or ea2 > end_time:
                continue
            path.append(e)
            dfs(v, e.arr, visited_mask | (1 << v_idx), path, True)
            path.pop()

    initial_mask = 1 << start_idx  # start station considered visited
    dfs(start_station, start_time, initial_mask, [], False)
    return (best_count, best_path, found)


def main():
    parser = argparse.ArgumentParser(description="Solve time-window Orienteering using timetable edges.")
    parser.add_argument("--json", type=Path, default=Path(__file__).with_name("edges_from.json"))
    parser.add_argument("--start", type=str, default="榮華")
    parser.add_argument("--end", type=str, default=None, help="End station (defaults to start)")
    parser.add_argument("--start-time", type=str, required=True, help="HH:MM")
    parser.add_argument("--end-time", type=str, required=True, help="HH:MM")
    parser.add_argument("--dwell", type=int, default=1, help="Minimum dwell minutes between trains")
    parser.add_argument("--must", type=str, default="", help="Comma-separated stations that must be visited")
    # Exclude list (primary flag). 'optional' is hidden alias for backward compatibility.
    parser.add_argument("--exclude", type=str, default="", help="Comma-separated stations to exclude (do not visit). Start and must are always allowed.")
    parser.add_argument("--optional", dest="exclude", help=argparse.SUPPRESS)
    args = parser.parse_args()

    edges_by_from, stations = load_edges(args.json)

    station_width = max(len(s) for s in stations) + 1

    start_time = parse_hhmm(args.start_time)
    end_time = parse_hhmm(args.end_time)

    if args.start not in stations:
        raise SystemExit(f"Start station '{args.start}' not found in timetable stations: {stations}")
    end_station = args.end or args.start
    if end_station not in stations:
        raise SystemExit(f"End station '{end_station}' not found in timetable stations: {stations}")

    def parse_list(s: str) -> List[str]:
        items = [x.strip() for x in s.split(",") if x.strip()]
        return items

    must_list = parse_list(args.must)
    exclude_list = parse_list(args.exclude)

    for s in must_list + exclude_list + [args.start, end_station]:
        if s not in stations:
            raise SystemExit(f"Station '{s}' not in known stations: {stations}")

    # Build allowed set from exclusions: allow all except excluded; always allow start and must
    if exclude_list:
        allowed_set_arg = list((set(stations) - set(exclude_list)) | {args.start, end_station} | set(must_list))
    else:
        allowed_set_arg = None

    best_count, best_path, found = solve(
        edges_by_from,
        stations,
        args.start,
        end_station,
        start_time,
        end_time,
        args.dwell,
        must_list,
        allowed_set_arg,
    )

    if not found and must_list:
        print("No feasible route covering all must-visit stations within the time window.")
        return

    # Pre-compute return info for slack after the last leg (respect dwell before boarding return)
    ret_info = earliest_arrival_with_choice(
        edges_by_from, args.start, start_time + args.dwell, end_station, args.dwell
    )
    # Recompute based on final state if path exists
    if best_path:
        last = best_path[-1]
        ret_info = earliest_arrival_with_choice(
            edges_by_from, last.dest, last.arr + args.dwell, end_station, args.dwell
        )

    print(f"Best stations visited (including start): {best_count}")
    cur = args.start
    cur_t = start_time
    for i, e in enumerate(best_path):
        # Slack after arriving at this edge's destination until the next departure
        next_dep: Optional[int] = None
        if i + 1 < len(best_path):
            next_dep = best_path[i + 1].dep
        elif ret_info is not None and ret_info[1] is not None:
            next_dep = ret_info[1].dep
        stay = max(0, next_dep - e.arr) if next_dep is not None else None
        stay_txt = fmt_wait(stay) if stay is not None else "stay N/A"
        print(
            f"{pad(cur, station_width)} {fmt_hhmm(cur_t):>5} -> [{e.train}] {pad(e.origin, station_width)} {fmt_hhmm(e.dep):>5} -> {pad(e.dest, station_width)} {fmt_hhmm(e.arr):>5} | {stay_txt:>12} at {e.dest}"
        )
        cur = e.dest
        cur_t = e.arr
    # show return feasibility and time
    # dwell applies after the last arrival before catching a return train
    if ret_info is not None:
        ret_arr, first_edge = ret_info
        if first_edge is not None:
            # Final return leg: we already showed slack on the previous line, so omit stay display here
            print(
                f"{pad(cur, station_width)} {fmt_hhmm(cur_t):>5} -> [{first_edge.train}] {pad(first_edge.origin, station_width)} {fmt_hhmm(first_edge.dep):>5} -> {pad(first_edge.dest, station_width)} {fmt_hhmm(first_edge.arr):>5}"
            )
            print(f"Arrive {end_station} {fmt_hhmm(ret_arr)} (deadline {fmt_hhmm(end_time)})")
        else:
            print(f"Arrive {end_station} {fmt_hhmm(ret_arr)} (deadline {fmt_hhmm(end_time)})")


if __name__ == "__main__":
    main()
