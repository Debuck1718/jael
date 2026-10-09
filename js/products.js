/* ==========================================================================
   JAEL'S EMPIRE — CATALOGUE
   ==========================================================================

   >>> THIS IS THE ONLY FILE YOU NEED TO EDIT TO RUN YOUR SHOP. <<<

   Everything the shop shows — products, prices, photos, options — comes
   from the PRODUCTS array below. The cart, checkout, MoMo payment summary
   and WhatsApp order message all read from it automatically.

   ---------------------------------------------------------------------------
   HOW TO ADD OR CHANGE A PRODUCT
   ---------------------------------------------------------------------------

   1. Drop your photo into:  images/products/
      Name it in lowercase with dashes, e.g.  ibex-shea-butter.jpg
      (Use .jpg or .webp. Keep photos under ~300KB so phones load fast.)

   2. Copy one block below, paste it into the array, and edit the fields.

   ---------------------------------------------------------------------------
   FIELD REFERENCE
   ---------------------------------------------------------------------------

   id       Unique short code. Lowercase, dashes only. NEVER reuse or
            change an id after launch — saved customer carts reference it.

   name     Product name shown on the card and in the order message.

   brand    Must be exactly one of the three brand ids:
              "ibex"     -> Ibex Haute Opulence  (Luxury Braids & Beauty)
              "jaja"     -> Jajashriftshop       (Affordable Thrift)
              "d2d"      -> dessertstodeinners   (Desserts & Dinners)

   price    Price in Ghana Cedis (GHS). Numbers only — no "GHS", no commas.
            Use a decimal for pesewas, e.g. 149.50

   oldPrice Optional. Shown struck through as a "was" price for a deal.
            Omit the line entirely (or set null) if the item is not on sale.

   image    Path to your photo inside images/products/.
            If the file is missing, the card shows a gold placeholder that
            prints this exact filename so you know what to save where.

            For a product with SEVERAL photos, use `images` instead.

   images   Optional array of photo paths, for a product with more than one
            picture. Turns the product card into a swipeable gallery: swipe
            on a phone, arrow keys or the on-screen arrows on a desktop, with
            dots showing which photo you are on.

            Name the files with a _1, _2, _3 suffix, e.g.

              images: [
                "images/products/example_1.png",
                "images/products/example_2.png",
                "images/products/example_3.png"
              ]

            Order matters - index 0 is shown first. The first image is also
            used as the basket thumbnail. If both `images` and `image` are
            set, `images` wins.

   desc     One or two short sentences. Keep it under ~120 characters —
            longer text gets cut off on the card.

   tag      Optional short badge, e.g. "Best Seller", "New", "Limited".
            Leave as "" for no badge.

   options  Optional list of choices the customer must pick before adding to
            cart (sizes, flavours, braid lengths...). A pop-up asks them to
            choose. Leave as [] if the item has no options.

            IMPORTANT: if you change the option name, review the "soldOut"
            lines further down this file — they refer to option values.

   soldOut  Optional. true = shows "Sold Out" and blocks adding to cart.
            Use for items you have run out of. Remove the line to re-enable.

   ---------------------------------------------------------------------------
   NOTES ON PLACEHOLDER CONTENT
   ---------------------------------------------------------------------------

   The products below are PLACEHOLDERS written to give you a working shop to
   test. Replace the names, the descriptions and — most importantly — the
   PRICES with your real ones before you share this site with customers.
   The prices are plausible Accra market rates, not your rates.
   ========================================================================== */

window.JAEL_BRANDS = [
  {
    id: "ibex",
    name: "Ibex Haute Opulence",
    category: "Luxury Braids & Beauty",
  },
  {
    id: "jaja",
    name: "Jajashriftshop",
    category: "Affordable Thrift & Premium Quality",
  },
  {
    id: "d2d",
    name: "dessertstodeinners",
    category: "Premium Desserts & Dinners",
  },
];

window.JAEL_PRODUCTS = [
  /* ======================================================================
     BRAND 01 — IBEX HAUTE OPULENCE
     ====================================================================== */

  {
    id: "ibex-shea-butter",
    name: "Raw Shea Butter",
    brand: "ibex",
    price: 65,
    oldPrice: 85,
    image: "images/products/ibex-shea-butter.jpg",
    desc: "Unrefined Ghanaian shea, hand-whipped. Deep moisture for skin and scalp.",
    tag: "Best Seller",
    options: [],
    soldOut: false,
  },
  {
    id: "ibex-braid-oil",
    name: "Braid & Scalp Oil",
    brand: "ibex",
    price: 45,
    oldPrice: null,
    image: "images/products/ibex-braid-oil.jpg",
    desc: "Light blend that soothes tight braids and keeps the scalp calm.",
    tag: "",
    options: [],
    soldOut: false,
  },
  {
    id: "ibex-braiding-hair",
    name: "Premium Braiding Hair",
    brand: "ibex",
    price: 30,
    oldPrice: null,
    image: "images/products/ibex-braiding-hair.jpg",
    desc: "Soft, tangle-free pre-stretched hair. Holds a neat braid for weeks.",
    tag: "",
    options: [{ name: "Colour", values: ["Black", "Dark Brown", "Burgundy"] }],
    soldOut: false,
  },
  {
    id: "ibex-edge-control",
    name: "Edge Control Gel",
    brand: "ibex",
    price: 35,
    oldPrice: null,
    image: "images/products/ibex-edge-control.jpg",
    desc: "Strong hold with no white flaking. Lays edges flat all day.",
    tag: "New",
    options: [],
    soldOut: false,
  },
  {
    id: "ibex-wig-cap",
    name: "Wig Cap & Net Set",
    brand: "ibex",
    price: 20,
    oldPrice: null,
    image: "images/products/ibex-wig-cap.jpg",
    desc: "Breathable caps and nets. Comfortable base for wigs and braids.",
    tag: "",
    options: [],
    soldOut: false,
  },
  {
    id: "ibex-glow-serum",
    name: "Radiance Facial Serum",
    brand: "ibex",
    price: 120,
    oldPrice: 150,
    image: "images/products/ibex-glow-serum.jpg",
    desc: "Evening-out vitamin serum for a soft, natural glow.",
    tag: "Limited",
    options: [],
    soldOut: true,
  },

  /* ======================================================================
     BRAND 02 — JAJASHRIFTSHOP
     ====================================================================== */

  {
    id: "jaja-linen-blazer",
    name: "Linen Blend Blazer",
    brand: "jaja",
    price: 180,
    oldPrice: 260,
    image: "images/products/jaja-linen-blazer.jpg",
    desc: "Unstructured, breathable, sharp. Works over everything.",
    tag: "Best Seller",
    options: [{ name: "Size", values: ["S", "M", "L", "XL"] }],
    soldOut: false,
  },
  {
    id: "jaja-silk-scarf",
    name: "Printed Silk Scarf",
    brand: "jaja",
    price: 55,
    oldPrice: null,
    image: "images/products/jaja-silk-scarf.jpg",
    desc: "Vintage print scarf. Wear it on the neck, hair or bag.",
    tag: "",
    options: [],
    soldOut: false,
  },
  {
    id: "jaja-denim-jacket",
    name: "Vintage Denim Jacket",
    brand: "jaja",
    price: 220,
    oldPrice: 300,
    image: "images/products/jaja-denim-jacket.jpg",
    desc: "Genuine washed denim with that broken-in feel. One of a kind.",
    tag: "",
    options: [{ name: "Size", values: ["M", "L", "XL"] }],
    soldOut: false,
  },
  {
    id: "jaja-pleated-midi",
    name: "Pleated Midi Dress",
    brand: "jaja",
    price: 150,
    oldPrice: null,
    image: "images/products/jaja-pleated-midi.jpg",
    desc: "Flowing pleats, easy fit. Dressed up or down.",
    tag: "New",
    options: [{ name: "Size", values: ["S", "M", "L"] }],
    soldOut: false,
  },
  {
    id: "jaja-leather-bag",
    name: "Structured Leather Bag",
    brand: "jaja",
    price: 240,
    oldPrice: 320,
    image: "images/products/jaja-leather-bag.jpg",
    desc: "Real leather, holds its shape. Roomy enough for the day.",
    tag: "",
    options: [{ name: "Colour", values: ["Tan", "Black"] }],
    soldOut: false,
  },
  {
    id: "jaja-ankara-shirt",
    name: "Ankara Print Shirt",
    brand: "jaja",
    price: 130,
    oldPrice: null,
    image: "images/products/jaja-ankara-shirt.jpg",
    desc: "Bold Ankara cut into an easy everyday shirt.",
    tag: "",
    options: [{ name: "Size", values: ["S", "M", "L", "XL"] }],
    soldOut: false,
  },

  /* ======================================================================
     BRAND 03 — DESSERTSTODINNERS
     ====================================================================== */

  {
    id: "d2d-chocolate-cake",
    name: "Chocolate Fudge Cake",
    brand: "d2d",
    price: 320,
    oldPrice: null,
    image: "images/products/d2d-chocolate-cake.jpg",
    desc: "Rich, moist fudge layers with a deep cocoa finish.",
    tag: "Best Seller",
    options: [{ name: "Size", values: ["6 inch", "8 inch", "10 inch"] }],
    soldOut: false,
  },
  {
    id: "d2d-red-velvet",
    name: "Red Velvet Cake",
    brand: "d2d",
    price: 340,
    oldPrice: 400,
    image: "images/products/d2d-red-velvet.jpg",
    desc: "Classic red velvet with cream cheese frosting.",
    tag: "",
    options: [{ name: "Size", values: ["6 inch", "8 inch"] }],
    soldOut: false,
  },
  {
    id: "d2d-cupcake-box",
    name: "Cupcake Box (12)",
    brand: "d2d",
    price: 180,
    oldPrice: null,
    image: "images/products/d2d-cupcake-box.jpg",
    desc: "A dozen assorted cupcakes, boxed for sharing.",
    tag: "",
    options: [{ name: "Flavour", values: ["Vanilla", "Chocolate", "Mixed"] }],
    soldOut: false,
  },
  {
    id: "d2d-small-chops",
    name: "Small Chops Platter",
    brand: "d2d",
    price: 250,
    oldPrice: null,
    image: "images/products/d2d-small-chops.jpg",
    desc: "Puff-puff, spring rolls and samosas. Made for a crowd.",
    tag: "",
    options: [],
    soldOut: false
  },
  {
    id: "d2d-jollof-pack",
    name: "Jollof & Chicken Pack",
    brand: "d2d",
    price: 120,
    oldPrice: 140,
    image: "images/products/d2d-jollof-pack.jpg",
    desc: "Smoky party jollof with grilled chicken and salad.",
    tag: "",
    options: [{ name: "Portion", values: ["Single", "Double"] }],
    soldOut: false,
  },
  {
    id: "d2d-dinner-for-two",
    name: "Dinner for Two",
    brand: "d2d",
    price: 550,
    oldPrice: null,
    image: "images/products/d2d-dinner-for-two.jpg",
    desc: "Chef-prepared three courses, plated and delivered.",
    tag: "Limited",
    options: [],
    soldOut: false,
  },
];
