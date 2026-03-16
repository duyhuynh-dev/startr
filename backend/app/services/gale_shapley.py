"""
Gale-Shapley stable matching for investor–founder pairs.

Proposers (e.g. investors) propose to receivers (e.g. founders);
receivers accept or reject. Output is a stable matching (no blocking pair).
Preference lists: list of IDs in order of preference (most preferred first).
"""

from __future__ import annotations

from typing import Callable, Dict, List


def gale_shapley(
    proposer_prefs: Dict[str, List[str]],
    receiver_prefs: Dict[str, List[str]],
) -> Dict[str, str]:
    """
    Run Gale-Shapley with proposers proposing.
    Returns mapping: proposer_id -> receiver_id (each receiver at most one proposer).
    """
    # receiver_prefs: for each receiver, list of proposer ids best-first
    # Build reverse index: receiver_prefs[r][i] = p => receiver r ranks proposer p at position i
    receiver_rank: Dict[str, Dict[str, int]] = {}
    for r, prefs in receiver_prefs.items():
        receiver_rank[r] = {p: i for i, p in enumerate(prefs)}

    # Current assignment: receiver -> proposer
    assigned: Dict[str, str] = {}
    # Queue of proposers that haven't been accepted by everyone they've proposed to
    # Each proposer's next index to try
    next_proposal_index: Dict[str, int] = {p: 0 for p in proposer_prefs}

    def get_next_receiver(proposer: str) -> str | None:
        idx = next_proposal_index[proposer]
        prefs = proposer_prefs.get(proposer, [])
        if idx >= len(prefs):
            return None
        return prefs[idx]

    # Free proposers
    free = list(proposer_prefs.keys())

    while free:
        proposer = free.pop()
        receiver = get_next_receiver(proposer)
        if receiver is None:
            continue
        next_proposal_index[proposer] += 1

        if receiver not in assigned:
            assigned[receiver] = proposer
        else:
            other = assigned[receiver]
            rank_r = receiver_rank.get(receiver, {})
            if rank_r.get(proposer, float("inf")) < rank_r.get(other, float("inf")):
                assigned[receiver] = proposer
                free.append(other)
            else:
                free.append(proposer)

    # Return proposer -> receiver
    return {p: r for r, p in assigned.items()}


def build_prefs_from_scores(
    proposer_ids: List[str],
    receiver_ids: List[str],
    score_fn: Callable[[str, str], float],
) -> tuple[Dict[str, List[str]], Dict[str, List[str]]]:
    """
    Build preference lists from a score function score_fn(proposer_id, receiver_id) -> float.
    Higher score = more preferred. Returns (proposer_prefs, receiver_prefs).
    """
    proposer_prefs: Dict[str, List[str]] = {}
    for p in proposer_ids:
        scored = [(r, score_fn(p, r)) for r in receiver_ids]
        scored.sort(key=lambda x: (-x[1], x[0]))
        proposer_prefs[p] = [r for r, _ in scored]

    receiver_prefs: Dict[str, List[str]] = {}
    for r in receiver_ids:
        scored = [(p, score_fn(p, r)) for p in proposer_ids]
        scored.sort(key=lambda x: (-x[1], x[0]))
        receiver_prefs[r] = [p for p, _ in scored]

    return proposer_prefs, receiver_prefs
