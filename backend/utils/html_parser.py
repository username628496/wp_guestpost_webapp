from bs4 import BeautifulSoup
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)

def extract_outgoing_links(html_content, post_url):
    """
    Extract all external outgoing links from HTML content

    Args:
        html_content: HTML string to parse
        post_url: URL of the post (to determine which links are external)

    Returns:
        List of dicts with 'domain' and 'anchor' keys
    """
    if not html_content or not post_url:
        return []

    try:
        # Parse HTML
        soup = BeautifulSoup(html_content, 'html.parser')

        # Get post domain
        post_domain = urlparse(post_url).hostname

        # Find all links
        links = []
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']

            # Skip empty hrefs, anchors, and relative URLs
            if not href or href.startswith('#') or href.startswith('mailto:') or href.startswith('tel:'):
                continue

            # Parse link URL
            try:
                link_url = urlparse(href)
                link_domain = link_url.hostname

                # Skip if no domain (relative URL)
                if not link_domain:
                    continue

                # Skip internal links (same domain)
                if link_domain == post_domain:
                    continue

                # Extract anchor text
                anchor_text = a_tag.get_text(strip=True)
                if not anchor_text:
                    anchor_text = '[No text]'

                # Add to list (avoid duplicates)
                link_info = {
                    'domain': link_domain,
                    'anchor': anchor_text[:100],  # Limit anchor text length
                    'url': href
                }

                # Check if this exact link already exists
                if link_info not in links:
                    links.append(link_info)

            except Exception as e:
                logger.warning(f"Error parsing link {href}: {str(e)}")
                continue

        logger.info(f"Extracted {len(links)} outgoing links from {post_url}")
        return links

    except Exception as e:
        logger.error(f"Error extracting outgoing links: {str(e)}")
        return []
