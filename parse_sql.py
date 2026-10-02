import os
import re

sql_dir = 'scripts'
tables = {}
for root, _, files in os.walk(sql_dir):
    for file in files:
        if file.endswith('.sql'):
            with open(os.path.join(root, file), 'r') as f:
                content = f.read()
                # Find CREATE TABLE
                matches = re.findall(r'CREATE TABLE (?:IF NOT EXISTS )?([a-zA-Z0-9_]+)', content)
                for match in matches:
                    tables[match] = True

for table in tables:
    print(f"| {table} | Purpose | owner_id | Yes | Owner/Employee |")
