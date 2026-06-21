from __future__ import annotations

import argparse
import csv
import json
import os
import re
import ssl
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[3]

COLUMNS = [
    "word",
    "word_type",
    "phonetic",
    "english_definition",
    "uzbek_definition",
    "english_example",
    "uzbek_example",
    "level",
    "topic",
    "collection",
    "tags",
    "collocations",
    "common_mistake",
    "writing_prompt",
    "difficulty_order",
    "audio_url",
    "quality_status",
]

REQUIRED_FIELDS = [
    "english_definition",
    "uzbek_definition",
    "english_example",
    "uzbek_example",
]

OPTIONAL_ENRICH_FIELDS = [
    "word_type",
    "phonetic",
    "collocations",
    "common_mistake",
    "writing_prompt",
]

QUALITY_STATUSES = {"draft", "review", "published", "archived"}
FIELD_LIMITS = {
    "word": 255,
    "word_type": 80,
    "phonetic": 255,
    "level": 32,
    "topic": 120,
    "collection": 160,
    "audio_url": 500,
}

SYSTEM_PROMPT = """You enrich vocabulary rows for a Telegram Mini App used by Uzbek learners of English.

Return only valid JSON that matches the requested schema. Do not use Markdown.

Quality rules:
- Write original content. Do not copy definitions or examples from source books or websites.
- English definitions must be simple, clear, and suitable for English learners.
- Uzbek definitions and translations must use natural Uzbek Latin script.
- English examples must use the target word or phrase naturally.
- Uzbek examples must translate the English example.
- For phrases, explain the whole phrase.
- For affixes, explain the meaning or function of the affix.
- For abbreviations, explain the full form if it is known.
- If IPA is uncertain, use "-".
- Collocations must be short comma-separated phrases.
- common_mistake may be empty only when no useful learner mistake exists.
- writing_prompt must be a short Uzbek instruction asking the learner to use the word.
- Preserve the source word exactly in the response.
"""


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#") or "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def clean(value: Any) -> str:
    return "" if value is None else str(value).strip()


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        headers = reader.fieldnames or []
        missing = [column for column in COLUMNS if column not in headers]
        if missing:
            raise SystemExit(f"Missing required CSV columns: {', '.join(missing)}")
        return [{column: clean(row.get(column)) for column in COLUMNS} for row in reader]


def save_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    tmp_path.replace(path)


def row_complete(row: dict[str, str]) -> bool:
    return all(clean(row.get(field)) for field in REQUIRED_FIELDS)


def needs_enrichment(row: dict[str, str]) -> bool:
    if not row_complete(row):
        return True
    return any(not clean(row.get(field)) for field in ["collocations", "writing_prompt"])


def build_prompt(batch: list[tuple[int, dict[str, str]]]) -> str:
    payload = []
    for csv_row_number, row in batch:
        payload.append(
            {
                "csv_row_number": csv_row_number,
                "word": row["word"],
                "word_type": row["word_type"] or "unknown",
                "phonetic": row["phonetic"],
                "level": row["level"] or "A1",
                "topic": row["topic"] or "General",
                "collection": row["collection"],
                "tags": row["tags"],
                "existing": {
                    field: row[field]
                    for field in REQUIRED_FIELDS + OPTIONAL_ENRICH_FIELDS
                    if row.get(field)
                },
            }
        )
    return json.dumps(
        {
            "task": "Fill missing learning fields for every row. Return one result object per input row.",
            "required_output_fields": [
                "csv_row_number",
                "word",
                "word_type",
                "phonetic",
                "english_definition",
                "uzbek_definition",
                "english_example",
                "uzbek_example",
                "collocations",
                "common_mistake",
                "writing_prompt",
            ],
            "rows": payload,
        },
        ensure_ascii=False,
    )


def gemini_schema() -> dict[str, Any]:
    row_properties = {
        "csv_row_number": {"type": "INTEGER"},
        "word": {"type": "STRING"},
        "word_type": {"type": "STRING"},
        "phonetic": {"type": "STRING"},
        "english_definition": {"type": "STRING"},
        "uzbek_definition": {"type": "STRING"},
        "english_example": {"type": "STRING"},
        "uzbek_example": {"type": "STRING"},
        "collocations": {"type": "STRING"},
        "common_mistake": {"type": "STRING"},
        "writing_prompt": {"type": "STRING"},
    }
    return {
        "type": "OBJECT",
        "properties": {
            "rows": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": row_properties,
                    "required": list(row_properties),
                },
            }
        },
        "required": ["rows"],
    }


def call_gemini(api_key: str, model: str, batch: list[tuple[int, dict[str, str]]], timeout: int) -> list[dict[str, Any]]:
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": build_prompt(batch)}]}],
        "generationConfig": {
            "temperature": 0.4,
            "responseMimeType": "application/json",
            "responseSchema": gemini_schema(),
        },
    }
    request = Request(
        endpoint,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    context = ssl.create_default_context(cafile=certifi_cafile())
    try:
        with urlopen(request, timeout=timeout, context=context) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini HTTP {exc.code}: {detail[:1000]}") from exc
    except URLError as exc:
        raise RuntimeError(f"Gemini request failed: {exc}") from exc

    payload = json.loads(raw)
    try:
        text = payload["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text)
        rows = parsed["rows"]
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Unexpected Gemini response: {raw[:1000]}") from exc
    if not isinstance(rows, list):
        raise RuntimeError("Gemini response 'rows' is not a list")
    return rows


def certifi_cafile() -> str | None:
    try:
        import certifi

        return certifi.where()
    except ImportError:
        return None


def apply_results(rows: list[dict[str, str]], batch: list[tuple[int, dict[str, str]]], results: list[dict[str, Any]]) -> int:
    by_row_number = {int(result.get("csv_row_number", -1)): result for result in results if result.get("csv_row_number") is not None}
    updated = 0
    for csv_row_number, original in batch:
        result = by_row_number.get(csv_row_number)
        if not result:
            continue
        target = rows[csv_row_number - 2]
        if clean(result.get("word")) and clean(result.get("word")) != original["word"]:
            continue

        for field in REQUIRED_FIELDS + OPTIONAL_ENRICH_FIELDS:
            value = clean(result.get(field))
            if not value:
                continue
            if field == "phonetic" and target.get("phonetic") and target["phonetic"] != "-":
                continue
            if field == "word_type" and target.get("word_type"):
                continue
            if not target.get(field):
                target[field] = value
            elif field in REQUIRED_FIELDS and not clean(target[field]):
                target[field] = value
            elif field in ["collocations", "common_mistake", "writing_prompt"] and not clean(target[field]):
                target[field] = value

        if not target["topic"]:
            target["topic"] = "General"
        target["quality_status"] = "review"
        if row_complete(target):
            updated += 1
    return updated


def validate(rows: list[dict[str, str]]) -> dict[str, Any]:
    missing_required = []
    violations = []
    for index, row in enumerate(rows, start=2):
        missing = [field for field in REQUIRED_FIELDS if not clean(row.get(field))]
        if missing:
            missing_required.append((index, row.get("word", ""), missing))
        for field, limit in FIELD_LIMITS.items():
            value = clean(row.get(field))
            if len(value) > limit:
                violations.append((index, field, len(value), value[:120]))
        try:
            int(float(clean(row.get("difficulty_order")) or "0"))
        except ValueError:
            violations.append((index, "difficulty_order", "not_int", row.get("difficulty_order", "")))
        if clean(row.get("quality_status")).lower() not in QUALITY_STATUSES:
            violations.append((index, "quality_status", "invalid", row.get("quality_status", "")))

    counts = {
        column: sum(1 for row in rows if clean(row.get(column)))
        for column in COLUMNS
    }
    return {
        "total_rows": len(rows),
        "counts": counts,
        "complete_rows": sum(1 for row in rows if row_complete(row)),
        "missing_required": missing_required,
        "violations": violations,
    }


def print_validation(summary: dict[str, Any]) -> None:
    print("\nValidation")
    print(f"Rows: {summary['total_rows']}")
    print(f"Complete required fields: {summary['complete_rows']}/{summary['total_rows']}")
    for field in REQUIRED_FIELDS + ["collocations", "common_mistake", "writing_prompt", "phonetic", "word_type"]:
        print(f"{field}: {summary['counts'].get(field, 0)}/{summary['total_rows']}")
    print(f"Missing required rows: {len(summary['missing_required'])}")
    if summary["missing_required"]:
        print(f"First missing: {summary['missing_required'][:10]}")
    print(f"Constraint violations: {len(summary['violations'])}")
    if summary["violations"]:
        print(f"First violations: {summary['violations'][:10]}")


def retry_delay(error: Exception, fallback: float) -> float:
    match = re.search(r"retry in ([0-9]+(?:\.[0-9]+)?)s", str(error), flags=re.IGNORECASE)
    if match:
        return float(match.group(1)) + 5
    return fallback


def select_batch(rows: list[dict[str, str]], start_row: int, end_row: int | None, batch_size: int) -> list[tuple[int, dict[str, str]]]:
    selected = []
    for index, row in enumerate(rows, start=2):
        if index < start_row:
            continue
        if end_row is not None and index > end_row:
            continue
        if needs_enrichment(row):
            selected.append((index, row))
        if len(selected) >= batch_size:
            break
    return selected


def enrich(args: argparse.Namespace) -> None:
    load_dotenv(ROOT / ".env")
    load_dotenv(ROOT / "backend" / ".env")

    input_path = Path(args.input)
    output_path = Path(args.output or args.input)
    rows = load_csv(input_path)

    if args.validate_only:
        print_validation(validate(rows))
        return

    api_key = args.gemini_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise SystemExit("Missing GEMINI_API_KEY. Add it to .env or pass --gemini-key.")

    save_csv(output_path, rows)
    total_updated = 0
    processed_batches = 0
    consecutive_failures = 0
    started = time.time()

    while True:
        summary = validate(rows)
        if not summary["missing_required"] and not summary["violations"]:
            print_validation(summary)
            print(f"\nReady: {output_path}")
            return

        batch = select_batch(rows, args.start_row, args.end_row, args.batch_size)
        if not batch:
            print_validation(summary)
            raise SystemExit("No eligible rows left in the selected range, but validation is not complete.")

        print(
            f"\nBatch rows {batch[0][0]}-{batch[-1][0]} "
            f"({len(batch)} rows), complete {summary['complete_rows']}/{summary['total_rows']}"
        )

        last_error = None
        results = None
        for attempt in range(1, args.retries + 1):
            try:
                results = call_gemini(api_key, args.model, batch, args.timeout)
                break
            except RuntimeError as exc:
                last_error = exc
                wait = retry_delay(exc, min(args.retry_wait * attempt, 30))
                print(f"Attempt {attempt}/{args.retries} failed: {exc}")
                print(f"Waiting {wait:.1f}s before retry.")
                time.sleep(wait)

        if results is None:
            consecutive_failures += 1
            if consecutive_failures >= 3:
                raise SystemExit(f"Stopping after repeated failures. Last error: {last_error}")
            args.batch_size = max(5, args.batch_size // 2)
            print(f"Reducing batch size to {args.batch_size}")
            continue

        updated = apply_results(rows, batch, results)
        total_updated += updated
        processed_batches += 1
        consecutive_failures = 0
        save_csv(output_path, rows)
        rows = load_csv(output_path)
        print(f"Updated complete rows in batch: {updated}/{len(batch)}. Saved checkpoint.")
        if args.request_pause:
            time.sleep(args.request_pause)

        if args.max_batches and processed_batches >= args.max_batches:
            break

    elapsed = time.time() - started
    print_validation(validate(rows))
    print(f"\nStopped after {elapsed:.1f}s. Updated rows this run: {total_updated}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch-enrich vocabulary CSV rows with Gemini.")
    parser.add_argument("-i", "--input", default="combined_vocabulary_sources_A1_C1_C2_enriched.csv")
    parser.add_argument("-o", "--output", default="combined_vocabulary_sources_A1_C1_C2_enriched.csv")
    parser.add_argument("--gemini-key")
    parser.add_argument("--model", default="gemini-2.5-flash")
    parser.add_argument("--batch-size", type=int, default=50)
    parser.add_argument("--start-row", type=int, default=2, help="CSV row number, including header row as 1.")
    parser.add_argument("--end-row", type=int)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--retry-wait", type=float, default=3.0)
    parser.add_argument("--request-pause", type=float, default=4.0)
    parser.add_argument("--timeout", type=int, default=120)
    parser.add_argument("--max-batches", type=int, help="Optional safety cap for a short test run.")
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    enrich(args)


if __name__ == "__main__":
    main()
