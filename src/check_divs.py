
import re

def check_jsx_balance(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    stack = []
    issues = []
    
    # Regex for opening and closing tags (simplified for divs)
    # <div ... > or <div > or <div>
    # </div>
    # Note: Handles self-closing <div ... /> (not standard but possible)
    
    open_pattern = re.compile(r'<\s*div[^>]*>')
    close_pattern = re.compile(r'<\s*/\s*div\s*>')
    self_close_pattern = re.compile(r'<\s*div[^>]*/>')

    for i, line in enumerate(lines):
        line_num = i + 1
        
        # Self-closing divs are neutral
        self_closes = self_close_pattern.findall(line)
        cleaned_line = self_close_pattern.sub('', line)
        
        openings = open_pattern.findall(cleaned_line)
        closings = close_pattern.findall(cleaned_line)
        
        for _ in openings:
            stack.append(line_num)
        
        for _ in closings:
            if not stack:
                issues.append(f"Unmatched closing </div> at line {line_num}")
            else:
                stack.pop()

    for line_num in reversed(stack):
        issues.append(f"Unclosed <div> starting at line {line_num}")
        
    return issues

if __name__ == "__main__":
    file_to_check = r"d:\Project\Skytree\Website\src\App.tsx"
    results = check_jsx_balance(file_to_check)
    if not results:
        print("All <div> tags appear balanced.")
    else:
        for issue in results:
            print(issue)
