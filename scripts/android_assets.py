"""把 App 圖示與啟動畫面套用到 Capacitor 產生的 android 專案（在 GitHub Actions 中執行）。"""
import pathlib, shutil
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'
ICON = Image.open(ROOT / 'app' / 'icons' / 'icon-512.png').convert('RGBA')
BG = (15, 92, 77, 255)

for d, size in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    out = RES / f'mipmap-{d}'
    out.mkdir(parents=True, exist_ok=True)
    im = ICON.resize((size, size), Image.LANCZOS)
    for n in ('ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'):
        im.save(out / n)
shutil.rmtree(RES / 'mipmap-anydpi-v26', ignore_errors=True)

for p in RES.glob('drawable*/splash.png'):
    w, h = Image.open(p).size
    canvas = Image.new('RGBA', (w, h), BG)
    s = int(min(w, h) * 0.35)
    icon = ICON.resize((s, s), Image.LANCZOS)
    canvas.paste(icon, ((w - s) // 2, (h - s) // 2), icon)
    canvas.convert('RGB').save(p)
print('android 圖示與啟動畫面已更新')
