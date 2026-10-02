import os
import re

api_dir = 'lib/api'
files_to_check = [f for f in os.listdir(api_dir) if f.endswith('.ts')]

funcs_to_patch = [
    'getOrders', 'getInvoices', 'getExpenses', 'getContacts', 'getDeals', 'getLeads',
    'getSupportTickets', 'getWorkflows', 'getConversations', 'getSmartAlerts',
    'getAIInsights', 'getPerformanceForecasts', 'getBulkOrders', 'getWholesaleTiers',
    'getClientPortals', 'getLoyaltyProgram', 'getProducts'
]

for file in files_to_check:
    filepath = os.path.join(api_dir, file)
    with open(filepath, 'r') as f:
        content = f.read()
    
    modified = False
    
    for func in funcs_to_patch:
        # Match "export async function funcName(ownerId: string...)"
        # Capture everything up to the opening brace
        pattern = r"(export async function " + func + r"\s*\([^)]*\)\s*\{)"
        match = re.search(pattern, content)
        if match:
            # We found the function signature. Let's see if we need to replace it.
            # Replace signature with branchId?: string | null
            sig = match.group(1)
            new_sig = f"export async function {func}(ownerId: string, branchId?: string | null) {{"
            
            # Now we need to inject the branchId filter logic.
            # Find the query definition inside the function.
            # Usually it looks like: const { data, error } = await supabase().from('...').select('*').eq('owner_id', ownerId)...
            # Or let query = supabase().from('...').select('*').eq('owner_id', ownerId)
            
            # Since the structure might vary, let's just do a manual replacement using multi_replace_file_content instead if it's too complex.
            # Actually, let's just print the function bodies to see them.
            print(f"Found {func} in {file}")

