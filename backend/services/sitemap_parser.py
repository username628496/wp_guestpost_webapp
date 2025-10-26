import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from utils.logger import logger
import urllib3

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def fetch_sitemap_urls(domain: str, max_urls: int = 10000):
    """
    Thử tìm và đọc sitemap từ domain.
    Trả về danh sách URL hợp lệ (tối đa max_urls).
    """
    sitemap_candidates = [
        f"https://{domain}/sitemap.xml",
        f"https://{domain}/sitemap_index.xml",
        f"http://{domain}/sitemap.xml",
        f"http://{domain}/sitemap_index.xml",
    ]

    visited = set()
    all_urls = []

    for sitemap_url in sitemap_candidates:
        try:
            logger.info(f"Fetching sitemap: {sitemap_url}")
            resp = requests.get(
                sitemap_url,
                timeout=10,
                headers={"User-Agent": "Mozilla/5.0"},
                allow_redirects=True,  # Follow redirects
                verify=False  # Skip SSL verification for problematic certificates
            )
            if resp.status_code != 200:
                logger.warning(f"Sitemap not found: {sitemap_url} ({resp.status_code})")
                continue

            # Check if response is XML
            content_type = resp.headers.get('Content-Type', '')
            if 'xml' not in content_type and 'text' not in content_type:
                logger.warning(f"Not XML content: {content_type}")
                continue

            # Pass max_urls to parse_sitemap
            remaining_limit = max_urls - len(all_urls)
            urls = parse_sitemap(resp.text, base_url=resp.url, max_urls=remaining_limit)

            if urls:
                logger.info(f"Found {len(urls)} URLs in {sitemap_url}")
                for u in urls:
                    if u not in visited:
                        visited.add(u)
                        all_urls.append(u)
                        if len(all_urls) >= max_urls:
                            logger.info(f"🚫 Reached limit {max_urls} URLs.")
                            return all_urls
                # If we found URLs, no need to try other candidates
                if all_urls:
                    break
        except Exception as e:
            logger.warning(f"Error reading {sitemap_url}: {e}")

    logger.info(f"Found {len(all_urls)} URLs in sitemap")
    return all_urls

def parse_sitemap(xml_text: str, base_url: str, max_urls: int = 999999):
    """Phân tích file XML, đọc <loc> với giới hạn max_urls"""
    urls = []
    soup = BeautifulSoup(xml_text, "xml")
    loc_tags = soup.find_all("loc")

    # Extensions to exclude (images, media files)
    excluded_extensions = (
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',  # Images
        '.pdf', '.doc', '.docx', '.xls', '.xlsx',  # Documents
        '.zip', '.rar', '.tar', '.gz',  # Archives
        '.mp4', '.avi', '.mov', '.mp3', '.wav',  # Media
        '.css', '.js'  # Assets
    )

    for loc in loc_tags:
        url = loc.text.strip()
        if url:
            # Filter out URLs with excluded extensions
            url_lower = url.lower()
            if not any(url_lower.endswith(ext) for ext in excluded_extensions):
                urls.append(url)
                # Check limit while collecting URLs
                if len(urls) >= max_urls:
                    return urls

    # Nếu sitemap là index (gồm các sitemap con)
    if not urls or any("sitemap" in u for u in urls):
        subs = []
        for sub in urls:
            # Check if we've reached limit
            if len(subs) >= max_urls:
                break

            try:
                logger.info(f"↳ Fetching nested sitemap: {sub}")
                resp = requests.get(sub, timeout=10, allow_redirects=True, headers={"User-Agent": "Mozilla/5.0"}, verify=False)
                if resp.status_code == 200:
                    # Pass remaining limit to nested call
                    remaining = max_urls - len(subs)
                    nested_urls = parse_sitemap(resp.text, base_url=resp.url, max_urls=remaining)
                    subs.extend(nested_urls)

                    # Check if we've reached limit after extending
                    if len(subs) >= max_urls:
                        break
            except Exception as e:
                logger.warning(f"Error fetching nested sitemap {sub}: {e}")
                continue
        urls = subs

    return urls[:max_urls]  # Ensure we don't exceed limit