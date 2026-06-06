import os
import re

def restore_braces(file_path):
    print(f"Restoring braces in: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find style={ ... } where the inside is a style object (contains colons, no question marks, no curly braces)
    def replacer(match):
        inside = match.group(1)
        # If it already starts with '{' or contains ternary '?' or is dynamic variable, do not change
        if inside.strip().startswith('{') or '?' in inside:
            return match.group(0)
        # Otherwise, wrap it in double curly braces
        return f"style={{{{{inside}}}}}"

    # Pattern to match style={ <anything> }
    # We want to match style={ content } where content doesn't start with {
    pattern = r"style=\{\s*([^{?]+)\s*\}"
    fixed_content = re.sub(pattern, replacer, content)

    if fixed_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        print(f"Successfully restored {file_path}")
    else:
        print(f"No changes made to {file_path}")

restore_braces("src/App.tsx")
restore_braces("src/components/CertificateServiceModule.tsx")
restore_braces("src/components/ResumeServiceModule.tsx")
