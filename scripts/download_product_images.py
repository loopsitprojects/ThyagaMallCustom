#!/usr/bin/env python3
import csv
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse, unquote
import urllib.request
import urllib.error

WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(WORKSPACE_ROOT, 'database_dump', 'Products-Export-2026-October-29-1357.csv')
UPLOADS_DIR = os.path.join(WORKSPACE_ROOT, 'public', 'uploads')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
}

def extract_urls(csv_file):
    urls = set()
    with open(csv_file, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            for col in ['Image Featured', 'Image URL']:
                val = (row.get(col) or '').strip()
                if val:
                    for u in val.split('|'):
                        u = u.strip()
                        if u:
                            urls.add(u)
    return sorted(list(urls))

def download_one(url, dest_dir, retries=3):
    p = unquote(urlparse(url).path)
    filename = os.path.basename(p)
    if not filename:
        return ('invalid_name', url, None)
    
    target_path = os.path.join(dest_dir, filename)
    if os.path.exists(target_path) and os.path.getsize(target_path) > 100:
        return ('skipped', url, filename)
    
    # Try https first if http
    normalized_url = url
    if normalized_url.startswith('http://'):
        normalized_url = 'https://' + normalized_url[7:]

    parsed = urllib.parse.urlsplit(normalized_url)
    quoted_path = urllib.parse.quote(parsed.path)
    clean_url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, quoted_path, parsed.query, parsed.fragment))

    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(clean_url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
                if len(data) > 0:
                    with open(target_path, 'wb') as out_f:
                        out_f.write(data)
                    return ('downloaded', url, filename)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                # Try original http if https failed with 404
                if normalized_url != url:
                    try:
                        p_orig = urllib.parse.urlsplit(url)
                        clean_orig = urllib.parse.urlunsplit((p_orig.scheme, p_orig.netloc, urllib.parse.quote(p_orig.path), p_orig.query, p_orig.fragment))
                        req = urllib.request.Request(clean_orig, headers=HEADERS)
                        with urllib.request.urlopen(req, timeout=15) as resp:
                            data = resp.read()
                            if len(data) > 0:
                                with open(target_path, 'wb') as out_f:
                                    out_f.write(data)
                                return ('downloaded', url, filename)
                    except Exception:
                        pass
                return ('failed_404', url, str(e))
            elif attempt == retries:
                return ('failed_http', url, f'{e.code} {e.reason}')
            time.sleep(1)
        except Exception as e:
            if attempt == retries:
                return ('failed_err', url, str(e))
            time.sleep(1)
    
    return ('failed_unknown', url, 'Unknown error')

def main():
    if not os.path.exists(CSV_PATH):
        print(f"Error: CSV file not found at {CSV_PATH}")
        sys.exit(1)
        
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    print(f"📁 Target uploads directory: {UPLOADS_DIR}")
    
    print(f"🔍 Extracting image URLs from {CSV_PATH}...")
    urls = extract_urls(CSV_PATH)
    total = len(urls)
    print(f"📊 Found {total} unique image URLs to process.")

    stats = {'downloaded': 0, 'skipped': 0, 'failed': 0}
    failed_items = []

    start_time = time.time()
    max_workers = 25

    print(f"⚡ Starting multi-threaded download with {max_workers} workers...")
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(download_one, u, UPLOADS_DIR): u for u in urls}
        completed = 0
        for future in as_completed(futures):
            completed += 1
            status, url, detail = future.result()
            if status == 'downloaded':
                stats['downloaded'] += 1
            elif status == 'skipped':
                stats['skipped'] += 1
            else:
                stats['failed'] += 1
                failed_items.append((url, detail))
            
            if completed % 100 == 0 or completed == total:
                elapsed = time.time() - start_time
                rate = completed / elapsed if elapsed > 0 else 0
                print(f"  [{completed}/{total}] {stats['downloaded']} downloaded, {stats['skipped']} skipped, {stats['failed']} failed ({rate:.1f} imgs/s)")

    duration = time.time() - start_time
    print(f"\n==========================================")
    print(f"✅ Image download complete in {duration:.2f}s!")
    print(f"   Downloaded: {stats['downloaded']}")
    print(f"   Skipped (already existed): {stats['skipped']}")
    print(f"   Failed: {stats['failed']}")
    if failed_items:
        print(f"\n⚠️ {len(failed_items)} images failed to download:")
        for u, d in failed_items[:10]:
            print(f"   - {u} -> {d}")
        if len(failed_items) > 10:
            print(f"   ... and {len(failed_items) - 10} more.")
    
    # Calculate total disk size in UPLOADS_DIR
    total_size = sum(os.path.getsize(os.path.join(UPLOADS_DIR, f)) for f in os.listdir(UPLOADS_DIR) if os.path.isfile(os.path.join(UPLOADS_DIR, f)))
    print(f"💾 Total size of images in public/uploads: {total_size / (1024*1024):.2f} MB")
    print(f"==========================================")

if __name__ == '__main__':
    main()
