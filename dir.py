import os
import json

def scan_directory(path, extensions):
    """
    Recursively scan the given path and return a list representing
    the directory hierarchy. Each folder is represented as a dictionary
    with "name", "type": "directory", and "children". Each file is
    represented as a dictionary with "name", "type": "file", and "content".
    """

    if "node_modules" in path:
        return []
    structure = []

    # List all items in the current directory
    for item in os.listdir(path):
        item_path = os.path.join(path, item)

        # If it's a directory, recurse into it
        if os.path.isdir(item_path):
            structure.append({
                "name": item,
                "type": "directory",
                "children": scan_directory(item_path, extensions)
            })
        else:
            # Only include files matching one of the provided extensions
            if any(item.endswith(ext) for ext in extensions):
                try:
                    # Read the file content (ignore decoding errors if any)
                    with open(item_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                except Exception as e:
                    content = f"Could not read file due to: {e}"
                
                structure.append({
                    "name": item,
                    "type": "file",
                    "content": content
                })

    return structure

def main():
    # Prompt for file extensions (comma-separated)
    exts_str = input("Enter file extensions (comma-separated, e.g.: .py, .txt): ")
    
    # Split on comma, trim spaces, and ensure each extension starts with '.'
    extensions = []
    for ext in exts_str.split(","):
        ext = ext.strip()
        if not ext:
            continue
        if not ext.startswith('.'):
            ext = '.' + ext
        extensions.append(ext)

    # If no valid extensions were provided, we can exit
    if not extensions:
        print("No valid extensions entered. Exiting.")
        return

    # Prompt for output filename
    output_filename = input("Enter the output filename (without extension): ").strip()
    if not output_filename:
        print("No output filename provided. Exiting.")
        return

    # Start scanning from the current working directory
    current_dir = os.getcwd()
    hierarchy = scan_directory(current_dir, extensions)

    # Convert the hierarchy to JSON
    hierarchy_json = json.dumps(hierarchy, indent=2)

    # Save the JSON to a .txt file
    txt_file_path = os.path.join(current_dir, f"{output_filename}.txt")
    with open(txt_file_path, "w", encoding="utf-8") as txt_file:
        txt_file.write(hierarchy_json)
    
    print(f"Hierarchy JSON saved to: {txt_file_path}")

if __name__ == "__main__":
    main()

