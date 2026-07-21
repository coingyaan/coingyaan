# articles/  — one generated thumbnail per article

Filled automatically by build_news.mjs + build_og.py. Each article produces:
- {slug}.svg   crisp master used for the on-page hero source
- {slug}.png   1200x630 raster for Open Graph and Twitter

Do not hand-edit. Regenerating an article overwrites its files. Scales to
hundreds of articles; filename is the article slug.
