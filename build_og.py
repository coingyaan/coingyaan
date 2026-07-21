#!/usr/bin/env python3
"""Render every news article cover.svg to cover.png (1200x630) for OG/Twitter.
Run after build_news.mjs:  python3 build_og.py"""
import glob, os, sys
try:
    import cairosvg
except ImportError:
    print("cairosvg not installed; run: pip install cairosvg --break-system-packages")
    sys.exit(1)

root = os.path.dirname(os.path.abspath(__file__))
covers = glob.glob(os.path.join(root, "news", "**", "cover.svg"), recursive=True)
done = 0
for svg in covers:
    png = svg[:-4] + ".png"
    try:
        cairosvg.svg2png(url=svg, write_to=png, output_width=1200, output_height=630)
        done += 1
    except Exception as e:
        print("FAILED", svg, e)
print(f"{done} OG image(s) rendered")
