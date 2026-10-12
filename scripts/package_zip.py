import os
import sys
import zipfile
from pathlib import Path

# Source project directory
SOURCE_DIR = Path(r"c:\Users\ashwini\Downloads\NurtureHer\NurtureHer").resolve()
# Target ZIP file destination
DEST_ZIP = Path(r"c:\Users\ashwini\Downloads\NurtureHer\NurtureHer_AI_Final_Delivery.zip").resolve()

# Directories to exclude
EXCLUDE_DIRS = {
    "node_modules",
    "venv",
    ".venv",
    "env",
    "__pycache__",
    ".pytest_cache",
    ".vite",
    ".git",
    "dist",
    ".idea",
    ".vscode",
    "htmlcov",
}

# File extensions or specific files to exclude
EXCLUDE_EXTENSIONS = {".pyc", ".pyo", ".pyd", ".coverage"}
EXCLUDE_FILES = {".DS_Store", "Thumbs.db", ".coverage"}


def should_exclude(rel_path: Path) -> bool:
    # Check parts against EXCLUDE_DIRS
    for part in rel_path.parts:
        if part in EXCLUDE_DIRS:
            return True
    if rel_path.suffix in EXCLUDE_EXTENSIONS:
        return True
    if rel_path.name in EXCLUDE_FILES:
        return True
    return False


def create_zip():
    print(f"Packaging NurtureHer AI...")
    print(f"Source: {SOURCE_DIR}")
    print(f"Destination: {DEST_ZIP}")

    if DEST_ZIP.exists():
        DEST_ZIP.unlink()

    included_files = 0
    total_uncompressed_bytes = 0

    with zipfile.ZipFile(DEST_ZIP, "w", zipfile.ZIP_DEFLATED) as zip_out:
        for root, dirs, files in os.walk(SOURCE_DIR):
            # Prune excluded directories in-place to avoid traversing them
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for file in files:
                file_path = Path(root) / file
                rel_path = file_path.relative_to(SOURCE_DIR)

                if should_exclude(rel_path):
                    continue

                archive_arcname = Path("NurtureHer") / rel_path
                zip_out.write(file_path, arcname=str(archive_arcname))
                included_files += 1
                total_uncompressed_bytes += file_path.stat().st_size

    zip_size = DEST_ZIP.stat().st_size
    print(f"\nZIP Packaging Complete!")
    print(f"Destination: {DEST_ZIP}")
    print(f"Total files packaged: {included_files}")
    print(f"Uncompressed size: {total_uncompressed_bytes / (1024 * 1024):.2f} MB")
    print(f"Compressed ZIP size: {zip_size / (1024 * 1024):.2f} MB")
    print(f"Archive verified: {DEST_ZIP.exists()}")


if __name__ == "__main__":
    create_zip()
