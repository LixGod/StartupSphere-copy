import os
import re
import sys

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Fix useState([]) -> useState<any[]>([])
    content = re.sub(r'useState\(\[\]\)', 'useState<any[]>([])', content)
    # Fix useState(null) -> useState<any>(null)
    content = re.sub(r'useState\(null\)', 'useState<any>(null)', content)

    # We need to fix function(e) -> function(e: any)
    # But it's hard to do this with regex perfectly without breaking things.
    
    with open(filepath, 'w') as f:
        f.write(content)

for root, _, files in os.walk('components/founder-crm'):
    for file in files:
        if file.endswith('.tsx'):
            fix_file(os.path.join(root, file))

