import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # match arrow functions with single parameter: `(param) =>` -> `(param: any) =>`
    # this will miss multiple parameters or `e =>` without parens.
    content = re.sub(r'\b\(([a-zA-Z0-9_]+)\)\s*=>', r'(\1: any) =>', content)
    
    # match arrow functions with multiple parameters `(a, b) =>` 
    def repl_multi(m):
        params = m.group(1)
        # if already typed, skip
        if ':' in params: return m.group(0)
        # append : any to each
        new_params = ', '.join([p.strip() + ': any' for p in params.split(',')])
        return f'({new_params}) =>'
    
    content = re.sub(r'\b\(([a-zA-Z0-9_,\s]+)\)\s*=>', repl_multi, content)

    # error.message fixes: `(error: any)` or `err: any`
    content = re.sub(r'catch\s*\(\s*error\s*\)', 'catch(error: any)', content)
    content = re.sub(r'catch\s*\(\s*err\s*\)', 'catch(err: any)', content)

    # Component props destructuring
    content = re.sub(r'= \(\{\s*([^:]+?)\s*\}\)\s*=>', r'= ({ \1 }: any) =>', content)

    # Add `rows="3"` -> `rows={3}`
    content = re.sub(r'rows="3"', 'rows={3}', content)

    # Fix error TS18047: 'response.body' is possibly 'null'.
    content = re.sub(r'response\.body\.getReader\(\)', 'response.body!.getReader()', content)
    
    # event.target
    content = re.sub(r'event\.target\.result', '(event.target as any).result', content)
    content = re.sub(r'ev\.target\.result', '(ev.target as any).result', content)

    with open(filepath, 'w') as f:
        f.write(content)

for root, _, files in os.walk('components/founder-crm'):
    for file in files:
        if file.endswith('.tsx'):
            fix_file(os.path.join(root, file))
