import os
import re

api_dir = 'lib/api'
files = [f for f in os.listdir(api_dir) if f.endswith('.ts')]

targets = [
    'getOrders', 'getInvoices', 'getExpenses', 'getContacts', 'getDeals', 'getLeads',
    'getSupportTickets', 'getWorkflows', 'getConversations', 'getSmartAlerts',
    'getAIInsights', 'getPerformanceForecasts', 'getBulkOrders', 'getWholesaleTiers',
    'getClientPortals', 'getLoyaltyProgram', 'getProducts'
]

for filename in files:
    filepath = os.path.join(api_dir, filename)
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content
    
    for func in targets:
        # Match function definition until the end of the block
        pattern = r"export async function " + func + r"\s*\([^)]*\)\s*\{([\s\S]*?)return\s+data\s*\|\|\s*\[\]\s*\n\}"
        match = re.search(pattern, content)
        if match:
            inner = match.group(1)
            # find table name
            table_match = re.search(r"\.from\(['\"]([^'\"]+)['\"]\)", inner)
            if table_match:
                table = table_match.group(1)
                
                # Check if it has limit
                limit_match = re.search(r"limit\s*=\s*(\d+)", content[match.start():match.end()])
                limit_param = f", limit = {limit_match.group(1)}" if limit_match else ""
                limit_code = f"\n  if (limit) {{\n    query = query.limit(limit)\n  }}" if limit_match else ""
                
                order = ".order('created_at', { ascending: false })"
                
                new_func = f"""export async function {func}(ownerId: string, branchId?: string | null{limit_param}) {{
  let query = supabase()
    .from('{table}')
    .select('*')
    .eq('owner_id', ownerId)
    {order}

  if (branchId) {{
    query = query.eq('location_id', branchId)
  }}{limit_code}

  const {{ data, error }} = await query
  if (error) throw error
  return data || []
}}"""
                content = content[:match.start()] + new_func + content[match.end():]
                print(f"Updated {func} in {filename}")

    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
