import os
import re

dashboard_dir = 'app/dashboard'

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original = content

    # 1. Check if the file has createClient()
    if 'createClient()' not in content:
        return

    # Replace `const supabase = createClient()` with `const supabaseRef = useRef(createClient())`
    if 'const supabase = createClient()' in content:
        content = content.replace('const supabase = createClient()', 'const supabaseRef = useRef(createClient())')
        
        # We need to replace `supabase.` with `supabaseRef.current.` globally in the component body.
        # But be careful not to replace it if it was passed as variable?
        # A simple string replace of `supabase.` to `supabaseRef.current.` and `supabase(` to `supabaseRef.current(`
        content = re.sub(r'\bsupabase\.', 'supabaseRef.current.', content)
        content = re.sub(r'\bsupabase\(', 'supabaseRef.current(', content)
        
        # Ensure useRef is imported
        if 'useRef' not in content:
            content = content.replace('useState, useEffect', 'useState, useEffect, useRef')
            content = content.replace('useEffect, useState', 'useEffect, useState, useRef')
            if 'useRef' not in content:
                content = content.replace('import { useState }', 'import { useState, useRef }')
                content = content.replace('import { useEffect }', 'import { useEffect, useRef }')

    # 2. Fix useEffect dependencies
    # Replace `[..., supabase]` or `[supabase, ...]` with just the others
    # specifically `supabase` or `supabaseRef.current`
    
    # We can just remove `supabase, ` and `, supabase` and `supabase` from dependency arrays
    content = re.sub(r'\[(.*?)supabaseRef\.current(.*?)\]', lambda m: '[' + m.group(1).replace(', ', ',').strip(',') + m.group(2) + ']', content)
    content = re.sub(r'\[(.*?)supabase(.*?)\]', lambda m: '[' + m.group(1).replace(', ', ',').strip(',') + m.group(2) + ']', content)

    # Clean up empty commas in arrays like `[ownerId, , activeBranchId]`
    content = re.sub(r'\[\s*,\s*', '[', content)
    content = re.sub(r'\s*,\s*\]', ']', content)
    content = re.sub(r',\s*,', ',', content)

    # 3. Inject `if (!ownerId) return` at the top of loadData or useEffect if they depend on ownerId
    # Actually, the user wants:
    # useEffect(() => {
    #   if (!ownerId) return
    #   loadData()
    # }, [ownerId, activeBranchId])
    # Let's just fix the activeBranchId dependency if it's missing ownerId check.
    # It might be too complex to reliably parse, so we will manually add `if (!ownerId) return` where `loadData()` is called in a useEffect.
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")


for root, _, files in os.walk(dashboard_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))

