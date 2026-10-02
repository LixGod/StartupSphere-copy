import os
import re

dashboard_dir = 'app/dashboard'

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original = content

    # Replace any leftover `supabase` that should be `supabaseRef.current`
    # We want to match `supabase` that is followed by `.` or newline and `.`
    # e.g., `supabase\n      .channel`
    content = re.sub(r'\bsupabase(\s*\.)', r'supabaseRef.current\1', content)
    
    # Also in deps arrays: we already stripped them, but let's just make sure.

    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")


for root, _, files in os.walk(dashboard_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))
