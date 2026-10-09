# Product photos

Save your product photos in this folder. The shop looks for them here.

## Multiple photos per product (swipeable gallery)

If a product has more than one photo, list them in `js/products.js` with an
`images` array instead of a single `image` line. The card then becomes a
**swipeable gallery** — swipe on a phone, arrow keys or hover-arrows on a
desktop, with dots and a `1/3` counter.

Name the files with a `_1`, `_2`, `_3` suffix so the order is obvious:

```js
images: [
  "images/products/example_1.png",
  "images/products/example_2.png",
  "images/products/example_3.png"
]
```

- **Order matters** — the first entry is shown first.
- The first image is also used as the thumbnail in the basket.
- Three is a good number. Two is fine. Above five gets fiddly on a phone.
- A product with one photo can keep using the plain `image:` line; it will
  simply not get arrows or dots.
- **For a gallery, vary the angle** — a full shot, a close-up of a detail,
  and the item in use spreads best.

## Required filenames

The site expects these exact names (all lowercase, dashes, `.jpg`). If a file
is missing, the card shows a gold placeholder printing that filename — so you
never have to guess.

| Filename                 | Product                |
| ------------------------ | ---------------------- |
| `ibex-shea-butter.jpg`   | Raw Shea Butter        |
| `ibex-braid-oil.jpg`     | Braid & Scalp Oil      |
| `ibex-braiding-hair.jpg` | Premium Braiding Hair  |
| `ibex-edge-control.jpg`  | Edge Control Gel       |
| `ibex-wig-cap.jpg`       | Wig Cap & Net Set      |
| `ibex-glow-serum.jpg`    | Radiance Facial Serum  |
| `jaja-linen-blazer.jpg`  | Linen Blend Blazer     |
| `jaja-silk-scarf.jpg`    | Printed Silk Scarf     |
| `jaja-denim-jacket.jpg`  | Vintage Denim Jacket   |
| `jaja-pleated-midi.jpg`  | Pleated Midi Dress     |
| `jaja-leather-bag.jpg`   | Structured Leather Bag |
| `jaja-ankara-shirt.jpg`  | Ankara Print Shirt     |
| `d2d-chocolate-cake.jpg` | Chocolate Fudge Cake   |
| `d2d-red-velvet.jpg`     | Red Velvet Cake        |
| `d2d-cupcake-box.jpg`    | Cupcake Box (12)       |
| `d2d-small-chops.jpg`    | Small Chops Platter    |
| `d2d-jollof-pack.jpg`    | Jollof & Chicken Pack  |
| `d2d-dinner-for-two.jpg` | Dinner for Two         |

If you add or rename a product, add or rename the matching photo and update
the `image:` line (or the `images:` list) in `js/products.js`.

## How to shoot them (quick guide)

- **Square photos work best.** The cards crop to a square, so shoot roughly
  1:1 or crop before saving.
- **Bright, even light.** Natural daylight near a window beats a flash.
- **Plain background.** Bedsheet, wall or tablecloth. Keep it clean.
- **Phone is fine.** You do not need a camera.
- **Keep files under ~300KB.** Huge photos make the shop slow on mobile data.
  Any free "image compressor" app will do it.

## Supported formats

`.jpg`, `.png` and `.webp` all work. For photographs, `.jpg` or `.webp` gives
a much smaller file for the same quality, which matters on mobile data. Use
`.png` when you need a transparent background or a sharp product cut-out.

Just match the extension in `js/products.js` to the file on disk:
`"images/products/name.jpg"` for a JPEG, `"images/products/name.png"` for a
PNG, and so on.
