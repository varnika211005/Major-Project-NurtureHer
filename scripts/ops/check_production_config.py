import sys
import os
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.core.config import settings
from app.infra.config_audit import audit_production_config


def main() -> int:
    result = audit_production_config(settings)
    if result.ok:
        print("Production configuration audit passed")
        return 0
    strict = os.getenv("REQUIRE_PRODUCTION_SECRETS", "false").lower() == "true"
    for error in result.errors:
        print(f"Configuration {'error' if strict else 'warning'}: {error}", file=sys.stderr)
    return 1 if strict else 0


if __name__ == "__main__":
    raise SystemExit(main())
