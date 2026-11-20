import hashlib
import io
from PIL import Image, ImageDraw, ImageFont
from django.core.files.base import ContentFile

CATEGORY_PALETTES = {
    "electronics": {"bg": (26, 38, 57), "card": (36, 52, 77), "accent": (56, 189, 248), "text": (248, 250, 252)},
    "fashion": {"bg": (67, 30, 42), "card": (88, 40, 56), "accent": (251, 191, 36), "text": (255, 251, 235)},
    "home": {"bg": (41, 53, 44), "card": (54, 70, 58), "accent": (217, 119, 6), "text": (254, 252, 232)},
    "books": {"bg": (30, 41, 59), "card": (45, 58, 80), "accent": (168, 85, 247), "text": (243, 244, 246)},
    "beauty": {"bg": (43, 58, 53), "card": (58, 77, 71), "accent": (52, 211, 153), "text": (240, 253, 244)},
}

def get_palette_for_category(category_slug: str):
    slug_lower = category_slug.lower()
    for key, palette in CATEGORY_PALETTES.items():
        if key in slug_lower:
            return palette
    return {"bg": (30, 41, 59), "card": (47, 63, 86), "accent": (96, 165, 250), "text": (255, 255, 255)}

def generate_product_image_file(product_name: str, category_slug: str, sku: str, variant_index: int) -> tuple[str, ContentFile]:
    """
    Generates a deterministic 800x800 JPEG image for demo products with 3 distinct compositions.
    Returns (filename, ContentFile).
    """
    palette = get_palette_for_category(category_slug)
    width, height = 800, 800

    # Deterministic seed variation per variant
    seed = int(hashlib.md5(f"{sku}_{variant_index}".encode("utf-8")).hexdigest()[:8], 16)

    # Variant configurations
    variant_labels = {
        0: ("PRIMARY VIEW", "Featured Showcase", "Galla Verified Merchant"),
        1: ("ANGLE & PERSPECTIVE", "Dimensional Profile", "Official Catalog Spec"),
        2: ("DETAIL & PACKAGING", "Quality & Craftsmanship", "100% Genuine Guaranteed"),
    }
    badge_title, sub_badge, footer_badge = variant_labels.get(
        variant_index, ("GALLA CATALOG", "Product View", "Authentic Demo Product")
    )

    # Shift background shade slightly per variant
    bg_r = min(255, max(0, palette["bg"][0] + (variant_index * 12)))
    bg_g = min(255, max(0, palette["bg"][1] + (variant_index * 8)))
    bg_b = min(255, max(0, palette["bg"][2] + (variant_index * 15)))
    bg_color = (bg_r, bg_g, bg_b)

    image = Image.new("RGB", (width, height), color=bg_color)
    draw = ImageDraw.Draw(image)

    # Distinct geometric composition per variant
    if variant_index == 0:
        # Primary: Elegant centered card with outer frame
        draw.rectangle([(24, 24), (776, 776)], outline=palette["accent"], width=3)
        draw.rounded_rectangle([(60, 60), (740, 740)], radius=24, fill=palette["card"], outline=palette["accent"], width=2)
        # Center decorative geometric backdrop
        draw.ellipse([(260, 200), (540, 480)], outline=palette["accent"], width=4)
        draw.rectangle([(320, 260), (480, 420)], fill=palette["bg"], outline=palette["accent"], width=2)
    elif variant_index == 1:
        # Alternate: Angled isometric-style geometric composition
        draw.rectangle([(24, 24), (776, 776)], outline=(120, 140, 160), width=2)
        draw.rounded_rectangle([(60, 60), (740, 740)], radius=16, fill=palette["card"])
        # Cross-grid diamond background
        draw.polygon([(400, 180), (620, 340), (400, 500), (180, 340)], outline=palette["accent"], width=3)
        draw.polygon([(400, 230), (550, 340), (400, 450), (250, 340)], fill=palette["bg"])
    else:
        # Detail / Packaging: Clean technical layout with inner header and spec box
        draw.rectangle([(24, 24), (776, 776)], outline=palette["accent"], width=4)
        draw.rounded_rectangle([(60, 60), (740, 740)], radius=8, fill=palette["card"])
        # Inspection focus grid
        draw.line([(180, 340), (620, 340)], fill=palette["accent"], width=2)
        draw.line([(400, 180), (400, 500)], fill=palette["accent"], width=2)
        draw.ellipse([(330, 270), (470, 410)], outline=palette["accent"], width=3)

    # Fonts
    try:
        font_header = ImageFont.load_default(size=18)
        font_title = ImageFont.load_default(size=26)
        font_badge = ImageFont.load_default(size=16)
        font_meta = ImageFont.load_default(size=18)
    except TypeError:
        # Fallback for older Pillow
        font_header = ImageFont.load_default()
        font_title = ImageFont.load_default()
        font_badge = ImageFont.load_default()
        font_meta = ImageFont.load_default()

    # Top brand banner
    draw.text((90, 85), "GALLA MARKETPLACE", font=font_header, fill=palette["accent"])
    draw.text((620, 85), f"#{variant_index + 1}/3", font=font_header, fill=(200, 210, 225))

    # Variant badge pill
    pill_box = [(90, 125), (320, 165)]
    draw.rounded_rectangle(pill_box, radius=8, fill=palette["accent"])
    draw.text((105, 135), badge_title, font=font_badge, fill=(20, 25, 35))

    # Sub badge
    draw.text((340, 135), f"•  {sub_badge}", font=font_badge, fill=palette["text"])

    # Center label: SKU and Category
    draw.text((400, 325), sku, font=font_meta, fill=palette["accent"], anchor="mm")
    draw.text((400, 355), category_slug.replace("-", " ").title(), font=font_badge, fill=(180, 195, 210), anchor="mm")

    # Bottom Product Title box
    name_display = product_name if len(product_name) <= 45 else product_name[:42] + "..."
    draw.rounded_rectangle([(85, 560), (715, 640)], radius=12, fill=palette["bg"], outline=palette["accent"], width=1)
    draw.text((400, 600), name_display, font=font_title, fill=palette["text"], anchor="mm")

    # Footer verification badge
    draw.text((400, 680), footer_badge, font=font_meta, fill=palette["accent"], anchor="mm")
    draw.text((400, 710), "Demonstration Asset • Local Pillow Generated", font=font_badge, fill=(148, 163, 184), anchor="mm")

    # Output to JPEG stream
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=90, optimize=True)
    file_bytes = buffer.getvalue()
    buffer.close()

    clean_sku = sku.lower().replace("-", "_")
    filename = f"demo_{clean_sku}_v{variant_index}.jpg"
    return filename, ContentFile(file_bytes, name=filename)
