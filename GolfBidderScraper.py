from playwright.sync_api import sync_playwright
import json
import re
import time
import pandas as pd
from collections import defaultdict
import requests
import os
from multiprocessing import Pool, Manager
from tqdm import tqdm
import random
import psycopg2
from psycopg2.extras import DictCursor
from urllib.parse import urlparse

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Global set to cache downloaded images
downloaded_images = set()

def get_db_connection():
    """Establish a connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            os.getenv("DATABASE_URL"),
            cursor_factory=DictCursor
        )
        print("Connected to PostgreSQL database successfully")
        return conn
    except Exception as e:
        print(f"Error connecting to PostgreSQL database: {e}")
        raise

def download_image(image_url, brand, model):
    """Download the image and save it to src/assets."""
    try:
        image_key = f"{brand.lower().replace(' ', '_')}_{model.lower().replace(' ', '_')}"
        if image_key in downloaded_images:
            print(f"Image already downloaded for {brand} {model}")
            return image_key
        
        os.makedirs("src/assets", exist_ok=True)
        filename = f"{image_key}.jpg"
        filepath = os.path.join("src/assets", filename)
        
        if os.path.exists(filepath):
            print(f"Image already exists for {brand} {model}: {filepath}")
            downloaded_images.add(image_key)
            return image_key
        
        response = requests.get(image_url, stream=True, timeout=5)
        if response.status_code == 200:
            with open(filepath, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            print(f"Saved image for {brand} {model} to {filepath}")
            downloaded_images.add(image_key)
            return image_key
        else:
            print(f"Failed to download image for {brand} {model}: HTTP {response.status_code} - URL: {image_url}")
            return None
    except Exception as e:
        print(f"Error downloading image for {brand} {model}: {e} - URL: {image_url}")
        return None

def determine_club_type_from_page(page):
    """Determine the club type from the category link on the product page."""
    try:
        category_link = page.query_selector("li.item.product_type a")
        if category_link:
            category_title = category_link.get_attribute("title")
            if category_title:
                category_title = category_title.lower()
                if "drivers" in category_title:
                    return "Driver"
                elif "fairway woods" in category_title:
                    return "Fairway Wood"
                elif "hybrids & utility irons" in category_title:
                    return "Hybrid"
                elif "iron sets" in category_title:
                    return "Iron Set"
                elif "wedges" in category_title:
                    return "Wedge"
                elif "putters" in category_title:
                    return "Putter"
                elif "club sets" in category_title:
                    return "Club Set"
                else:
                    print(f"Unknown category title: {category_title}")
                    return "Unknown"
        print("No category link found on page")
        return "Unknown"
    except Exception as e:
        print(f"Error determining club type from page: {e}")
        return "Unknown"

def infer_type_from_specific_type(specific_type, description, club_type, process_id):
    """Infer the correct type based on specificType, description, and club_type."""
    if specific_type:
        specific_type_lower = specific_type.lower()
        if "hybrid" in specific_type_lower:
            return "Hybrid"
        elif "wood" in specific_type_lower:
            return "Fairway Wood"
    
    club_type_lower = club_type.lower()
    if "driver" in club_type_lower:
        return "Driver"
    elif "fairway" in club_type_lower:
        return "Fairway Wood"
    elif "hybrid" in club_type_lower:
        return "Hybrid"
    elif "iron" in club_type_lower:
        return "Iron Set"
    elif "wedge" in club_type_lower:
        return "Wedge"
    elif "putter" in club_type_lower:
        return "Putter"
    
    description_lower = description.lower()
    if "hybrid" in description_lower or "rescue" in description_lower:
        return "Hybrid"
    elif "wood" in description_lower:
        return "Fairway Wood"
    
    print(f"Process {process_id} - Warning: Could not infer type from specificType {specific_type}, club_type {club_type}, or description")
    return None

def remove_popups(page, process_id):
    """Remove modal and cookie consent popups, retrying until successful."""
    max_attempts = 3
    for attempt in range(max_attempts):
        try:
            page.evaluate("""
                let modal = document.querySelector('#leadinModal-4501297');
                if (modal) modal.remove();
                let overlay = document.querySelector('.leadinModal-overlay');
                if (overlay) overlay.remove();
                let cookiePopup = document.querySelector('.ec-gtm-cookie-directive');
                if (cookiePopup) cookiePopup.remove();
                let geoModal = document.querySelector('.modals-wrapper');
                if (geoModal) geoModal.remove();
                let geoOverlay = document.querySelector('.modals-overlay');
                if (geoOverlay) geoOverlay.remove();
            """)
            print(f"Process {process_id} - Attempt {attempt + 1}: Removed popups using JavaScript")
            page.wait_for_function("""
                () => {
                    return !document.querySelector('#leadinModal-4501297') &&
                           !document.querySelector('.leadinModal-overlay') &&
                           !document.query_selector('.ec-gtm-cookie-directive') &&
                           !document.query_selector('.modals-wrapper') &&
                           !document.query_selector('.modals-overlay');
                }
            """, timeout=3000)
            print(f"Process {process_id} - Confirmed all popups removed")
            page.wait_for_timeout(500)
            return True
        except Exception as e:
            print(f"Process {process_id} - Attempt {attempt + 1}: Error removing popups: {e}")
            if attempt == max_attempts - 1:
                print(f"Process {process_id} - Failed to remove popups after {max_attempts} attempts")
                return False
            page.wait_for_timeout(500)

def ensure_no_popups(page, process_id):
    """Ensure no popups are present before interacting with the page."""
    try:
        popup_present = page.evaluate("""
            () => {
                return !!document.querySelector('#leadinModal-4501297') ||
                       !!document.querySelector('.leadinModal-overlay') ||
                       !!document.querySelector('.ec-gtm-cookie-directive') ||
                       !!document.querySelector('.modals-wrapper') ||
                       !!document.querySelector('.modals-overlay');
            }
        """)
        if popup_present:
            print(f"Process {process_id} - Popups detected, attempting to remove them")
            return remove_popups(page, process_id)
        return True
    except Exception as e:
        print(f"Process {process_id} - Error checking for popups: {e}")
        return False

def get_golfer_level(page, process_id):
    """Extract the golfer level from the page and map it to High/Medium/Low Handicapper."""
    try:
        golfer_level_elem = page.query_selector("span.golfer-level strong")
        if golfer_level_elem:
            golfer_level = golfer_level_elem.inner_text().strip()
            if golfer_level.lower() == "beginner":
                return "High Handicapper"
            elif golfer_level.lower() == "intermediate":
                return "Medium Handicapper"
            elif golfer_level.lower() == "advanced":
                return "Low Handicapper"
            else:
                print(f"Process {process_id} - Unknown golfer level: {golfer_level}, defaulting to Medium Handicapper")
                return "Medium Handicapper"
        else:
            print(f"Process {process_id} - Golfer level not found, defaulting to Medium Handicapper")
            return "Medium Handicapper"
    except Exception as e:
        print(f"Process {process_id} - Error extracting golfer level: {e}, defaulting to Medium Handicapper")
        return "Medium Handicapper"

def get_category(club_type, handicapper_level):
    """Determine the category based on club type and handicapper level."""
    club_type_lower = club_type.lower()
    if handicapper_level == "Low Handicapper":
        if club_type_lower == "driver":
            return "Players Driver"
        elif club_type_lower == "fairway wood":
            return "Players Fairway Wood"
        elif club_type_lower == "hybrid":
            return "Players Hybrid"
        elif club_type_lower == "iron set":
            return "Players Irons"
        elif club_type_lower == "wedge":
            return "Players Wedge"
        elif club_type_lower == "putter":
            return "Players Putter"
        elif club_type_lower == "club set":
            return "Players Club Set"
    else:  # High or Medium Handicapper
        if club_type_lower == "driver":
            return "Game Improvement Driver"
        elif club_type_lower == "fairway wood":
            return "Game Improvement Fairway Wood"
        elif club_type_lower == "hybrid":
            return "Game Improvement Hybrid"
        elif club_type_lower == "iron set":
            return "Game Improvement Irons"
        elif club_type_lower == "wedge":
            return "Game Improvement Wedge"
        elif club_type_lower == "putter":
            return "Game Improvement Putter"
        elif club_type_lower == "club set":
            return "Game Improvement Club Set"
    return "Unknown Category"

def check_club_exists(conn, club_data, process_id):
    """Check if a club already exists in the database based on unique fields."""
    try:
        cur = conn.cursor()
        query = """
        SELECT id FROM clubs
        WHERE brand = %s
        AND model = %s
        AND type = %s
        AND COALESCE(subtype, '') = COALESCE(%s, '')
        AND COALESCE(specifictype, '') = COALESCE(%s, '')
        AND handicapperlevel = %s
        AND category = %s
        """
        params = (
            club_data["brand"],
            club_data["model"],
            club_data["type"],
            club_data["subType"],
            club_data["specificType"],
            club_data["handicapperLevel"],
            club_data["category"]
        )
        cur.execute(query, params)
        result = cur.fetchone()
        cur.close()
        if result:
            print(f"Process {process_id} - Club already exists: {club_data['brand']} {club_data['model']}, ID: {result['id']}")
            return result["id"]
        return None
    except Exception as e:
        print(f"Process {process_id} - Error checking club existence: {e}")
        return None

def insert_club(conn, club_data, process_id):
    """Insert a new club into the database and return its ID."""
    try:
        cur = conn.cursor()
        query = """
        INSERT INTO clubs (brand, model, type, subtype, specifictype, handicapperlevel, category, image, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
        RETURNING id
        """
        params = (
            club_data["brand"],
            club_data["model"],
            club_data["type"],
            club_data["subType"],
            club_data["specificType"],
            club_data["handicapperLevel"],
            club_data["category"],
            club_data["image"]
        )
        cur.execute(query, params)
        club_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        print(f"Process {process_id} - Inserted club: {club_data['brand']} {club_data['model']}, ID: {club_id}")
        return club_id
    except Exception as e:
        print(f"Process {process_id} - Error inserting club: {e}")
        return None

def check_variant_exists(conn, club_id, variant_data, process_id):
    """Check if a variant already exists in the database based on unique fields."""
    try:
        cur = conn.cursor()
        query = """
        SELECT id FROM variants
        WHERE club_id = %s
        AND price = %s
        AND COALESCE(loft, '') = COALESCE(%s, '')
        AND description = %s
        AND COALESCE(source, '') = COALESCE(%s, '')
        AND COALESCE(url, '') = COALESCE(%s, '')
        """
        retailer = variant_data["prices"][0]["retailer"] if variant_data["prices"] else None
        url = variant_data["prices"][0]["url"] if variant_data["prices"] else None
        params = (
            club_id,
            variant_data["price"],
            variant_data["loft"],
            variant_data["description"],
            retailer,
            url
        )
        cur.execute(query, params)
        result = cur.fetchone()
        cur.close()
        if result:
            print(f"Process {process_id} - Variant already exists for club_id {club_id}, ID: {result['id']}")
            return result["id"]
        return None
    except Exception as e:
        print(f"Process {process_id} - Error checking variant existence: {e}")
        return None

def insert_variant(conn, club_id, variant_data, process_id):
    """Insert a new variant into the database and return its ID."""
    try:
        cur = conn.cursor()
        query = """
        INSERT INTO variants (club_id, price, loft, shaftmaterial, setmakeup, length, bounce, description, source, url, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
        RETURNING id
        """
        retailer = variant_data["prices"][0]["retailer"] if variant_data["prices"] else None
        url = variant_data["prices"][0]["url"] if variant_data["prices"] else None
        params = (
            club_id,
            variant_data["price"],
            variant_data["loft"],
            variant_data["shaftMaterial"],
            variant_data["setMakeup"],
            variant_data["length"],
            variant_data["bounce"],
            variant_data["description"],
            retailer,
            url
        )
        cur.execute(query, params)
        variant_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        print(f"Process {process_id} - Inserted variant for club_id {club_id}, ID: {variant_id}")
        return variant_id
    except Exception as e:
        print(f"Process {process_id} - Error inserting variant: {e}")
        return None

def scrape_equipment(args):
    """Scrape details for a single equipment item and store in the database."""
    name, url, process_id, total_items, item_index, all_variants = args
    local_variants = []
    try:
        print(f"Process {process_id} - Scraping equipment {item_index + 1}/{total_items}: {name}")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                accept_downloads=True,
                extra_http_headers={
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5"
                }
            )
            page = context.new_page()
            
            page.goto(url, timeout=15000)
            
            try:
                page.wait_for_selector(".product-alternatives-item-new.cell", timeout=3000)
            except Exception as e:
                print(f"Process {process_id} - No variants found on page {url}: {e}")
                out_of_stock = page.query_selector(".product-info-stock-sku .stock.unavailable")
                if out_of_stock:
                    print(f"Process {process_id} - Item {name} is out of stock at {url}")
                    title_element = page.query_selector(".grid-y.align-justify h3")
                    title = title_element.inner_text() if title_element else name
                    brand = title.split(" ")[0] if title else "Unknown"
                    model = title.replace(brand, "").strip()
                    club_type = determine_club_type_from_page(page)
                    handicapper_level = get_golfer_level(page, process_id)
                    category = get_category(club_type, handicapper_level)
                    
                    image_filename = None
                    if "golfbidder.co.uk" in url:
                        image_elem = page.query_selector(".cell.large-shrink.show-for-large img")
                        if image_elem:
                            image_url = image_elem.get_attribute("src")
                            if image_url:
                                image_filename = download_image(image_url, brand, model)
                                if image_filename:
                                    print(f"Process {process_id} - Image reference for {brand} {model}: {image_filename}")
                                else:
                                    print(f"Process {process_id} - Failed to save image for {brand} {model}")
                            else:
                                print(f"Process {process_id} - No image URL found for {brand} {model}")
                        else:
                            print(f"Process {process_id} - No image element found for {brand} {model}")
                    elif "othergolfshop.com" in url:
                        image_elem = page.query_selector(".product-image img")
                        if image_elem:
                            image_url = image_elem.get_attribute("src")
                            if image_filename:
                                print(f"Process {process_id} - Image already exists for {brand} {model}, using existing image")
                            elif image_url:
                                image_filename = download_image(image_url, brand, model)
                                if image_filename:
                                    print(f"Process {process_id} - Image reference for {brand} {model}: {image_filename}")
                                else:
                                    print(f"Process {process_id} - Failed to save image for {brand} {model}")
                            else:
                                print(f"Process {process_id} - No image URL found for {brand} {model}")
                        else:
                            print(f"Process {process_id} - No image element found for {brand} {model}")
                    else:
                        print(f"Process {process_id} - Unsupported website for image scraping: {url}")
                    
                    club_data = {
                        "type": club_type,
                        "subType": "Individual" if club_type != "Iron Set" else "Set",
                        "specificType": None,
                        "brand": brand,
                        "model": model,
                        "handicapperLevel": handicapper_level,
                        "category": category,
                        "image": image_filename if image_filename else f"{brand.lower().replace(' ', '_')}_{model.lower().replace(' ', '_')}"
                    }
                    
                    conn = get_db_connection()
                    try:
                        club_id = check_club_exists(conn, club_data, process_id)
                        if not club_id:
                            club_id = insert_club(conn, club_data, process_id)
                        if not club_id:
                            print(f"Process {process_id} - Failed to insert or retrieve club ID for {brand} {model}")
                            return local_variants

                        variant_data = {
                            "price": 0.0,
                            "loft": None,
                            "shaftMaterial": None,
                            "setMakeup": None,
                            "length": None,
                            "bounce": None,
                            "description": "Out of stock",
                            "prices": [{
                                "retailer": "golfbidder" if "golfbidder.co.uk" in url else "othergolfshop",
                                "price": 0.0,
                                "url": url
                            }]
                        }
                        
                        variant_id = check_variant_exists(conn, club_id, variant_data, process_id)
                        if not variant_id:
                            variant_id = insert_variant(conn, club_id, variant_data, process_id)
                            if variant_id:
                                local_variants.append({**variant_data, "id": variant_id, "club_id": club_id})
                        else:
                            local_variants.append({**variant_data, "id": variant_id, "club_id": club_id})
                    finally:
                        conn.close()
                    
                    browser.close()
                    print(f"Process {process_id} - Finished scraping {name} with {len(local_variants)} variants (out of stock)")
                    return local_variants
                
                page_content = page.content()
                print(f"Process {process_id} - Page content for {url}: {page_content[:500]}...")
                browser.close()
                return local_variants
            
            remove_popups(page, process_id)
            
            load_more_attempts = 0
            max_load_more_attempts = 10
            previous_variant_count = 0
            while load_more_attempts < max_load_more_attempts:
                try:
                    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    page.wait_for_timeout(1000)
                    
                    if not ensure_no_popups(page, process_id):
                        print(f"Process {process_id} - Popups still present, cannot click 'Load More'")
                        break
                    
                    load_more = page.query_selector(".see-all-button-alternative")
                    if load_more:
                        page.wait_for_function(
                            "element => element.offsetParent !== null",
                            arg=load_more,
                            timeout=5000
                        )
                    current_variant_count = len(page.query_selector_all(".product-alternatives-item-new.cell"))
                    
                    if current_variant_count == previous_variant_count and load_more_attempts > 0:
                        print(f"Process {process_id} - No new variants loaded after clicking 'Load More'")
                        break
                    
                    if load_more and load_more.is_visible():
                        print(f"Process {process_id} - Clicking 'Load More' (attempt {load_more_attempts + 1})...")
                        page.evaluate("document.querySelector('.see-all-button-alternative')?.click()")
                        page.wait_for_function(
                            f"() => document.querySelectorAll('.product-alternatives-item-new.cell').length > {current_variant_count}",
                            timeout=10000
                        )
                        previous_variant_count = current_variant_count
                        load_more_attempts += 1
                    else:
                        print(f"Process {process_id} - 'Load More' button not found or not visible after {load_more_attempts} attempts")
                        break
                except Exception as e:
                    print(f"Process {process_id} - Error clicking 'Load More' on product page: {e}")
                    break
            
            title_element = page.query_selector(".grid-y.align-justify h3")
            title = title_element.inner_text() if title_element else name
            brand = title.split(" ")[0] if title else "Unknown"
            model = title.replace(brand, "").strip()
            
            club_type = determine_club_type_from_page(page)
            handicapper_level = get_golfer_level(page, process_id)
            category = get_category(club_type, handicapper_level)
            print(f"Process {process_id} - Club type: {club_type}, Handicapper Level: {handicapper_level}, Category: {category}")
            
            image_filename = None
            if "golfbidder.co.uk" in url:
                image_elem = page.query_selector(".cell.large-shrink.show-for-large img")
                if image_elem:
                    image_url = image_elem.get_attribute("src")
                    if image_url:
                        image_filename = download_image(image_url, brand, model)
                        if image_filename:
                            print(f"Process {process_id} - Image reference for {brand} {model}: {image_filename}")
                        else:
                            print(f"Process {process_id} - Failed to save image for {brand} {model}")
                    else:
                        print(f"Process {process_id} - No image URL found for {brand} {model}")
                else:
                    print(f"Process {process_id} - No image element found for {brand} {model}")
            elif "othergolfshop.com" in url:
                image_elem = page.query_selector(".product-image img")
                if image_elem:
                    image_url = image_elem.get_attribute("src")
                    if image_filename:
                        print(f"Process {process_id} - Image already exists for {brand} {model}, using existing image")
                    elif image_url:
                        image_filename = download_image(image_url, brand, model)
                        if image_filename:
                            print(f"Process {process_id} - Image reference for {brand} {model}: {image_filename}")
                        else:
                            print(f"Process {process_id} - Failed to save image for {brand} {model}")
                    else:
                        print(f"Process {process_id} - No image URL found for {brand} {model}")
                else:
                    print(f"Process {process_id} - No image element found for {brand} {model}")
            else:
                print(f"Process {process_id} - Unsupported website for image scraping: {url}")
            
            headers = page.query_selector_all(".product-alternatives-head-new .grid-x-medium-gutter p")
            header_labels = [header.inner_text().strip() for header in headers if header.inner_text().strip() not in ["Condition", "Price", "Head - Shaft - Grip"]]
            print(f"Process {process_id} - Variant headers: {header_labels}")
            
            variants = page.query_selector_all(".product-alternatives-item-new.cell")
            variant_count = len(variants)
            print(f"Process {process_id} - Found {variant_count} variants for {brand} {model}")
            
            if not variants:
                print(f"Process {process_id} - No variants found. Page HTML may have changed.")
            
            variant_groups = defaultdict(list)
            
            for variant_idx, variant in enumerate(variants, 1):
                try:
                    print(f"Process {process_id} - Processing variant {variant_idx}/{variant_count} for {brand} {model}")
                    text_values = variant.query_selector_all(".cell.medium-auto.text-value.show-for-medium.align-self-middle")
                    price_elem = variant.query_selector("span.price-wrapper")
                    
                    if len(text_values) < len(header_labels) + 1 or not price_elem:
                        print(f"Process {process_id} - Missing elements in variant {variant_idx}: Not enough text values ({len(text_values)}) or missing price")
                        continue
                    
                    handedness = text_values[0].inner_text().strip() if text_values[0] else None
                    price_raw = price_elem.inner_text().strip() if price_elem else None
                    price_value = float(re.sub(r"[^\d.]", "", price_raw)) if price_raw else 0.0
                    condition = text_values[len(header_labels)].inner_text().strip() if text_values[len(header_labels)] else None
                    
                    flex = None
                    table_loft = None
                    shaft_material = None
                    set_makeup = None
                    length = None
                    bounce = None
                    specific_type = None
                    
                    for i, label in enumerate(header_labels[1:], 1):
                        value = text_values[i].inner_text().strip() if text_values[i] else None
                        label_lower = label.lower()
                        if "flex" in label_lower:
                            flex = value
                        elif "loft" in label_lower:
                            table_loft = value
                            specific_type = value
                        elif "shaft material" in label_lower:
                            shaft_material = value
                        elif "set makeup" in label_lower:
                            set_makeup = value
                        elif "length" in label_lower:
                            length = value
                        elif "bounce" in label_lower:
                            bounce = value
                            if bounce and "°" in bounce:
                                bounce = bounce.replace("°", " degrees")
                    
                    if not ensure_no_popups(page, process_id):
                        print(f"Process {process_id} - Popups still present, proceeding with table loft")
                        numerical_loft = table_loft
                        details = []
                    else:
                        max_click_attempts = 1
                        numerical_loft = None
                        details = []
                        try:
                            variant.click(timeout=10000)
                            page.wait_for_timeout(500)
                            sub_details = page.query_selector(".grid-y.align-justify ul")
                            if sub_details:
                                detail_items = sub_details.query_selector_all("li")
                                details = [item.inner_text().strip() for item in detail_items if item.inner_text().strip()]
                            else:
                                print(f"Process {process_id} - Sub-details not found with selector '.grid-y.align-justify ul', trying alternative selector")
                                sub_details = page.query_selector(".product-alternatives-details ul")
                                if sub_details:
                                    detail_items = sub_details.query_selector_all("li")
                                    details = [item.inner_text().strip() for item in detail_items if item.inner_text().strip()]
                            print(f"Process {process_id} - Extracted sub-details: {details}")
                        except Exception as e:
                            print(f"Process {process_id} - Error clicking variant {variant_idx}/{variant_count}: {e}")
                            print(f"Process {process_id} - Using table loft as fallback")
                            numerical_loft = table_loft
                    
                    for detail in details:
                        if "loft" in detail.lower():
                            loft_match = re.search(r"loft\s*[:\s]\s*(\d+\.?\d*)°?", detail, re.IGNORECASE)
                            if loft_match:
                                numerical_loft = f"{float(loft_match.group(1))} degrees"
                                print(f"Process {process_id} - Extracted numerical loft from sub-details: {numerical_loft}")
                                break
                    
                    if not numerical_loft:
                        numerical_loft = table_loft
                        print(f"Process {process_id} - Using table loft as fallback: {numerical_loft}")
                    
                    if numerical_loft:
                        numerical_loft = numerical_loft.replace("Driver - ", "")
                        loft_match = re.search(r"(\d+\.?\d*)°?", numerical_loft)
                        if loft_match:
                            loft_value = float(loft_match.group(1))
                            numerical_loft = f"{loft_value} degrees"
                            print(f"Process {process_id} - Normalized numerical loft: {numerical_loft}")
                        else:
                            print(f"Process {process_id} - Could not normalize loft from table value: {numerical_loft}")
                            numerical_loft = None
                    
                    if club_type.lower() == "putter" and not numerical_loft:
                        numerical_loft = None
                        print(f"Process {process_id} - No loft available for putter variant {variant_idx}, proceeding without loft")
                    
                    loft_num = None
                    if numerical_loft:
                        loft_num_match = re.search(r"(\d+\.?\d*)\s*degrees", numerical_loft)
                        if loft_num_match:
                            loft_num = float(loft_num_match.group(1))
                        else:
                            loft_num_match = re.search(r"(\d+\.?\d*)°?", numerical_loft)
                            if loft_num_match:
                                loft_num = float(loft_num_match.group(1))
                                numerical_loft = f"{loft_num} degrees"
                                print(f"Process {process_id} - Normalized numerical loft from table value: {numerical_loft}")
                    
                    if loft_num:
                        if club_type == "Driver":
                            specific_type = None
                            if "Adjustable Loft" in (numerical_loft or ""):
                                specific_type = "Adjustable Launch Driver"
                            else:
                                if loft_num <= 9:
                                    specific_type = "Low Launch Driver"
                                elif 9.1 <= loft_num <= 10.5:
                                    specific_type = "Mid Launch Driver"
                                else:
                                    specific_type = "High Launch Driver"
                            print(f"Process {process_id} - Updated specificType for Driver: {specific_type}")
                        elif club_type == "Wedge":
                            specific_type = None
                            if 46 <= loft_num <= 52:
                                specific_type = "Gap Wedge"
                            elif 53 <= loft_num <= 56:
                                specific_type = "Sand Wedge"
                            elif 57 <= loft_num <= 60:
                                specific_type = "Lob Wedge"
                            else:
                                specific_type = "Wedge"
                            print(f"Process {process_id} - Updated specificType for Wedge: {specific_type}")
                    
                    description_parts = [f"Handedness: {handedness}"]
                    if flex:
                        description_parts.append(f"Flex: {flex}")
                    if numerical_loft:
                        description_parts.append(f"Loft: {numerical_loft}")
                    if shaft_material:
                        description_parts.append(f"Shaft Material: {shaft_material}")
                    if set_makeup:
                        description_parts.append(f"Set Makeup: {set_makeup}")
                    if length:
                        description_parts.append(f"Length: {length}")
                    if bounce:
                        description_parts.append(f"Bounce: {bounce}")
                    if condition:
                        description_parts.append(f"Condition: {condition}")
                    if details:
                        description_parts.append(f"Details: {', '.join(details)}")
                    description = ", ".join(description_parts)
                    
                    if not all([handedness, price_raw, condition]):
                        print(f"Process {process_id} - Missing required elements in variant {variant_idx}: Handedness={handedness}, Condition={condition}, Price={price_raw}")
                        continue
                    
                    inferred_type = infer_type_from_specific_type(specific_type, description, club_type, process_id)
                    if not inferred_type:
                        print(f"Process {process_id} - Skipping variant {variant_idx} due to unknown type")
                        continue
                    
                    variant_type = inferred_type
                    if club_type != inferred_type:
                        print(f"Process {process_id} - Mismatch: Variant {variant_idx} type {inferred_type} does not match parent type {club_type} for {brand} {model}, using inferred type")
                    
                    group_key = (variant_type, specific_type, brand, model)
                    variant_entry = {
                        "type": variant_type,
                        "subType": "Individual" if variant_type != "Iron Set" else "Set",
                        "specificType": specific_type,
                        "brand": brand,
                        "model": model,
                        "loft": numerical_loft,
                        "shaftMaterial": shaft_material,
                        "setMakeup": set_makeup,
                        "length": length,
                        "bounce": bounce,
                        "price": price_value,
                        "handicapperLevel": handicapper_level,
                        "category": category,
                        "description": description,
                        "prices": [{
                            "retailer": "golfbidder" if "golfbidder.co.uk" in url else "othergolfshop",
                            "price": price_value,
                            "url": url
                        }],
                        "image": image_filename if image_filename else f"{brand.lower().replace(' ', '_')}_{model.lower().replace(' ', '_')}"
                    }
                    variant_groups[group_key].append(variant_entry)
                    print(f"Process {process_id} - Grouped variant {variant_idx} under {variant_type} - {specific_type} for {brand} {model}")
                except Exception as e:
                    print(f"Process {process_id} - Error extracting variant {variant_idx}/{variant_count}: {e}")
                    continue
            
            # Insert into database
            conn = get_db_connection()
            try:
                for group_key, variants in variant_groups.items():
                    inferred_type, specific_type, group_brand, group_model = group_key
                    club_data = {
                        "type": inferred_type,
                        "subType": "Individual" if inferred_type != "Iron Set" else "Set",
                        "specificType": specific_type,
                        "brand": group_brand,
                        "model": group_model,
                        "handicapperLevel": handicapper_level,
                        "category": category,
                        "image": image_filename if image_filename else f"{group_brand.lower().replace(' ', '_')}_{group_model.lower().replace(' ', '_')}"
                    }
                    
                    # Check if club exists
                    club_id = check_club_exists(conn, club_data, process_id)
                    if not club_id:
                        # Insert new club
                        club_id = insert_club(conn, club_data, process_id)
                    if not club_id:
                        print(f"Process {process_id} - Failed to insert or retrieve club ID for {group_brand} {group_model}")
                        continue
                    
                    # Insert variants
                    for variant in variants:
                        variant_id = check_variant_exists(conn, club_id, variant, process_id)
                        if not variant_id:
                            variant_id = insert_variant(conn, club_id, variant, process_id)
                            if variant_id:
                                local_variants.append({**variant, "id": variant_id, "club_id": club_id})
                        else:
                            local_variants.append({**variant, "id": variant_id, "club_id": club_id})
            finally:
                conn.close()
            
            time.sleep(random.uniform(0.3, 0.7))
        
            browser.close()
            print(f"Process {process_id} - Finished scraping {name} with {len(local_variants)} variants")
            
            return local_variants
    
    except Exception as e:
        print(f"Process {process_id} - Error scraping product page {url}: {e}")
        return local_variants

def determine_wedge_specific_type(loft_str):
    """Determine the specificType for a wedge based on its loft."""
    if not loft_str:
        return "Wedge"
    
    loft_num_match = re.search(r"(\d+\.?\d*)\s*degrees", loft_str)
    if not loft_num_match:
        loft_num_match = re.search(r"(\d+\.?\d*)°?", loft_str)
    
    if loft_num_match:
        loft_num = float(loft_num_match.group(1))
        if 46 <= loft_num <= 52:
            return "Gap Wedge"
        elif 53 <= loft_num <= 56:
            return "Sand Wedge"
        elif 57 <= loft_num <= 60:
            return "Lob Wedge"
    
    return "Wedge"

def determine_driver_specific_type(loft_str):
    """Determine the specificType for a driver based on its loft."""
    if not loft_str:
        return None
    
    if "Adjustable Loft" in loft_str:
        return "Adjustable Launch Driver"
    
    loft_num_match = re.search(r"(\d+\.?\d*)\s*degrees", loft_str)
    if not loft_num_match:
        loft_num_match = re.search(r"(\d+\.?\d*)°?", loft_str)
    
    if loft_num_match:
        loft_num = float(loft_num_match.group(1))
        if loft_num <= 9:
            return "Low Launch Driver"
        elif 9.1 <= loft_num <= 10.5:
            return "Mid Launch Driver"
        else:
            return "High Launch Driver"
    
    return None

def scrape_driver_details():
    manager = Manager()
    all_variants = manager.list()
    
    equipment_data = []
    with open("equipment_names_and_urls.txt", "r") as f:
        for line in f:
            if line.startswith("Name:"):
                name = line.split(", URL: ")[0].replace("Name: ", "").strip()
                url = line.split(", URL: ")[1].strip()
                equipment_data.append((name, url))
    
    print(f"Loaded {len(equipment_data)} equipment items from equipment_names_and_urls.txt")
    
    seen_urls = set()
    unique_equipment_data = []
    for name, url in equipment_data:
        if url not in seen_urls:
            seen_urls.add(url)
            unique_equipment_data.append((name, url))
    
    equipment_data = unique_equipment_data
    print(f"Total unique equipment items after deduplication: {len(equipment_data)}")
    print(f"Processing all {len(equipment_data)} equipment items with multiprocessing")
    
    num_processes = 8
    chunk_size = max(1, len(equipment_data) // num_processes)
    chunks = [equipment_data[i:i + chunk_size] for i in range(0, len(equipment_data), chunk_size)]
    
    if len(chunks) > num_processes:
        chunks[-2].extend(chunks[-1])
        chunks.pop()
    
    print(f"Created {len(chunks)} chunks for {num_processes} processes")
    
    process_args = []
    for i, chunk in enumerate(chunks):
        for idx, (name, url) in enumerate(chunk):
            global_idx = sum(len(c) for c in chunks[:i]) + idx
            process_args.append((name, url, i, len(equipment_data), global_idx, all_variants))
    
    processed_items = 0
    checkpoint_interval = 100
    total_items = len(process_args)
    
    with Pool(processes=num_processes) as pool:
        for batch in tqdm(pool.imap(scrape_equipment, process_args), total=total_items, desc="Scraping equipment"):
            all_variants.extend(batch)
            processed_items += 1
            if processed_items % checkpoint_interval == 0:
                temp_variants = list(all_variants)
                print(f"Saved checkpoint at item {processed_items} with {len(temp_variants)} variants (stored in database)")
    
    # Aggregate results for Excel output
    rows = []
    for variant in all_variants:
        row = {
            "id": variant["id"],
            "club_id": variant["club_id"],
            "type": variant["type"],
            "subType": variant["subType"],
            "specificType": variant.get("specificType", ""),
            "brand": variant["brand"],
            "model": variant["model"],
            "price": variant["price"],
            "loft": variant.get("loft", ""),
            "shaftMaterial": variant.get("shaftMaterial", ""),
            "setMakeup": variant.get("setMakeup", ""),
            "length": variant.get("length", ""),
            "bounce": variant.get("bounce", ""),
            "handicapperLevel": variant["handicapperLevel"],
            "category": variant["category"],
            "description": variant["description"],
            "retailer": variant["prices"][0]["retailer"],
            "retailer_price": variant["prices"][0]["price"],
            "url": variant["prices"][0]["url"],
            "image": variant.get("image", "")
        }
        rows.append(row)
    
    df = pd.DataFrame(rows)
    df.to_excel("equipment_details.xlsx", sheet_name="equipment_details", index=False)
    print("Equipment details saved to equipment_details.xlsx.")
    
    return list(all_variants)

if __name__ == "__main__":
    try:
        equipment_details = scrape_driver_details()
        if not equipment_details:
            print("No equipment details found. Check the logs for errors.")
        else:
            print(f"Total variants processed: {len(equipment_details)}")
    except Exception as e:
        print(f"Script failed: {e}")