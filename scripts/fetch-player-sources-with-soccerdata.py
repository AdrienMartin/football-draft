from __future__ import annotations

import json
import os
from pathlib import Path

import pandas as pd
import soccerdata as sd


ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT_DIR / "public" / "data" / "tmp"
DEFAULT_LEAGUES = [
    "ENG-Premier League",
    "ESP-La Liga",
    "ITA-Serie A",
    "GER-Bundesliga",
    "FRA-Ligue 1",
]
DEFAULT_SEASONS = [2025]


def ensure_output_dir() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def write_manifest(manifest: dict) -> None:
    manifest_path = OUTPUT_DIR / "soccerdata_manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def split_csv_env(name: str, fallback: list[str]) -> list[str]:
    raw_value = os.getenv(name)
    if not raw_value:
        return fallback

    return [part.strip() for part in raw_value.split(",") if part.strip()]


def split_int_env(name: str, fallback: list[int]) -> list[int]:
    raw_value = os.getenv(name)
    if not raw_value:
        return fallback

    return [int(part.strip()) for part in raw_value.split(",") if part.strip()]


def normalize_frame(frame: pd.DataFrame) -> pd.DataFrame:
    normalized = frame.reset_index(drop=False)
    if isinstance(normalized.columns, pd.MultiIndex):
        normalized.columns = [
            "__".join(str(part) for part in column if part not in ("", None)).strip("_")
            for column in normalized.columns.to_flat_index()
        ]
    else:
        normalized.columns = [str(column) for column in normalized.columns]

    return normalized


def save_frame(frame: pd.DataFrame, file_name: str) -> str | None:
    if frame.empty:
        return None

    output_path = OUTPUT_DIR / file_name
    frame.to_csv(output_path, index=False)
    return str(output_path.relative_to(ROOT_DIR))


def fetch_understat(leagues: list[str], seasons: list[int]) -> pd.DataFrame:
    reader = sd.Understat(leagues=leagues, seasons=seasons)
    return normalize_frame(reader.read_player_season_stats())


def main() -> None:
    ensure_output_dir()

    leagues = split_csv_env("SOCCERDATA_LEAGUES", DEFAULT_LEAGUES)
    seasons = split_int_env("SOCCERDATA_SEASONS", DEFAULT_SEASONS)

    manifest = {
        "leagues": leagues,
        "seasons": seasons,
        "selected_sources": ["understat"],
        "sources": {},
    }
    write_manifest(manifest)

    try:
        frame = fetch_understat(leagues, seasons)
        relative_path = save_frame(frame, "players_understat_soccerdata.csv")
        manifest["sources"]["understat"] = {
            "success": relative_path is not None,
            "row_count": int(len(frame.index)),
            "path": relative_path,
        }
    except Exception as error:
        manifest["sources"]["understat"] = {
            "success": False,
            "row_count": 0,
            "path": None,
            "error": str(error),
        }
    finally:
        write_manifest(manifest)

    print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
