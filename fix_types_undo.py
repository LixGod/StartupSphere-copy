import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # match broken pattern: a single letter followed by `(` and some letters and `: any) =>`
    # e.g., `p(rev: any) =>`
    content = re.sub(r'([a-zA-Z0-9_])\(([a-zA-Z0-9_]+):\s*any\)\s*=>', r'(\1\2: any) =>', content)
    
    with open(filepath, 'w') as f:
        f.write(content)

for root, _, files in os.walk('components/founder-crm'):
    for file in files:
        if file.endswith('.tsx'):
            fix_file(os.path.join(root, file))
