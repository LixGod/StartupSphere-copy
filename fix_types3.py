import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # match single parameter without parens: `l =>` -> `(l: any) =>`
    # exclude if it's already got parens or types.
    content = re.sub(r'(?<!\()([a-zA-Z0-9_]+)\s*=>', r'(\1: any) =>', content)
    
    with open(filepath, 'w') as f:
        f.write(content)

for root, _, files in os.walk('components/founder-crm'):
    for file in files:
        if file.endswith('.tsx'):
            fix_file(os.path.join(root, file))
