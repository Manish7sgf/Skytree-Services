
import re

def check_jsx_balance(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to find all <div ...> and </div>
    # Note: excluding self-closing <div ... />
    tags = re.findall(r'<(div|/div|div[^>]*[^/])>', content)
    
    stack = []
    for i, tag in enumerate(tags):
        if tag.startswith('/'):
            if not stack:
                print(f"Extra closing tag found at match index {i}")
            else:
                stack.pop()
        elif not tag.endswith('/'):
            stack.append(tag)
            
    print(f"Final stack size: {len(stack)}")
    if stack:
        print("Unclosed tags remain.")

if __name__ == "__main__":
    check_jsx_balance(r"d:\Project\Skytree\Website\src\App.tsx")
