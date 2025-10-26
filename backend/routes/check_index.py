from flask import Blueprint, request, jsonify, send_file
import asyncio
import math
from urllib.parse import urlparse
from datetime import datetime, timezone
import io
import csv

from services.serper_service import check_urls
from services.sitemap_parser import fetch_sitemap_urls
from utils.logger import logger
from models.database import insert_history, insert_domain_check, get_domain_checks, get_domain_check_detail, clear_all_history

bp = Blueprint("check_index", __name__)

BATCH_SIZE = 10  # Số URL xử lý song song mỗi batch

async def process_batches(urls):
    results = []
    total_batches = math.ceil(len(urls) / BATCH_SIZE)
    for i in range(total_batches):
        batch = urls[i * BATCH_SIZE:(i + 1) * BATCH_SIZE]
        logger.info(f"Batch {i+1}/{total_batches}: {len(batch)} URLs")
        batch_results = await check_urls(batch)
        results.extend(batch_results)
    return results

def group_by_domain(results):
    grouped = {}
    for r in results:
        domain = urlparse(r["url"]).netloc
        grouped.setdefault(domain, []).append(r)
    return grouped

@bp.route("/api/check-index", methods=["POST"])
def check_index_route():
    data = request.get_json()
    inputs = data.get("urls", [])

    if not inputs or not isinstance(inputs, list):
        return jsonify({"error": "Invalid or empty URL list"}), 400

    all_urls = []

    # 🧠 Phân biệt domain và URL
    for entry in inputs:
        entry = entry.strip()
        if not entry:
            continue

        # Nếu chỉ nhập domain, thử cả sitemap và URL trực tiếp
        if not entry.startswith("http"):
            logger.info(f"🌐 Domain input detected: {entry}")
            domain_urls = fetch_sitemap_urls(entry)
            if domain_urls:
                logger.info(f"Found {len(domain_urls)} URLs from sitemap")
                all_urls.extend(domain_urls)
            else:
                # Nếu không có sitemap, coi như single URL và thêm https://
                logger.info(f"No sitemap found, treating as single URL: https://{entry}")
                all_urls.append(f"https://{entry}")
        else:
            all_urls.append(entry)

    if not all_urls:
        return jsonify({"error": "Không tìm thấy URL hợp lệ hoặc sitemap."}), 400

    logger.info(f"Tổng cộng {len(all_urls)} URL cần kiểm tra index")

    results = asyncio.run(process_batches(all_urls))

    # Thêm timestamp
    for r in results:
        if 'checked_at' not in r:
            r["checked_at"] = datetime.now(timezone.utc).isoformat()

    # Lưu lịch sử cũ (backward compatibility)
    for r in results:
        insert_history(r["url"], r["status"])

    # Group by domain
    grouped = group_by_domain(results)

    # Lưu vào database mới theo domain sessions
    domain_check_ids = {}
    for domain, domain_results in grouped.items():
        domain_check_id = insert_domain_check(domain, domain_results)
        domain_check_ids[domain] = domain_check_id
        logger.info(f"Saved domain check #{domain_check_id} for {domain}")

    logger.info("Done checking all domains")

    return jsonify({
        "domain_groups": grouped,
        "domain_check_ids": domain_check_ids
    })

@bp.route("/api/fetch-sitemap", methods=["POST"])
def fetch_sitemap_route():
    """
    Fetch URLs from domain's sitemap (không check index)
    Request: {"domain": "example.com", "max_urls": 10000}
    """
    data = request.get_json()
    domain = data.get("domain", "").strip()
    max_urls = data.get("max_urls", 10000)

    if not domain:
        return jsonify({"error": "Domain is required"}), 400

    # Remove http(s):// if present
    domain = domain.replace("https://", "").replace("http://", "").split("/")[0]

    logger.info(f"📡 Fetching sitemap for: {domain}")
    urls = fetch_sitemap_urls(domain, max_urls=max_urls)

    if not urls:
        logger.warning(f"No sitemap found for {domain}")
        return jsonify({
            "domain": domain,
            "urls": [],
            "count": 0,
            "message": "No sitemap found. You can still check the domain homepage."
        })

    logger.info(f"Found {len(urls)} URLs in sitemap")
    return jsonify({
        "domain": domain,
        "urls": urls,
        "count": len(urls)
    })

@bp.route("/api/domain-checks", methods=["GET"])
def get_domain_checks_route():
    """Lấy danh sách domain checks gần nhất"""
    limit = request.args.get("limit", 20, type=int)
    checks = get_domain_checks(limit)
    return jsonify({"domain_checks": checks})

@bp.route("/api/domain-checks/<int:check_id>", methods=["GET"])
def get_domain_check_detail_route(check_id):
    """Lấy chi tiết 1 domain check"""
    detail = get_domain_check_detail(check_id)
    if not detail:
        return jsonify({"error": "Domain check not found"}), 404
    return jsonify(detail)

@bp.route("/api/export/<int:check_id>", methods=["GET"])
def export_domain_check(check_id):
    """
    Export domain check to CSV
    Query params:
    - filter: 'all' (default), 'indexed', 'not_indexed'
    """
    filter_type = request.args.get("filter", "all")

    detail = get_domain_check_detail(check_id)
    if not detail:
        return jsonify({"error": "Domain check not found"}), 404

    urls = detail["urls"]

    # Filter URLs
    if filter_type == "indexed":
        urls = [u for u in urls if "Indexed ✅" in u["status"]]
    elif filter_type == "not_indexed":
        urls = [u for u in urls if "Not Indexed ❌" in u["status"]]
    # filter_type == "all" → keep all URLs

    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["URL", "Status", "Checked At"])

    for url_data in urls:
        writer.writerow([
            url_data["url"],
            url_data["status"],
            url_data["checked_at"]
        ])

    # Convert to bytes
    output.seek(0)
    csv_bytes = io.BytesIO(output.getvalue().encode('utf-8-sig'))  # UTF-8 with BOM for Excel
    csv_bytes.seek(0)

    # Generate filename
    domain = detail["domain"]
    filename = f"{domain}_{filter_type}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"

    return send_file(
        csv_bytes,
        mimetype='text/csv',
        as_attachment=True,
        download_name=filename
    )

@bp.route("/api/clear-history", methods=["DELETE"])
def clear_history_route():
    """Xóa toàn bộ lịch sử trong database"""
    try:
        clear_all_history()
        logger.info("Đã xóa toàn bộ lịch sử")
        return jsonify({"message": "Đã xóa toàn bộ lịch sử thành công"}), 200
    except Exception as e:
        logger.error(f"Lỗi khi xóa lịch sử: {e}")
        return jsonify({"error": "Không thể xóa lịch sử"}), 500