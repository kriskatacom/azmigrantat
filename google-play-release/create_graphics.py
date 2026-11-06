from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / "app" / "chat-app" / "assets" / "images" / "eto-me.png"
OUT = ROOT / "graphics"


def contain(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    copy = image.copy()
    copy.thumbnail(box, Image.Resampling.LANCZOS)
    return copy


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    path = Path("/usr/share/fonts/truetype/dejavu") / name
    return ImageFont.truetype(str(path), size=size)


def create_icon(logo: Image.Image) -> None:
    canvas = Image.new("RGBA", (512, 512), (14, 53, 69, 255))
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.ellipse((45, 45, 467, 467), fill=(23, 78, 96, 255))
    draw.ellipse((75, 75, 437, 437), outline=(158, 201, 214, 80), width=3)
    mark = contain(logo, (340, 340))
    canvas.alpha_composite(mark, ((512 - mark.width) // 2, (512 - mark.height) // 2))
    canvas.save(OUT / "play-icon-512.png", optimize=True)


def create_feature_graphic(logo: Image.Image) -> None:
    width, height = 1024, 500
    canvas = Image.new("RGB", (width, height))
    pixels = canvas.load()
    left = (8, 39, 53)
    right = (23, 88, 105)
    for x in range(width):
        ratio = x / (width - 1)
        color = tuple(round(left[i] * (1 - ratio) + right[i] * ratio) for i in range(3))
        for y in range(height):
            pixels[x, y] = color

    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.ellipse((-110, -150, 430, 390), fill=(40, 124, 143, 42))
    draw.ellipse((35, 120, 425, 510), outline=(158, 201, 214, 75), width=3)
    draw.ellipse((780, -170, 1170, 220), fill=(232, 226, 150, 28))
    for x, y, radius in [(92, 110, 9), (180, 70, 7), (365, 108, 8), (85, 382, 7), (375, 390, 10)]:
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(232, 226, 150, 180))
    for start, end in [((92, 110), (180, 70)), ((180, 70), (365, 108)), ((85, 382), (375, 390))]:
        draw.line((start, end), fill=(158, 201, 214, 75), width=2)

    mark = contain(logo, (300, 300))
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    overlay.alpha_composite(mark, (95, (height - mark.height) // 2))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(canvas, "RGBA")

    title_font = font(84, bold=True)
    subtitle_font = font(30)
    draw.text((465, 145), "Ето ме", font=title_font, fill=(255, 255, 255, 255))
    draw.rounded_rectangle((465, 252, 885, 316), radius=30, fill=(232, 226, 150, 235))
    draw.text((492, 266), "Чат • разговори • видео", font=subtitle_font, fill=(14, 53, 69, 255))
    draw.text((468, 345), "Свързани, където и да сте", font=font(25), fill=(190, 222, 231, 255))
    canvas.convert("RGB").save(OUT / "feature-graphic-1024x500.png", optimize=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    logo = Image.open(SOURCE).convert("RGBA")
    create_icon(logo)
    create_feature_graphic(logo)


if __name__ == "__main__":
    main()
