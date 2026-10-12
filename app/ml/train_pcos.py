import argparse
import pickle
from pathlib import Path

from app.ml.preprocess_pcos import load_training_csv


def train_random_forest(input_csv: str, output_model: str, n_estimators: int = 200, random_state: int = 42) -> None:
    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.metrics import classification_report
        from sklearn.model_selection import train_test_split
    except ImportError as exc:
        raise RuntimeError("Install scikit-learn to train the PCOS model") from exc

    features, labels = load_training_csv(input_csv)
    x_train, x_test, y_train, y_test = train_test_split(features, labels, test_size=0.2, random_state=random_state, stratify=labels)
    model = RandomForestClassifier(n_estimators=n_estimators, random_state=random_state, class_weight="balanced")
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)
    print(classification_report(y_test, predictions))

    output_path = Path(output_model)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("wb") as model_file:
        pickle.dump(model, model_file)
    print(f"Saved PCOS RandomForest model to {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train NurtureHer PCOS RandomForest model")
    parser.add_argument("--input", required=True, help="Training CSV path")
    parser.add_argument("--output", default="app/ml/artifacts/pcos_random_forest.pkl", help="Output pickle path")
    parser.add_argument("--estimators", type=int, default=200)
    args = parser.parse_args()
    train_random_forest(args.input, args.output, args.estimators)


if __name__ == "__main__":
    main()

