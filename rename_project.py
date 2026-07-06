import os

replacements = {
    "Anvaya": "Anvaya",
    "Anvaya": "Anvaya",
    "anvaya": "anvaya",
    "Anvaya": "Anvaya"
}

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = content
        for old_str, new_str in replacements.items():
            new_content = new_content.replace(old_str, new_str)
            
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filepath}")
    except Exception:
        # Skip binary files like models, images, etc.
        pass

if __name__ == "__main__":
    print("Replacing project name across codebase...")
    for root, dirs, files in os.walk("."):
        if any(ignored in root for ignored in [".git", "node_modules", "__pycache__", ".vscode"]):
            continue
        for file in files:
            if file.endswith(('.pt', '.png', '.jpg', '.jpeg', '.pyc', '.mp4', '.json-lock')):
                continue
            replace_in_file(os.path.join(root, file))
    print("Done!")
