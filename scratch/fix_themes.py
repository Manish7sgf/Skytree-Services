import os
import re

def fix_file(file_path):
    print(f"Processing: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Define a replacement function for color: 'white' and similar
    # We want to replace color: 'white' or color: '#fff' in style attributes
    # when they are on tags like h1, h2, h3, h4, h5, h6, strong, span, div, etc.
    # except when they are inside naturally dark elements like badges or primary buttons.
    
    # We can perform targeted regular expression replacements:
    # 1. Replace style={{ color: 'white' }} or style={{ color: '#fff' }} inside h1-h5 tags
    def replace_heading_color(match):
        tag = match.group(1)
        styles = match.group(2)
        # Replace color: 'white' or color: '#fff' with color: 'var(--text-main)'
        fixed_styles = re.sub(r"color:\s*['\"](?:white|#fff|#ffffff)['\"]", "color: 'var(--text-main)'", styles)
        return f"<{tag} style={{{fixed_styles}}}"

    # Target heading tags (h1, h2, h3, h4, h5) with style={{ ... }}
    pattern = r"<([hH][1-5])\s+style=\{\{([^}]+)\}\}"
    fixed_content = re.sub(pattern, replace_heading_color, content)

    # 2. Also replace standalone style={{ ..., color: 'white', ... }} or color: '#fff' 
    # where it is clear it should be var(--text-main)
    # Let's target strong elements, and headers inside tn-police-header
    def replace_generic_color(match):
        tag = match.group(1)
        styles = match.group(2)
        fixed_styles = re.sub(r"color:\s*['\"](?:white|#fff|#ffffff)['\"]", "color: 'var(--text-main)'", styles)
        return f"<{tag} style={{{fixed_styles}}}"
        
    fixed_content = re.sub(r"<(strong|div|span)\s+style=\{\{([^}]+color:\s*['\"](?:white|#fff)['\"][^}]+)\}\}", replace_generic_color, fixed_content)

    # Let's also do a search and replace for specific static style patterns we saw in the searches:
    replacements = {
        "style={{ fontWeight: 700, color: 'white' }}": "style={{ fontWeight: 700, color: 'var(--text-main)' }}",
        "style={{ marginTop: 0, marginBottom: '12px', color: 'white' }}": "style={{ marginTop: 0, marginBottom: '12px', color: 'var(--text-main)' }}",
        "style={{ margin: '4px 0', color: 'white' }}": "style={{ margin: '4px 0', color: 'var(--text-main)' }}",
        "style={{ display: 'block', color: 'white', fontSize: '13px' }}": "style={{ display: 'block', color: 'var(--text-main)', fontSize: '13px' }}",
        "style={{ color: 'var(--text-muted)' }}>Form No: <strong style={{ color: 'white' }}": "style={{ color: 'var(--text-muted)' }}>Form No: <strong style={{ color: 'var(--text-main)' }}",
        "style={{ color: 'var(--text-muted)' }}>Applicant: <strong style={{ color: 'white' }}": "style={{ color: 'var(--text-muted)' }}>Applicant: <strong style={{ color: 'var(--text-main)' }}",
        "style={{ margin: '0 0 8px 0', color: 'white' }}": "style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}",
        "style={{ color: 'white', marginBottom: '8px' }}": "style={{ color: 'var(--text-main)', marginBottom: '8px' }}",
        "style={{ color: 'white', marginBottom: '16px' }}": "style={{ color: 'var(--text-main)', marginBottom: '16px' }}",
        "style={{ color: 'white', marginBottom: '24px'": "style={{ color: 'var(--text-main)', marginBottom: '24px'",
        "style={{ color: 'white', margin: '0 0 16px' }}": "style={{ color: 'var(--text-main)', margin: '0 0 16px' }}",
        "style={{ color: 'white', margin: '0 0 16px 0' }}": "style={{ color: 'var(--text-main)', margin: '0 0 16px 0' }}",
        "style={{ color: 'white', margin: 0, fontSize: '18px' }}": "style={{ color: 'var(--text-main)', margin: 0, fontSize: '18px' }}",
        "style={{ color: 'white', margin: 0, fontSize: '20px'": "style={{ color: 'var(--text-main)', margin: 0, fontSize: '20px'",
        "style={{ background: '#0f172a', padding: '30px', borderRadius: '16px', color: 'white', textAlign: 'center' }}": 
            "style={{ background: 'var(--bg-secondary)', padding: '30px', borderRadius: '16px', color: 'var(--text-main)', border: '1px solid var(--glass-border)', textAlign: 'center' }}"
    }

    for orig, rep in replacements.items():
        fixed_content = fixed_content.replace(orig, rep)

    if fixed_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        print(f"Successfully updated {file_path}")
    else:
        print(f"No changes made to {file_path}")

# Run replacements on components and App.tsx
fix_file("src/App.tsx")
fix_file("src/components/CertificateServiceModule.tsx")
fix_file("src/components/ResumeServiceModule.tsx")
