import os
import re

api_dir = 'lib/api'
files = os.listdir(api_dir)

for file in files:
    if file.endswith('.ts'):
        with open(os.path.join(api_dir, file), 'r') as f:
            content = f.read()
            matches = re.finditer(r'export async function (get[A-Za-z0-9]+)\s*\([^)]*\)\s*\{[\s\S]*?return data \|\| \[\]\n\}', content)
            for match in matches:
                print(f"--- {match.group(1)} in {file} ---")
                print(match.group(0))
