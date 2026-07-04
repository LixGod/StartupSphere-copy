"""
Stage 2 — Website Scraping
Primary  : scrape.do (proxy) + direct HTML parse
Fallback : Firecrawl API
Extracts : emails (regex), /about page content, owner name hints
"""

import os, re, requests, json, time, sys
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv

# Fix for Windows Unicode encoding issues
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env.local'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SCRAPE_DO_KEYS   = [k.strip() for k in (os.getenv("SCRAPE_DO_API_KEYS") or os.getenv("SCRAPE_DO_API_KEY") or "").split(",") if k.strip()]
FIRECRAWL_KEYS   = [k.strip() for k in (os.getenv("FIRECRAWL_API_KEYS") or os.getenv("FIRECRAWL_API_KEY") or "").split(",") if k.strip()]

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"[\+\(]?[0-9][0-9 \-\(\)]{7,}[0-9]")

ABOUT_SLUGS = ["/about", "/about-us", "/team", "/our-team", "/contact", "/contact-us"]


def scrape_with_scrapedo(url: str) -> str | None:
    """Route URL through scrape.do for JS rendering + proxy."""
    try:
        resp = requests.get(
            "https://api.scrape.do",
            params={"token": SCRAPE_DO_KEYS, "url": url, "render": "true"},
            timeout=30
        )
        if resp.status_code == 200:
            return resp.text
    except Exception as e:
        print(f"    [scrape.do] failed for {url}: {e}")
    return None


def scrape_with_firecrawl(url: str) -> str | None:
    """Firecrawl fallback — better for complex JS-heavy sites."""
    try:
        resp = requests.post(
            "https://api.firecrawl.dev/v1/scrape",
            headers={"Authorization": f"Bearer {FIRECRAWL_KEYS}", "Content-Type": "application/json"},
            json={"url": url, "formats": ["markdown"]},
            timeout=30
        )
        data = resp.json()
        if data.get("success"):
            return data.get("data", {}).get("markdown", "")
    except Exception as e:
        print(f"    [firecrawl] failed for {url}: {e}")
    return None


def extract_emails(text: str) -> list[str]:
    found = EMAIL_RE.findall(text)
    # Filter out common non-emails
    filtered = [e for e in found if not any(skip in e.lower() for skip in
        ["example", "youremail", "domain", "email@", "@email", "test@", "@test", ".png", ".jpg"])]
    return list(dict.fromkeys(filtered))  # deduplicate, preserve order


def extract_owner_hints(text: str) -> str:
    """Extract sentences likely to contain owner/founder names."""
    hints = []
    patterns = [
        r"(?:founded by|owner|director|ceo|managing director|proprietor|partner|head of)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)",
        r"([A-Z][a-z]+ [A-Z][a-z]+)(?:\s+is the|\s+,?\s+(?:founder|owner|director|ceo|head))",
    ]
    for pat in patterns:
        matches = re.findall(pat, text, re.IGNORECASE)
        hints.extend(matches)
    return ", ".join(dict.fromkeys(hints)) if hints else ""


def extract_socials(text: str) -> dict:
    """Extract social media links from HTML."""
    socials = {}
    
    inst = re.search(r'instagram\.com/([a-zA-Z0-9._]+)', text)
    if inst: socials["instagram"] = f"https://www.instagram.com/{inst.group(1)}"
   
    li = re.search(r'linkedin\.com/(company|in)/([a-zA-Z0-9._-]+)', text)
    if li: socials["linkedin"] = f"https://www.linkedin.com/{li.group(1)}/{li.group(2)}"
    
    return socials


def scrape_website(website: str) -> dict:
    """
    Scrape a business website.
    Returns: emails, socials, about_text, owner_hint
    """
    result = {"emails": [], "socials": {}, "about_text": "", "owner_hint": "", "scraped_url": website}

    if not website or not website.startswith("http"):
        website = "https://" + website.lstrip("/")

    # 1. Scrape homepage
    print(f"    → Scraping homepage: {website}")
    html = scrape_with_scrapedo(website)
    if not html:
        print(f"    → scrape.do failed, trying Firecrawl...")
        html = scrape_with_firecrawl(website)

    if html:
        result["emails"] = extract_emails(html)
        result["owner_hint"] = extract_owner_hints(html)
        result["socials"] = extract_socials(html)

    # 2. Try /about page if no email or socials found yet
    if not result["emails"] or not result["socials"]:
        base = website.rstrip("/")
        for slug in ABOUT_SLUGS:
            about_url = base + slug
            print(f"    → Trying about page: {about_url}")
            about_html = scrape_with_scrapedo(about_url)
            if not about_html:
                about_html = scrape_with_firecrawl(about_url)
            if about_html:
                emails = extract_emails(about_html)
                if emails:
                    result["emails"].extend(emails)
                    result["emails"] = list(dict.fromkeys(result["emails"]))
                    result["about_text"] = about_html[:2000]
                
                socials = extract_socials(about_html)
                result["socials"].update(socials)
                
                hint = extract_owner_hints(about_html)
                if hint:
                    result["owner_hint"] = hint
                
                if result["emails"] and result["owner_hint"] and len(result["socials"]) >= 2:
                    break
            time.sleep(0.3)

    return result


def run_stage2(businesses: list[dict]) -> list[dict]:
    """Enrich each business with scraped website data."""
    print(f"\n[Stage 2] Scraping websites for {len(businesses)} businesses...")
    
    def process_biz(args):
        i, biz = args
        print(f"\n  [{i+1}/{len(businesses)}] {biz['name']}")

        website = biz.get("website", "")

        if website:
            scraped = scrape_website(website)
            
            # Merge Emails (Don't overwrite if scrape found nothing but Stage 1.5 did)
            new_emails = scraped["emails"]
            if new_emails:
                biz["emails_from_site"] = new_emails
                if not biz.get("email"):
                    biz["email"] = new_emails[0]
            
            # Merge Socials
            for platform, url in scraped["socials"].items():
                if url and not biz.get(platform):
                    biz[platform] = url
            
            biz["owner_hint"] = scraped["owner_hint"]
            biz["about_text"] = scraped["about_text"]
        else:
            print(f"    [!] No website found for {biz['name']}, skipping scrape")
            biz["emails_from_site"]  = []
            biz["email"]             = ""
            biz["owner_hint"]        = ""
            biz["about_text"]        = ""

        time.sleep(0.5)
        return biz

    enriched = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        enriched = list(executor.map(process_biz, enumerate(businesses)))

    print(f"\n[Stage 2] Done — {sum(1 for b in enriched if b['email'])} emails found")
    return enriched


if __name__ == "__main__":
    in_path  = os.path.join(os.path.dirname(__file__), '..', 'output', 'stage1_raw.json')
    out_path = os.path.join(os.path.dirname(__file__), '..', 'output', 'stage2_scraped.json')

    with open(in_path) as f:
        businesses = json.load(f)

    enriched = run_stage2(businesses)

    with open(out_path, 'w') as f:
        json.dump(enriched, f, indent=2)
    print(f"\n[Stage 2] Saved → {out_path}")
