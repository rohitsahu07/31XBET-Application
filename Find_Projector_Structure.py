import os

# ✅ Include only these main folders
ALLOWED_FOLDERS = ["backend", "frontend"]

# 🚫 Exclude these folders and files
EXCLUDED_NAMES = {
    "__pycache__", "node_modules", "build", ".git", ".idea", ".vscode",
    "env", "venv", "dist", ".mypy_cache", ".pytest_cache", "migrations",
    ".DS_Store"
}

def generate_tree(start_path, prefix=""):
    """Recursively print a clean folder tree excluding unwanted directories."""
    try:
        entries = sorted(
            [e for e in os.listdir(start_path) if e not in EXCLUDED_NAMES]
        )
    except PermissionError:
        return

    entries_count = len(entries)

    for index, entry in enumerate(entries):
        path = os.path.join(start_path, entry)
        connector = "└── " if index == entries_count - 1 else "├── "
        print(prefix + connector + entry)

        if os.path.isdir(path):
            extension = "    " if index == entries_count - 1 else "│   "
            generate_tree(path, prefix + extension)


if __name__ == "__main__":
    cwd = os.getcwd()
    print("📂 Project Tree (backend & frontend only, cleaned):\n")

    for folder in ALLOWED_FOLDERS:
        folder_path = os.path.join(cwd, folder)
        if os.path.exists(folder_path):
            print(f"├── {folder}/")
            generate_tree(folder_path, "│   ")
