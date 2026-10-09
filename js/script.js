/* ==========================================================================
   JAEL'S EMPIRE — Shop scripts
   ==========================================================================

   CONTENTS
     1.  CONFIG + STATE
     2.  HELPERS
     3.  CATALOGUE INTEGRITY
     4.  SHOP RENDERING (grid + brand filters)
     5.  CART ENGINE (localStorage persistence)
     6.  CART DRAWER UI
     7.  PRODUCT OPTIONS MODAL
     8.  CHECKOUT (WhatsApp + MoMo)
     9.  CONTACT FORM
     10. TOAST
     11. PANEL / OVERLAY MANAGER
     12. ORIGINAL PAGE BEHAVIOUR
     13. EVENT WIRING + BOOT
   ========================================================================== */

(function () {
  "use strict";

  /* ======================================================================
     1. CONFIG + STATE
     ====================================================================== */

  var CONFIG = window.JAEL_CONFIG || {};

  var WHATSAPP = CONFIG.whatsappNumber || "233206724129";
  var CURRENCY = CONFIG.currency || "GHS";
  var DELIVERY_FEE = Number(CONFIG.deliveryFee) || 0;
  var FREE_DELIVERY_OVER = Number(CONFIG.freeDeliveryOver) || 0;

  var PRODUCTS = window.JAEL_PRODUCTS || [];
  var BRANDS = window.JAEL_BRANDS || [];

  /* localStorage key. Changing this abandons every saved basket. */
  var CART_KEY = "jaels-empire-cart-v1";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* In-memory mirror of the saved basket. Each entry:
     { id, qty, options: { "Size": "M" } } */
  var cart = [];

  /* Brand currently shown in the grid. "all" or a brand id. */
  var activeBrand = "all";

  /* Product awaiting an option choice, if any. */
  var pendingProduct = null;

  /* Element that had focus before a panel opened, so we can restore it. */
  var lastFocused = null;

  /* ======================================================================
     2. HELPERS
     ====================================================================== */

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call(
      (scope || document).querySelectorAll(selector)
    );
  }

  /* Look up a product by id. Returns undefined if the id is unknown. */
  function findProduct(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) return PRODUCTS[i];
    }
    return undefined;
  }

  function findBrand(id) {
    for (var i = 0; i < BRANDS.length; i++) {
      if (BRANDS[i].id === id) return BRANDS[i];
    }
    return undefined;
  }

  /* Human brand name for a product, falling back to the raw id. */
  function brandName(brandId) {
    var brand = findBrand(brandId);
    return brand ? brand.name : brandId;
  }

  /*
    Every photo for a product, as an array.

    Supports both catalogue shapes so older entries keep working:
      images: ["a_1.png", "a_2.png"]   -> multi-image gallery
      image:  "a.png"                 -> single image

    Anything unusable is filtered out, so a malformed entry degrades to
    the placeholder rather than throwing partway through rendering.
  */
  function productImages(product) {
    var list = [];

    if (Array.isArray(product.images)) {
      list = product.images;
    } else if (product.image) {
      list = [product.image];
    }

    return list.filter(function (src) {
      return typeof src === "string" && src.trim() !== "";
    });
  }

  /* The photo used as a thumbnail in the basket. */
  function primaryImage(product) {
    var list = productImages(product);
    return list.length ? list[0] : "";
  }

  /*
    Price formatting.

    Intl.NumberFormat with the GHS currency code renders inconsistently
    across browsers and ICU builds, so we format the number ourselves and
    prefix the currency label. That guarantees "GHS 1,250.00" everywhere.
  */
  function money(amount) {
    var value = Number(amount) || 0;
    var parts = value.toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return CURRENCY + " " + parts.join(".");
  }

  /* Escape anything from product data before it enters innerHTML. */
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function encode(text) {
    return encodeURIComponent(text);
  }

  /* ======================================================================
     3. CATALOGUE INTEGRITY
     Warns about catalogue mistakes while developing, so a typo in
     products.js does not silently hide a product or corrupt a basket.
     ====================================================================== */

  function checkCatalogue() {
    if (!PRODUCTS.length) {
      console.warn(
        "[Jael's Empire] js/products.js did not load, or JAEL_PRODUCTS is empty."
      );
      return;
    }

    var seen = {};

    PRODUCTS.forEach(function (product) {
      if (!product.id) {
        console.warn("[Jael's Empire] A product has no id:", product);
      }

      if (seen[product.id]) {
        console.warn(
          "[Jael's Empire] Duplicate product id '" +
            product.id +
            "'. Baskets key off id, so this merges two products."
        );
      }
      seen[product.id] = true;

      if (!findBrand(product.brand)) {
        console.warn(
          "[Jael's Empire] Product '" +
            product.id +
            "' uses unknown brand '" +
            product.brand +
            "'. Use one of: " +
            BRANDS.map(function (b) {
              return b.id;
            }).join(", ")
        );
      }

      if (typeof product.price !== "number") {
        console.warn(
          "[Jael's Empire] Product '" +
            product.id +
            "' has a non-numeric price. It will show as 0."
        );
      }
    });
  }

  /* ======================================================================
     4. SHOP RENDERING
     ====================================================================== */

  /*
    The photo area of a product card.

    With a single photo this is just the image over its placeholder.

    With two or more it becomes a gallery. The slides live in a
    horizontally scrollable track using CSS scroll-snap, which is what
    gives real momentum swiping on a phone for free, and still works if
    JS never runs. Arrows, dots and the counter are added on top and
    driven by the scroll position, so dragging, arrow keys, clicking a
    dot and the buttons all stay in sync through one source of truth.
  */
  function galleryHtml(product, badge) {
    var images = productImages(product);

    /* No photos configured: the placeholder says what to save. */
    if (!images.length) {
      return (
        '<div class="product-image">' +
        badge +
        '<div class="image-placeholder"><span>no image set</span></div>' +
        "</div>"
      );
    }

    var slides = images
      .map(function (src, index) {
        return (
          '<figure class="gallery-slide">' +
          '<div class="image-placeholder"><span>' +
          escapeHtml(src) +
          "</span></div>" +
          '<img src="' +
          escapeHtml(src) +
          '" alt="' +
          escapeHtml(
            product.name + (images.length > 1 ? " - view " + (index + 1) : "")
          ) +
          '" ' +
          /* Only the first photo loads eagerly; the rest wait. */
          (index === 0 ? 'loading="eager"' : 'loading="lazy"') +
          ' decoding="async" data-fallback data-slide="' +
          index +
          '">' +
          "</figure>"
        );
      })
      .join("");

    /* Single photo: no gallery chrome needed. */
    if (images.length === 1) {
      return (
        '<div class="product-image">' + badge + slides + "</div>"
      );
    }

    var dots = images
      .map(function (_, index) {
        return (
          '<button type="button" class="gallery-dot' +
          (index === 0 ? " is-active" : "") +
          '" data-goto="' +
          index +
          '" aria-label="Show photo ' +
          (index + 1) +
          " of " +
          images.length +
          '"></button>'
        );
      })
      .join("");

    return (
      '<div class="product-image has-gallery" data-gallery>' +
      badge +
      '<div class="gallery-viewport" data-gallery-viewport tabindex="0" ' +
      'role="group" aria-label="' +
      escapeHtml(product.name) +
      " photos. Use the arrow keys to browse." +
      '">' +
      '<div class="gallery-track">' +
      slides +
      "</div>" +
      "</div>" +
      /* Arrows are decoration on touch; hidden on small screens by CSS. */
      '<button type="button" class="gallery-arrow gallery-prev" data-gallery-prev ' +
      'aria-label="Previous photo">&lsaquo;</button>' +
      '<button type="button" class="gallery-arrow gallery-next" data-gallery-next ' +
      'aria-label="Next photo">&rsaquo;</button>' +
      '<span class="gallery-counter" data-gallery-counter>1/' +
      images.length +
      "</span>" +
      '<div class="gallery-dots">' +
      dots +
      "</div>" +
      "</div>"
    );
  }

  function renderFilters() {
    var wrap = $("#filters");
    if (!wrap) return;

    var html = [
      '<button type="button" class="filter-chip" data-brand="all" aria-pressed="true">All</button>'
    ];

    BRANDS.forEach(function (brand) {
      html.push(
        '<button type="button" class="filter-chip" data-brand="' +
          escapeHtml(brand.id) +
          '" aria-pressed="false">' +
          escapeHtml(brand.name) +
          "</button>"
      );
    });

    wrap.innerHTML = html.join("");
  }

  /* Products visible for the current filter. */
  function visibleProducts() {
    if (activeBrand === "all") return PRODUCTS.slice();
    return PRODUCTS.filter(function (product) {
      return product.brand === activeBrand;
    });
  }

  function productCardHtml(product) {
    var outOfStock = product.soldOut === true;

    var salePrice =
      typeof product.oldPrice === "number" && product.oldPrice > product.price;

    /* Corner badge: sold out wins, then discount, then the owner's tag. */
    var badge = "";
    if (outOfStock) {
      badge = '<span class="product-badge badge-sold-out">Sold Out</span>';
    } else if (salePrice) {
      var pct = Math.round(
        ((product.oldPrice - product.price) / product.oldPrice) * 100
      );
      badge = '<span class="product-badge">-' + pct + "%</span>";
    } else if (product.tag) {
      badge =
        '<span class="product-badge">' + escapeHtml(product.tag) + "</span>";
    }

    /*
      Image gallery.

      One photo renders a plain image. Two or more render a swipeable
      gallery with dots and arrows. Each <img> sits over the placeholder
      that prints its filename; a missing file removes just that slide.
    */
    var imageHtml = galleryHtml(product, badge);

    var priceHtml =
      '<div class="product-price-row">' +
      '<span class="product-price">' +
      money(product.price) +
      "</span>" +
      (salePrice
        ? '<span class="product-old-price">' +
          money(product.oldPrice) +
          "</span>"
        : "") +
      "</div>";

    var buttonHtml = outOfStock
      ? '<button type="button" class="add-to-cart" disabled>Sold Out</button>'
      : '<button type="button" class="add-to-cart" data-add="' +
        escapeHtml(product.id) +
        '">Add to Basket</button>';

    return (
      '<article class="product-card' +
      (outOfStock ? " is-sold-out" : "") +
      '">' +
      imageHtml +
      '<div class="product-info">' +
      '<p class="product-brand">' +
      escapeHtml(brandName(product.brand)) +
      "</p>" +
      '<h3 class="product-name">' +
      escapeHtml(product.name) +
      "</h3>" +
      '<p class="product-desc">' +
      escapeHtml(product.desc || "") +
      "</p>" +
      priceHtml +
      buttonHtml +
      "</div>" +
      "</article>"
    );
  }

  function renderProducts() {
    var grid = $("#productGrid");
    if (!grid) return;

    var list = visibleProducts();

    if (!list.length) {
      grid.innerHTML =
        '<p class="noscript-note">Nothing here yet. Check back soon, ' +
        "or message us on WhatsApp for the full catalogue.</p>";
    } else {
      grid.innerHTML = list
        .map(function (product) {
          return productCardHtml(product);
        })
        .join("");
    }

    /* Galleries are rebuilt with the grid, so re-bind them. */
    initGalleries(grid);

    /* Result count, announced via aria-live="polite". */
    var count = $("#resultCount");
    if (count) {
      count.textContent =
        list.length +
        (list.length === 1 ? " item" : " items") +
        (activeBrand === "all" ? "" : " · " + brandName(activeBrand));
    }
  }

  /*
    A missing photo would otherwise show the browser's broken-image icon
    over our placeholder. Remove the <img> instead.
  */
  function initImageFallback(scope) {
    $$("img[data-fallback]", scope).forEach(function (img) {
      img.addEventListener("error", function () {
        img.remove();
      });

      /* Catch images that failed before this handler attached. */
      if (img.complete && img.naturalWidth === 0) {
        img.remove();
      }
    });
  }

  function setBrandFilter(brandId) {
    activeBrand = brandId;

    $$(".filter-chip").forEach(function (chip) {
      chip.setAttribute(
        "aria-pressed",
        chip.getAttribute("data-brand") === brandId ? "true" : "false"
      );
    });

    renderProducts();
  }

  /* ======================================================================
     5. CART ENGINE
     ====================================================================== */

  /*
    Option choices are part of a line item's identity: the same product in
    two sizes is two separate lines, not one line of quantity 2.
  */
  function optionsKey(options) {
    if (!options) return "";
    return Object.keys(options)
      .sort()
      .map(function (name) {
        return name + ":" + options[name];
      })
      .join("|");
  }

  function saveCart() {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (error) {
      /*
        Private browsing, a full quota, or storage disabled. The basket
        still works for this visit; it just will not survive a reload.
      */
      console.warn(
        "[Jael's Empire] Could not save the basket in this browser:",
        error
      );
    }
  }

  function loadCart() {
    var raw;

    try {
      raw = window.localStorage.getItem(CART_KEY);
    } catch (error) {
      return;
    }

    if (!raw) return;

    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      /*
        Drop anything no longer in the catalogue or with a bad quantity, so
        a stale basket from an older products.js cannot break the page.
      */
      cart = parsed
        .filter(function (line) {
          return line && findProduct(line.id) && Number(line.qty) > 0;
        })
        .map(function (line) {
          return {
            id: line.id,
            qty: Math.max(1, Math.floor(Number(line.qty))),
            options: line.options || {}
          };
        });
    } catch (error) {
      console.warn(
        "[Jael's Empire] Saved basket was unreadable; starting fresh."
      );
      cart = [];
    }
  }

  /* Total number of individual items (the header badge). */
  function cartCount() {
    return cart.reduce(function (sum, line) {
      return sum + line.qty;
    }, 0);
  }

  function cartSubtotal() {
    return cart.reduce(function (sum, line) {
      var product = findProduct(line.id);
      return product ? sum + product.price * line.qty : sum;
    }, 0);
  }

  /* Set the item aside; the final delivery cost is agreed on WhatsApp. */
  function deliveryFeeFor(subtotal) {
    if (!DELIVERY_FEE || subtotal <= 0) return 0;
    if (FREE_DELIVERY_OVER && subtotal >= FREE_DELIVERY_OVER) return 0;
    return DELIVERY_FEE;
  }

  function addToCart(id, options) {
    var product = findProduct(id);
    if (!product || product.soldOut) return;

    var chosen = options || {};
    var key = optionsKey(chosen);
    var existing = null;

    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === id && optionsKey(cart[i].options) === key) {
        existing = cart[i];
        break;
      }
    }

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id: id, qty: 1, options: chosen });
    }

    saveCart();
    updateCartUI();
    bumpCartBadge();
    showToast(product.name + " added to your basket");
  }

  function setQty(id, options, qty) {
    var key = optionsKey(options);
    var next = Math.floor(Number(qty));

    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === id && optionsKey(cart[i].options) === key) {
        if (next < 1) {
          cart.splice(i, 1);
        } else {
          cart[i].qty = next;
        }
        break;
      }
    }

    saveCart();
    updateCartUI();
  }

  function removeLine(id, options) {
    var key = optionsKey(options);
    cart = cart.filter(function (line) {
      return !(line.id === id && optionsKey(line.options) === key);
    });

    saveCart();
    updateCartUI();
  }

  function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
  }

  /* ======================================================================
     6. CART DRAWER UI
     ====================================================================== */

  function optionsSummary(options) {
    if (!options) return "";

    var names = Object.keys(options);
    if (!names.length) return "";

    return names
      .map(function (name) {
        return name + ": " + options[name];
      })
      .join(" · ");
  }

  function cartLineHtml(line) {
    var product = findProduct(line.id);
    if (!product) return "";

    var optionText = optionsSummary(line.options);
    /* Multi-image products use their first photo as the basket thumbnail. */
    var thumb = primaryImage(product);

    var imageHtml = thumb
      ? '<img class="cart-item-image" src="' +
        escapeHtml(thumb) +
        '" alt="" loading="lazy" data-fallback>'
      : '<div class="cart-item-image-fallback">&#9670;</div>';

    return (
      '<div class="cart-item">' +
      imageHtml +
      "<div>" +
      '<p class="cart-item-name">' +
      escapeHtml(product.name) +
      "</p>" +
      (optionText
        ? '<p class="cart-item-options">' + escapeHtml(optionText) + "</p>"
        : "") +
      '<div class="cart-item-controls">' +
      '<div class="qty-stepper">' +
      '<button type="button" class="qty-btn" data-qty-down aria-label="Decrease quantity of ' +
      escapeHtml(product.name) +
      '">&minus;</button>' +
      '<span class="qty-value">' +
      line.qty +
      "</span>" +
      '<button type="button" class="qty-btn" data-qty-up aria-label="Increase quantity of ' +
      escapeHtml(product.name) +
      '">+</button>' +
      "</div>" +
      '<span class="cart-item-line-total">' +
      money(product.price * line.qty) +
      "</span>" +
      "</div>" +
      '<button type="button" class="cart-remove" data-remove>Remove</button>' +
      "</div>" +
      "</div>"
    );
  }

  function updateCartUI() {
    var body = $("#cartBody");
    var empty = $("#cartEmpty");
    var foot = $("#cartFoot");
    var badge = $("#cartCount");
    var subtotalEl = $("#cartSubtotal");

    var count = cartCount();

    /* Header badge. */
    if (badge) {
      badge.textContent = String(count);
      badge.hidden = count === 0;
    }

    /* Line items. */
    if (body) {
      body.innerHTML = cart
        .map(function (line) {
          return cartLineHtml(line);
        })
        .join("");

      /*
        Attach handlers per row. Each row's buttons need that row's product
        id and chosen options, captured in the closure below.
      */
      $$(".cart-item", body).forEach(function (row, index) {
        var line = cart[index];
        if (!line) return;

        var up = $("[data-qty-up]", row);
        var down = $("[data-qty-down]", row);
        var remove = $("[data-remove]", row);

        if (up) {
          up.addEventListener("click", function () {
            setQty(line.id, line.options, line.qty + 1);
          });
        }

        if (down) {
          down.addEventListener("click", function () {
            setQty(line.id, line.options, line.qty - 1);
          });
        }

        if (remove) {
          remove.addEventListener("click", function () {
            removeLine(line.id, line.options);
          });
        }
      });

      initImageFallback(body);
    }

    /* Empty state vs totals. */
    if (empty) empty.hidden = count > 0;
    if (foot) foot.hidden = count === 0;

    if (subtotalEl) subtotalEl.textContent = money(cartSubtotal());
  }

  /* Brief scale pop on the badge so the change is noticed. */
  function bumpCartBadge() {
    var badge = $("#cartCount");
    if (!badge || prefersReducedMotion) return;

    badge.classList.remove("is-bumping");
    /* Reading offsetWidth forces a reflow so the animation can replay. */
    void badge.offsetWidth;
    badge.classList.add("is-bumping");

    window.setTimeout(function () {
      badge.classList.remove("is-bumping");
    }, 400);
  }

  /* ======================================================================
     7. PRODUCT OPTIONS MODAL
     ====================================================================== */

  function openOptionsModal(product) {
    var modal = $("#optionModal");
    var fields = $("#optionFields");
    var title = $("#optionTitle");
    var error = $("#optionError");

    if (!modal || !fields) return;

    pendingProduct = product;

    if (title) title.textContent = product.name;
    if (error) error.hidden = true;

    fields.innerHTML = product.options
      .map(function (option) {
        var chips = option.values
          .map(function (value, index) {
            var inputId =
              "opt-" +
              product.id +
              "-" +
              option.name.replace(/\s+/g, "-").toLowerCase() +
              "-" +
              index;

            return (
              '<label class="option-chip" for="' +
              escapeHtml(inputId) +
              '">' +
              '<input type="radio" id="' +
              escapeHtml(inputId) +
              '" name="' +
              escapeHtml(option.name) +
              '" value="' +
              escapeHtml(value) +
              '"' +
              (index === 0 ? " checked" : "") +
              ">" +
              escapeHtml(value) +
              "</label>"
            );
          })
          .join("");

        return (
          '<fieldset class="option-group">' +
          '<legend class="field-label">' +
          escapeHtml(option.name) +
          "</legend>" +
          '<div class="option-values">' +
          chips +
          "</div>" +
          "</fieldset>"
        );
      })
      .join("");

    /*
      Keep chip styling in sync for browsers without :has(), and mark the
      pre-checked first value of each group.
    */
    $$(".option-chip", fields).forEach(function (chip) {
      var input = $("input", chip);
      if (!input) return;

      input.addEventListener("change", function () {
        var groupName = input.getAttribute("name");

        $$('.option-chip input[name="' + groupName + '"]', fields).forEach(
          function (sibling) {
            var parent = sibling.closest(".option-chip");
            if (parent) {
              parent.classList.toggle("is-checked", sibling.checked);
            }
          }
        );
      });

      if (input.checked) chip.classList.add("is-checked");
    });

    openPanel(modal);
  }

  function closeOptionsModal() {
    var modal = $("#optionModal");
    if (!modal) return;

    closePanel(modal);
    pendingProduct = null;
  }

  function handleOptionsSubmit(event) {
    event.preventDefault();

    if (!pendingProduct) return;

    var fields = $("#optionFields");
    var chosen = {};
    var missing = null;

    pendingProduct.options.forEach(function (option) {
      var checked = $(
        '.option-chip input[name="' + option.name + '"]:checked',
        fields
      );

      if (checked) {
        chosen[option.name] = checked.value;
      } else if (!missing) {
        missing = option.name;
      }
    });

    if (missing) {
      var error = $("#optionError");
      if (error) {
        error.textContent = "Please choose a " + missing + ".";
        error.hidden = false;
      }
      return;
    }

    var productId = pendingProduct.id;

    closeOptionsModal();
    addToCart(productId, chosen);
  }

  /* ======================================================================
     8. CHECKOUT
     ====================================================================== */

  function orderLines() {
    return cart
      .map(function (line) {
        var product = findProduct(line.id);
        if (!product) return null;

        return {
          product: product,
          qty: line.qty,
          options: line.options,
          lineTotal: product.price * line.qty
        };
      })
      .filter(Boolean);
  }

  function renderCheckoutSummary() {
    var wrap = $("#checkoutSummary");
    if (!wrap) return;

    var lines = orderLines();
    var subtotal = cartSubtotal();
    var delivery = deliveryFeeFor(subtotal);

    var html = lines
      .map(function (line) {
        var optionText = optionsSummary(line.options);

        return (
          '<div class="checkout-summary-line">' +
          "<span>" +
          escapeHtml(line.product.name) +
          " &times; " +
          line.qty +
          (optionText ? " (" + escapeHtml(optionText) + ")" : "") +
          "</span>" +
          "<span>" +
          money(line.lineTotal) +
          "</span>" +
          "</div>"
        );
      })
      .join("");

    html +=
      '<div class="checkout-summary-line"><span>Delivery</span><span>' +
      (delivery > 0 ? money(delivery) : "To be agreed") +
      "</span></div>";

    html +=
      '<div class="checkout-summary-total"><span>Total</span><strong>' +
      money(subtotal + delivery) +
      "</strong></div>";

    wrap.innerHTML = html;
  }

  /*
    Build the WhatsApp order message.

    WhatsApp opens with this text pre-filled; the customer still presses
    send, which is what makes this work with no backend at all.
  */
  function buildOrderMessage(form) {
    var lines = orderLines();
    var subtotal = cartSubtotal();
    var delivery = deliveryFeeFor(subtotal);
    var total = subtotal + delivery;

    var paymentInput = form.querySelector('input[name="payment"]:checked');
    var payment = paymentInput ? paymentInput.value : "Mobile Money";

    var out = [];
    out.push("*NEW ORDER - Jael's Empire*");
    out.push("");
    out.push("*Items*");

    lines.forEach(function (line, index) {
      var optionText = optionsSummary(line.options);

      out.push(
        index +
          1 +
          ". " +
          line.product.name +
          (optionText ? " (" + optionText + ")" : "") +
          " x" +
          line.qty +
          " - " +
          money(line.lineTotal)
      );
    });

    out.push("");
    out.push("Subtotal: " + money(subtotal));
    out.push(
      delivery > 0 ? "Delivery: " + money(delivery) : "Delivery: to be agreed"
    );
    out.push("*Total: " + money(total) + "*");
    out.push("");
    out.push("*Customer*");
    out.push("Name: " + form.elements.name.value.trim());
    out.push("Phone: " + form.elements.phone.value.trim());
    out.push("Area: " + form.elements.area.value.trim());

    var note = form.elements.note ? form.elements.note.value.trim() : "";
    if (note) out.push("Note: " + note);

    out.push("");
    out.push("*Payment:* " + payment);

    if (payment === "MoMo") {
      out.push(
        "MoMo " +
          (CONFIG.momoNumber || "") +
          " (" +
          (CONFIG.momoName || "") +
          ")"
      );
      out.push("I will send the MoMo screenshot next.");
    }

    return out.join("\n");
  }

  function openWhatsApp(text) {
    var url = "https://wa.me/" + WHATSAPP + "?text=" + encode(text);
    window.open(url, "_blank", "noopener");
  }

  function openCheckout() {
    if (!cart.length) return;

    closePanel($("#cartDrawer"));
    renderCheckoutSummary();

    var momo = $("#momoDetails");
    if (momo) momo.hidden = false;

    openPanel($("#checkoutModal"));
  }

  function handleCheckoutSubmit(event) {
    event.preventDefault();

    var form = event.currentTarget;
    var errorBox = $("#checkoutError");
    var valid = true;

    ["name", "phone", "area"].forEach(function (fieldName) {
      var input = form.elements[fieldName];
      if (!input) return;

      var value = input.value.trim();
      var ok = value.length > 0;

      /* Ghanaian mobile numbers: 9-13 digits, 0 / 233 / 23 prefixed. */
      if (ok && fieldName === "phone") {
        var digits = value.replace(/[^0-9]/g, "");
        ok =
          digits.length >= 9 &&
          digits.length <= 13 &&
          (digits.indexOf("0") === 0 ||
            digits.indexOf("233") === 0 ||
            digits.indexOf("23") === 0);
      }

      input.classList.toggle("is-invalid", !ok);
      if (!ok) valid = false;
    });

    if (!valid) {
      if (errorBox) {
        errorBox.textContent =
          "Please check your name, phone number and delivery area.";
        errorBox.hidden = false;
      }

      var firstBad = $(".is-invalid", form);
      if (firstBad) firstBad.focus();
      return;
    }

    if (errorBox) errorBox.hidden = true;

    /*
      Open WhatsApp with the order.

      We deliberately do NOT empty the basket here. If the customer
      changes their mind in WhatsApp and comes back, the order is still on
      screen. The basket migrates out once they start a new one.
    */
    openWhatsApp(buildOrderMessage(form));

    var submit = $("#checkoutSubmit");
    if (submit) {
      var original = submit.textContent;
      submit.textContent = "Opening WhatsApp…";
      submit.disabled = true;

      window.setTimeout(function () {
        submit.textContent = original;
        submit.disabled = false;
      }, 2500);
    }

    /* Local record so a refresh does not look like the order vanished. */
    try {
      window.localStorage.setItem(
        "jaels-last-order",
        JSON.stringify({
          at: new Date().toISOString(),
          items: cart,
          subtotal: cartSubtotal()
        })
      );
    } catch (error) {
      /* Non-critical. */
    }
  }

  /* ======================================================================
     9. CONTACT FORM
     Composes a WhatsApp message. A static site has no server to email
     from, so the previous "Message Sent ✓" discarded the customer's
     message. This actually delivers it.
     ====================================================================== */

  function handleContactSubmit(event) {
    event.preventDefault();

    var form = event.currentTarget;
    var errorBox = $("#contactError");
    var valid = true;

    ["name", "contact", "message"].forEach(function (fieldName) {
      var input = form.elements[fieldName];
      if (!input) return;

      var ok = input.value.trim().length > 0;
      input.classList.toggle("is-invalid", !ok);
      if (!ok) valid = false;
    });

    if (!valid) {
      if (errorBox) {
        errorBox.textContent = "Please fill in your name, contact and message.";
        errorBox.hidden = false;
      }

      var firstBad = $(".is-invalid", form);
      if (firstBad) firstBad.focus();
      return;
    }

    if (errorBox) errorBox.hidden = true;

    var text =
      "*MESSAGE - Jael's Empire*\n\n" +
      "Name: " +
      form.elements.name.value.trim() +
      "\nContact: " +
      form.elements.contact.value.trim() +
      "\n\n" +
      form.elements.message.value.trim();

    openWhatsApp(text);
  }

  /* ======================================================================
     10. TOAST
     ====================================================================== */

  var toastTimer = null;

  function showToast(message) {
    var toast = $("#toast");
    var text = $("#toastText");
    if (!toast) return;

    if (text) text.textContent = message;

    toast.hidden = false;
    /* Force a reflow so the transition runs from the hidden state. */
    void toast.offsetWidth;
    toast.classList.add("is-visible");

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
      window.setTimeout(function () {
        if (!toast.classList.contains("is-visible")) toast.hidden = true;
      }, 350);
    }, 2600);
  }

  /* ======================================================================
     11. PANEL / OVERLAY MANAGER
     One place handling open, close, Esc, Tab trapping and focus restore,
     so the drawer and both modals behave identically.
     ====================================================================== */

  var openPanels = [];

  var FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), ' +
    'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /*
    The overlay is a separate element only for the cart drawer. Both
    modals carry their own overlay styling on the dialog container itself.
  */
  function overlayFor(panel) {
    return panel.id === "cartDrawer" ? $("#cartOverlay") : panel;
  }

  function openPanel(panel) {
    if (!panel || openPanels.indexOf(panel) !== -1) return;

    lastFocused = document.activeElement;

    var overlay = overlayFor(panel);

    if (overlay && overlay !== panel) overlay.hidden = false;
    panel.hidden = false;

    /* Next frame, so the browser registers the pre-transition state. */
    window.requestAnimationFrame(function () {
      panel.classList.add("is-open");
      if (overlay && overlay !== panel) overlay.classList.add("is-open");
    });

    panel.setAttribute("aria-hidden", "false");

    if (panel.id === "cartDrawer") {
      var cartButton = $("#cartButton");
      if (cartButton) cartButton.setAttribute("aria-expanded", "true");
    }

    openPanels.push(panel);
    document.body.classList.add("is-locked");

    /* Move focus in, so keyboard and screen readers follow. */
    var focusTarget = $(
      "button, input, textarea, [tabindex]:not([tabindex='-1'])",
      panel
    );
    if (focusTarget) focusTarget.focus();
  }

  function closePanel(panel) {
    if (!panel) return;

    var index = openPanels.indexOf(panel);
    if (index === -1) return;

    openPanels.splice(index, 1);

    var overlay = overlayFor(panel);

    panel.classList.remove("is-open");
    if (overlay && overlay !== panel) overlay.classList.remove("is-open");

    /*
      Wait out the transition before hiding, otherwise the slide never
      plays. With reduced motion the transition is ~0ms, so this is still
      correct.
    */
    window.setTimeout(function () {
      if (panel.classList.contains("is-open")) return;

      panel.hidden = true;
      panel.setAttribute("aria-hidden", "true");

      if (overlay && overlay !== panel) overlay.hidden = true;
    }, prefersReducedMotion ? 0 : 420);

    if (panel.id === "cartDrawer") {
      var cartButton = $("#cartButton");
      if (cartButton) cartButton.setAttribute("aria-expanded", "false");
    }

    if (!openPanels.length) document.body.classList.remove("is-locked");

    /* Return focus where the user left it. */
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  function closeTopPanel() {
    if (openPanels.length) {
      closePanel(openPanels[openPanels.length - 1]);
    }
  }

  /* Keyboard: Esc closes, Tab cycles within the open panel. */
  function initKeyboard() {
    document.addEventListener("keydown", function (event) {
      if (!openPanels.length) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeTopPanel();
        return;
      }

      if (event.key !== "Tab") return;

      var panel = openPanels[openPanels.length - 1];
      var focusables = $$(FOCUSABLE, panel).filter(function (el) {
        return el.offsetParent !== null || el === document.activeElement;
      });

      if (!focusables.length) return;

      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  /* ======================================================================
     12. ORIGINAL PAGE BEHAVIOUR
     Carried over from the brand page; the nav now also includes Shop.
     ====================================================================== */

  function initReveal() {
    var items = $$(".reveal");
    if (!items.length) return;

    /*
      Anything still hidden after this long is shown regardless of scroll
      position. A crawler, a link preview bot, or a reader that never
      scrolls would otherwise see a page of blanks, because .reveal starts
      at opacity 0. Content must never depend on a scroll event.
    */
    var SAFETY_MS = 3000;

    function revealAll() {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
    }

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    window.setTimeout(function () {
      /* Only force the ones the observer has not already handled. */
      items.forEach(function (el) {
        if (el.classList.contains("is-visible")) return;
        el.classList.add("is-visible");
        observer.unobserve(el);
      });
    }, SAFETY_MS);

    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  function initCardStagger() {
    $$(".brands .card").forEach(function (card, i) {
      card.style.transitionDelay = i * 120 + "ms";
    });
  }

  function initScrollUI() {
    var header = $("header");
    var progress = $("#scrollProgress");
    var toTop = $("#toTop");

    function onScroll() {
      var y = window.scrollY || window.pageYOffset;

      if (header) header.classList.toggle("is-stuck", y > 30);

      if (progress) {
        var docHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        var pct = docHeight > 0 ? (y / docHeight) * 100 : 0;
        progress.style.width = pct + "%";
      }

      if (toTop) toTop.classList.toggle("is-visible", y > 600);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (toTop) {
      toTop.addEventListener("click", function () {
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion ? "auto" : "smooth"
        });
      });
    }
  }

  function initActiveNav() {
    var links = $$('nav a[href^="#"]');
    if (!links.length || !("IntersectionObserver" in window)) return;

    var byId = {};
    var sections = [];

    links.forEach(function (link) {
      var id = link.getAttribute("href").slice(1);
      var el = document.getElementById(id);
      if (!el) return;
      byId[id] = el;
      sections.push(el);
    });

    if (!sections.length) return;

    var ratios = {};

    function applyActive() {
      var bestId = null;
      var bestRatio = 0;

      Object.keys(ratios).forEach(function (id) {
        if (ratios[id] > bestRatio) {
          bestRatio = ratios[id];
          bestId = id;
        }
      });

      if (bestId === null || bestRatio < 0.15) {
        bestId = Object.keys(byId)[0];
      }

      links.forEach(function (link) {
        link.classList.toggle(
          "is-active",
          link.getAttribute("href") === "#" + bestId
        );
      });
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          ratios[entry.target.id] = entry.isIntersecting
            ? entry.intersectionRatio
            : 0;
        });
        applyActive();
      },
      { threshold: [0, 0.15, 0.3, 0.5, 0.75, 1], rootMargin: "-10% 0px -10% 0px" }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });

    ratios[Object.keys(byId)[0]] = 1;
    applyActive();
  }

  /* ======================================================================
     GALLERY
     Drives the swipeable product galleries.

     The track is a native scroll container with scroll-snap, so swiping
     and trackpad scrolling already work and the browser handles momentum.
     This code only keeps the dots, counter and arrows in step with
     whatever the scroll position actually is, which means every input
     path (finger, mouse, arrow keys, buttons, dots) goes through one
     source of truth and they cannot disagree.
     ====================================================================== */

  function initGalleries(scope) {
    $$("[data-gallery]", scope).forEach(setUpGallery);
  }

  function setUpGallery(gallery) {
    var viewport = $("[data-gallery-viewport]", gallery);
    var track = $(".gallery-track", gallery);
    if (!viewport || !track) return;

    var slides = $$(".gallery-slide", track);
    if (slides.length < 2) return;

    var dots = $$(".gallery-dot", gallery);
    var counter = $("[data-gallery-counter]", gallery);
    var prev = $("[data-gallery-prev]", gallery);
    var next = $("[data-gallery-next]", gallery);

    var current = 0;

    /* Which slide is showing, derived from where the track is scrolled. */
    function currentIndex() {
      var width = viewport.clientWidth;
      if (!width) return 0;
      return Math.round(viewport.scrollLeft / width);
    }

    function paint() {
      var index = currentIndex();
      if (index === current) {
        updateControls(index);
        return;
      }
      current = index;
      updateControls(index);
    }

    function updateControls(index) {
      if (counter) counter.textContent = index + 1 + "/" + slides.length;

      dots.forEach(function (dot, i) {
        var active = i === index;
        dot.classList.toggle("is-active", active);
        /* Only the active dot is a tab stop, so Tab does not walk them all. */
        dot.tabIndex = active ? 0 : -1;
      });
    }

    function goTo(index) {
      var target = Math.max(0, Math.min(slides.length - 1, index));

      viewport.scrollTo({
        left: target * viewport.clientWidth,
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });

      /*
        scrollTo with smooth scrolling fires scroll events along the way.
        Update the controls immediately so the tap feels instant, and let
        the scroll handler correct it if the movement is interrupted.
      */
      current = target;
      updateControls(target);
    }

    /* The single source of truth: whatever the scroll says wins. */
    var scrollTimer = null;
    viewport.addEventListener(
      "scroll",
      function () {
        window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(paint, 60);
      },
      { passive: true }
    );

    if (prev) {
      prev.addEventListener("click", function (event) {
        event.preventDefault();
        goTo(current - 1);
      });
    }

    if (next) {
      next.addEventListener("click", function (event) {
        event.preventDefault();
        goTo(current + 1);
      });
    }

    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        goTo(Number(dot.getAttribute("data-goto")) || 0);
      });
    });

    /* Keyboard: left/right move one photo. */
    viewport.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(current + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(current - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goTo(slides.length - 1);
      }
    });

    /*
      Dragging with a mouse.

      Touch already scrolls natively, and so does a trackpad. A mouse does
      not, so a click-and-drag is wired up by hand. A drag threshold keeps
      a plain click on the image from being treated as a swipe.
    */
    var dragging = false;
    var dragStartX = 0;
    var dragStartScroll = 0;
    var dragMoved = false;

    viewport.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "touch") return;

      dragging = true;
      dragMoved = false;
      dragStartX = event.clientX;
      dragStartScroll = viewport.scrollLeft;
      viewport.classList.add("is-dragging");
    });

    viewport.addEventListener("pointermove", function (event) {
      if (!dragging) return;

      var delta = event.clientX - dragStartX;

      if (Math.abs(delta) > 4) dragMoved = true;

      viewport.scrollLeft = dragStartScroll - delta;
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove("is-dragging");

      /* Snap to the nearest whole slide when the drag ends. */
      goTo(currentIndex());
    }

    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
    viewport.addEventListener("pointerleave", endDrag);

    /*
      Stop a click that was really the end of a drag from reaching the
      card, so dragging the photos never triggers anything behind them.
    */
    viewport.addEventListener(
      "click",
      function (event) {
        if (dragMoved) {
          event.preventDefault();
          event.stopPropagation();
          dragMoved = false;
        }
      },
      true
    );

    /*
      Images are lazy loaded. If a slide's file is missing, hide that
      slide so the gallery does not show a blank panel mid-swipe, then
      re-sync in case the number of slides changed.
    */
    $$("img[data-slide]", track).forEach(function (img) {
      img.addEventListener("error", function () {
        var slide = img.closest(".gallery-slide");
        if (slide) slide.classList.add("is-missing");
      });

      if (img.complete && img.naturalWidth === 0) {
        var slide = img.closest(".gallery-slide");
        if (slide) slide.classList.add("is-missing");
      }
    });

    /* Re-measure on resize and on rotation; slide width changes. */
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        goTo(currentIndex());
      }, 150);
    });

    updateControls(0);
  }

  /* ======================================================================
     13. EVENT WIRING
     ====================================================================== */

  function initShopEvents() {
    var cartDrawer = $("#cartDrawer");
    var checkoutModal = $("#checkoutModal");
    var optionModal = $("#optionModal");

    /* Brand filter chips. */
    var filters = $("#filters");
    if (filters) {
      filters.addEventListener("click", function (event) {
        var chip = event.target.closest(".filter-chip");
        if (!chip) return;

        setBrandFilter(chip.getAttribute("data-brand"));
      });
    }

    /* Add to basket, from the product grid. */
    var grid = $("#productGrid");
    if (grid) {
      grid.addEventListener("click", function (event) {
        var button = event.target.closest("[data-add]");
        if (!button) return;

        var product = findProduct(button.getAttribute("data-add"));
        if (!product) return;

        /*
          Products with options ask the customer to choose first; products
          without options go straight into the basket.
        */
        if (product.options && product.options.length) {
          openOptionsModal(product);
        } else {
          addToCart(product.id, {});
        }
      });
    }

    /* Brand cards pre-filter the shop and scroll to it. */
    $$("[data-shop-brand]").forEach(function (button) {
      button.addEventListener("click", function () {
        setBrandFilter(button.getAttribute("data-shop-brand"));

        var shop = $("#shop");
        if (shop) {
          shop.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "start"
          });
        }
      });
    });

    /* Cart open/close. */
    var cartButton = $("#cartButton");
    if (cartButton && cartDrawer) {
      cartButton.addEventListener("click", function () {
        openPanel(cartDrawer);
      });
    }

    var cartClose = $("#cartClose");
    if (cartClose) {
      cartClose.addEventListener("click", function () {
        closePanel(cartDrawer);
      });
    }

    var cartOverlay = $("#cartOverlay");
    if (cartOverlay) {
      cartOverlay.addEventListener("click", function () {
        closePanel(cartDrawer);
      });
    }

    var emptyBtn = $("#cartEmptyBtn");
    if (emptyBtn) {
      emptyBtn.addEventListener("click", function () {
        closePanel(cartDrawer);

        var shop = $("#shop");
        if (shop) {
          shop.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "start"
          });
        }
      });
    }

    var clearBtn = $("#cartClear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (window.confirm("Remove everything from your basket?")) {
          clearCart();
          showToast("Basket cleared");
        }
      });
    }

    /* Checkout. */
    var checkoutBtn = $("#checkoutBtn");
    if (checkoutBtn) checkoutBtn.addEventListener("click", openCheckout);

    var checkoutForm = $("#checkoutForm");
    if (checkoutForm) {
      checkoutForm.addEventListener("submit", handleCheckoutSubmit);
    }

    var checkoutCancel = $("#checkoutCancel");
    if (checkoutCancel) {
      checkoutCancel.addEventListener("click", function () {
        closePanel(checkoutModal);
      });
    }

    if (checkoutModal) {
      /*
        Show the MoMo instructions only when Mobile Money is selected, so
        the form is not cluttered with irrelevant payment detail.
      */
      checkoutModal.addEventListener("change", function (event) {
        if (event.target.name !== "payment") return;

        var momo = $("#momoDetails");
        if (momo) momo.hidden = event.target.value !== "MoMo";
      });

      /* Clicking the dark backdrop closes the modal. */
      checkoutModal.addEventListener("click", function (event) {
        if (event.target === checkoutModal) closePanel(checkoutModal);
      });
    }

    /* Options modal. */
    var optionForm = $("#optionForm");
    if (optionForm) optionForm.addEventListener("submit", handleOptionsSubmit);

    var optionCancel = $("#optionCancel");
    if (optionCancel) {
      optionCancel.addEventListener("click", closeOptionsModal);
    }

    if (optionModal) {
      optionModal.addEventListener("click", function (event) {
        if (event.target === optionModal) closeOptionsModal();
      });
    }

    /* Contact form. */
    var contactForm = $("#contactForm");
    if (contactForm) {
      contactForm.addEventListener("submit", handleContactSubmit);
    }
  }

  /* ======================================================================
     BOOT
     ====================================================================== */

  function init() {
    checkCatalogue();

    /* Shop. */
    loadCart();
    renderFilters();
    renderProducts();
    initImageFallback(document);
    updateCartUI();

    /* Page behaviour. */
    initReveal();
    initCardStagger();
    initScrollUI();
    initActiveNav();
    initKeyboard();

    /* Events. */
    initShopEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
