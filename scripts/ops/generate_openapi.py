import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.main import app


def main() -> None:
    output = Path("docs/openapi.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(app.openapi(), indent=2), encoding="utf-8")
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()
