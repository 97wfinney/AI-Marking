#!/usr/bin/env python3
"""
mark_and_feedback.py  -  GCSE Physics marker
--------------------------------------------------
Adds a score **and** detailed feedback to the CSV (no PDF).
Now guarantees the numeric score is written to the chosen *score* column and
feedback to the *feedback* column, even if those columns already exist.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import time
from typing import List

import pandas as pd
from openai import OpenAI

# -----------------------------------------------------------------------------
# Utility helpers
# -----------------------------------------------------------------------------

def api_key() -> str:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        print("OPENAI_API_KEY not set", file=sys.stderr)
        sys.exit(1)
    return key


def read(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def extract_score(line: str) -> float | None:
    """Return the numeric part of a line like 'Score: 87/100'."""
    m = re.search(r"Score:\s*([0-9]+(?:\.[0-9]+)?)(?:/\d+)?", line)
    return float(m.group(1)) if m else None


# -----------------------------------------------------------------------------
# Core marking routine
# -----------------------------------------------------------------------------

def grade(
    df: pd.DataFrame,
    rubric: str,
    model: str,
    name_col: str,
    ans_col: str,
    delay: float,
    client: OpenAI,
) -> tuple[List[float | None], List[str]]:
    """Return lists: scores, feedbacks (same length as *df*)."""

    name_instr = (
        'At the beginning of your response, include the line '\
        '"CORRECTED_NAME: <first name capitalised>".'
    )

    fmt_instr = (
        "Reply in plain text with:\n"
        "Score: <number>/100\n\n"
        "<6–8 short paragraphs of feedback addressing the student by first name>."
    )

    sys_prompt = f"{name_instr}\n\n{rubric}\n\n{fmt_instr}"

    scores: List[float | None] = []
    feedbacks: List[str] = []

    total = len(df)
    print(f"Grading {total} submissions with model '{model}'…")

    for i, row in df.iterrows():
        name = row[name_col]
        ans = row[ans_col]
        print(f" [{i + 1:>3}/{total}] {name}", end="", flush=True)

        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": f"Student Name: {name}\nAnswer:\n{ans}"},
            ],
        )
        txt = resp.choices[0].message.content.strip()
        lines = [l for l in txt.splitlines() if l.strip()]

        # Remove CORRECTED_NAME if present
        if lines and lines[0].startswith("CORRECTED_NAME:"):
            lines.pop(0)

        if not lines:
            raise ValueError("Model response missing content")

        score_val = extract_score(lines[0])
        if score_val is None:
            print("  ⚠️  score missing", flush=True)
        else:
            print(f"  ✓ {score_val}/100", flush=True)
        feedback_text = "\n".join(lines[1:]).strip()

        scores.append(score_val)
        feedbacks.append(feedback_text)
        time.sleep(delay)

    return scores, feedbacks


# -----------------------------------------------------------------------------
# CLI
# -----------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Mark GCSE Physics answers and write mark + feedback to CSV")
    ap.add_argument("csv_file")
    ap.add_argument("--general", default="general.txt")
    ap.add_argument("--model", default="gpt-4o-mini")
    ap.add_argument("--delay", type=float, default=1.0)
    ap.add_argument("--name-column", default="name")
    ap.add_argument("--answer-column", default="student_answer")
    ap.add_argument("--score-column", default="score")
    ap.add_argument("--feedback-column", default="feedback")
    args = ap.parse_args()

    df = pd.read_csv(args.csv_file)

    # Ensure columns exist regardless of prior state
    for col in (args.score_column, args.feedback_column):
        if col not in df.columns:
            df[col] = None

    client = OpenAI(api_key=api_key())
    rubric = read(args.general)

    scores, feedbacks = grade(
        df,
        rubric,
        args.model,
        args.name_column,
        args.answer_column,
        args.delay,
        client,
    )

    df.loc[:, args.score_column] = scores
    df.loc[:, args.feedback_column] = feedbacks

    df.to_csv(args.csv_file, index=False)
    print("\nDone! CSV updated.")


if __name__ == "__main__":
    main()
