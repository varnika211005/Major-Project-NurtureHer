import csv
from pathlib import Path

from app.ml.preprocessing import FEATURE_ORDER


def parse_bool(value: str) -> float:
    return 1.0 if value.strip().lower() in {"1", "true", "yes", "y"} else 0.0


def load_training_csv(path: str | Path, label_column: str = "pcos") -> tuple[list[list[float]], list[int]]:
    """Load a nine-feature PCOS training CSV matching the live schema.

    Expected columns: age, bmi, cycle (2 or 4), cycle_length,
    weight_gain, hair_growth, skin_darkening, hair_loss, pimples.
    Boolean-like columns accept 1/true/yes/y (case-insensitive).
    """
    dataset_path = Path(path)
    features: list[list[float]] = []
    labels: list[int] = []
    with dataset_path.open(newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            features.append(
                [
                    float(row["age"]),
                    float(row["bmi"]),
                    float(row["cycle"]),
                    float(row["cycle_length"]),
                    parse_bool(row["weight_gain"]),
                    parse_bool(row["hair_growth"]),
                    parse_bool(row["skin_darkening"]),
                    parse_bool(row["hair_loss"]),
                    parse_bool(row["pimples"]),
                ]
            )
            labels.append(int(row[label_column]))
    return features, labels


def feature_names() -> list[str]:
    return list(FEATURE_ORDER)
