"""
Safe, backward-compatible SQLite migration script for NurtureHer AI.
Adds missing columns (such as share_nutrition) to existing SQLite tables
without data loss and ensures secure, restrictive defaults.
"""

import os
import sqlite3
import sys

DEFAULT_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "nurtureher.db"))


def migrate_sqlite(db_path: str = DEFAULT_DB_PATH) -> bool:
    if not os.path.exists(db_path):
        print(f"[migrate_sqlite] Database file not found at {db_path}. Nothing to migrate.")
        return False

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    changes_made = False

    try:
        tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]

        # 1. carecircle_access: ensure share_nutrition exists with restrictive default (0 / False)
        if "carecircle_access" in tables:
            cols = [c[1] for c in cur.execute("PRAGMA table_info(carecircle_access)").fetchall()]
            if "share_nutrition" not in cols:
                print("[migrate_sqlite] Adding missing 'share_nutrition' column to carecircle_access...")
                cur.execute("ALTER TABLE carecircle_access ADD COLUMN share_nutrition BOOLEAN NOT NULL DEFAULT 0")
                # Explicitly ensure existing rows have 0 (False)
                cur.execute("UPDATE carecircle_access SET share_nutrition = 0 WHERE share_nutrition IS NULL")
                changes_made = True
                print("[migrate_sqlite] Added 'share_nutrition' column with secure default 0 (no consent).")
            else:
                print("[migrate_sqlite] Column 'share_nutrition' already present in carecircle_access.")

            if "share_chat_history" not in cols:
                print("[migrate_sqlite] Adding missing 'share_chat_history' column to carecircle_access...")
                cur.execute("ALTER TABLE carecircle_access ADD COLUMN share_chat_history BOOLEAN NOT NULL DEFAULT 0")
                # Explicitly ensure existing rows have 0 (False)
                cur.execute("UPDATE carecircle_access SET share_chat_history = 0 WHERE share_chat_history IS NULL")
                changes_made = True
                print("[migrate_sqlite] Added 'share_chat_history' column with secure default 0 (no consent).")
            else:
                print("[migrate_sqlite] Column 'share_chat_history' already present in carecircle_access.")

        # 2. nutrition_care_plans: ensure archived_by_id and archived_at exist
        if "nutrition_care_plans" in tables:
            cols = [c[1] for c in cur.execute("PRAGMA table_info(nutrition_care_plans)").fetchall()]
            if "archived_by_id" not in cols:
                print("[migrate_sqlite] Adding missing 'archived_by_id' column to nutrition_care_plans...")
                cur.execute("ALTER TABLE nutrition_care_plans ADD COLUMN archived_by_id UUID NULL")
                changes_made = True
            if "archived_at" not in cols:
                print("[migrate_sqlite] Adding missing 'archived_at' column to nutrition_care_plans...")
                cur.execute("ALTER TABLE nutrition_care_plans ADD COLUMN archived_at DATETIME NULL")
                changes_made = True

        conn.commit()
        print(f"[migrate_sqlite] Migration completed successfully on {db_path}.")
        return changes_made
    except Exception as exc:
        conn.rollback()
        print(f"[migrate_sqlite] Migration failed: {exc}", file=sys.stderr)
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB_PATH
    migrate_sqlite(target)
