#!/usr/bin/env bash
# og-asta.sh — 1200x630 social preview for the AStA Newsletter Email Builder.
#
# Adapted from maxstridde/social_preview (og-advanced.sh). The framed-card
# layout is kept, but instead of cropping a photo into the card we *fit* the
# AStA logo onto a white card, on the AStA brand-red background.
#
# Usage:  ./og-asta.sh [output.png]   (default: asta-og.png)
#
# Requires ImageMagick 7 (`magick`). The AStA logo SVG is read from ../src/img.

set -euo pipefail

# ------------------------------------------------------------------ config
SUBTITLE="AStA Uni Bonn"
TITLE_1="Newsletter"
TITLE_2="Builder"
BTN_TEXT="Create now"

# Logo (SVG, black paths) — recolored to brand red and placed on the white card.
LOGO_SVG="$(dirname "$0")/../src/img/AStA Logo.svg"
LOGO_COL='#85152A'     # AStA brand red — the logo color on the white card

# Fonts — point these at .ttf files you actually have.
FONT_TITLE="${HOME}/Library/Fonts/Poppins-ExtraBold.ttf"
FONT_SUB="${HOME}/Library/Fonts/Poppins-SemiBold.ttf"
FONT_BTN="${HOME}/Library/Fonts/Poppins-SemiBold.ttf"

# Background gradient (top -> bottom) — AStA brand red
BG_TOP='#9A1B33'
BG_BOT='#690F21'

# Card the logo sits on
CARD_COL='#ffffff'

# Accent shapes peeking out behind the card — warm gold/cream family
S1='#E8B84B'   # gold  — rounded rect, top-left
S2='#F3EAD8'   # cream — rounded rect, bottom-right
S3='#EBC976'   # gold  — circle, top-right

# Text & button colors
TITLE_COL='#ffffff'
SUB_COL='#F4DCC6'
BTN_COL='#ffffff'
BTN_TEXT_COL='#85152A'
# ------------------------------------------------------------------------

OUTPUT="${1:-asta-og.png}"

if [[ ! -f "$LOGO_SVG" ]]; then
  echo "Logo not found: $LOGO_SVG" >&2
  exit 1
fi
for f in "$FONT_TITLE" "$FONT_SUB" "$FONT_BTN"; do
  if [[ ! -f "$f" ]]; then
    echo "Font not found: $f" >&2
    echo "Edit FONT_* at the top of this script to point at .ttf files you have installed." >&2
    exit 1
  fi
done

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# Landscape card box (the AStA logo is a wide mark)
BOX_W=470; BOX_H=360
FRAME_W=$((BOX_W+24)); FRAME_H=$((BOX_H+24))
BX=70; BY=$(( (630-FRAME_H)/2 ))

# 1) rasterize the logo at high density, recolor black -> brand red (keep alpha),
#    and fit it inside the card with padding (contain, never crop/distort).
LOGO_W=$((BOX_W-110)); LOGO_H=$((BOX_H-150))
magick -background none -density 600 "$LOGO_SVG" \
  -channel RGB -fill "$LOGO_COL" -colorize 100 +channel \
  -resize ${LOGO_W}x${LOGO_H} "$TMP/logo.png"

# 2) white card with the logo centered on it, rounded corners
magick -size ${BOX_W}x${BOX_H} xc:none -fill "$CARD_COL" \
  -draw "roundrectangle 0,0,$((BOX_W-1)),$((BOX_H-1)),30,30" \
  "$TMP/logo.png" -gravity center -composite "$TMP/card.png"

# 3) white frame around the card
magick -size ${FRAME_W}x${FRAME_H} xc:none -fill "$CARD_COL" \
  -draw "roundrectangle 0,0,$((FRAME_W-1)),$((FRAME_H-1)),36,36" \
  "$TMP/card.png" -gravity center -composite "$TMP/framed.png"

# 4) soft shadow under the frame
magick -size $((FRAME_W+80))x$((FRAME_H+80)) xc:none -fill 'rgba(0,0,0,0.28)' \
  -draw "roundrectangle 40,40,$((FRAME_W+39)),$((FRAME_H+39)),36,36" -blur 0x26 "$TMP/shadow.png"

# 4b) thin top accent line — the three accent colors blended across the width
magick \( -size 8x600 gradient:"$S2"-"$S1" -rotate 90 \) \
       \( -size 8x600 gradient:"$S3"-"$S2" -rotate 90 \) \
       +append -resize 1200x8\! "$TMP/topline.png"

# 5) decorative shapes
magick -size 300x380 xc:none -fill "$S1" -draw 'roundrectangle 0,0,299,379,46,46' -background none -rotate -10 "$TMP/s1.png"
magick -size 300x300 xc:none -fill "$S2" -draw 'roundrectangle 0,0,299,299,46,46' -background none -rotate  9 "$TMP/s2.png"
magick -size 150x150 xc:none -fill "$S3" -draw 'circle 75,75 75,5' "$TMP/s3.png"

# 6) pill button
magick -size 320x84 xc:none -fill "$BTN_COL" -draw 'roundrectangle 0,0,319,83,42,42' \
  -font "$FONT_BTN" -fill "$BTN_TEXT_COL" -gravity center -pointsize 34 -annotate +0+0 "$BTN_TEXT" "$TMP/button.png"

# 7) background
magick -size 1200x630 gradient:"$BG_TOP"-"$BG_BOT" "$TMP/bg.png"

# offsets derived from the box, so the layout stays coherent
S1X=$((BX-20));          S1Y=$((BY-34))
S3X=$((BX+FRAME_W-95));  S3Y=$((BY-38))
S2X=$((BX+FRAME_W-170)); S2Y=$((BY+FRAME_H-180))
SHX=$((BX-40));          SHY=$((BY-22))
TX=$((BX+FRAME_W+55))
TITLE_PT=74

# 8) compose
magick "$TMP/bg.png" \
  "$TMP/s1.png" -geometry +${S1X}+${S1Y} -compose over -composite \
  "$TMP/s3.png" -geometry +${S3X}+${S3Y} -compose over -composite \
  "$TMP/s2.png" -geometry +${S2X}+${S2Y} -compose over -composite \
  "$TMP/shadow.png" -geometry +${SHX}+${SHY} -compose over -composite \
  "$TMP/framed.png" -geometry +${BX}+${BY} -compose over -composite \
  -font "$FONT_SUB"   -fill "$SUB_COL"   -gravity northwest -pointsize 38 -annotate +$((TX+4))+150 "$SUBTITLE" \
  -font "$FONT_TITLE" -fill "$TITLE_COL" -pointsize ${TITLE_PT} -annotate +${TX}+195 "$TITLE_1" \
  -font "$FONT_TITLE" -fill "$TITLE_COL" -pointsize ${TITLE_PT} -annotate +${TX}+283 "$TITLE_2" \
  "$TMP/button.png" -gravity northwest -geometry +${TX}+400 -compose over -composite \
  "$TMP/topline.png" -gravity north -geometry +0+0 -compose over -composite \
  "$OUTPUT"

echo "Wrote $OUTPUT"
