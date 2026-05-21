# Zen Purchase Blocks

Dynamic Gutenberg blocks for Zenctuary purchase offers.

## Current Block

- `Zen Membership Plans`
- Selects one or more WooCommerce Memberships plans.
- Lists products and variations assigned to the selected plans.
- Lets the editor choose which items to show and tag each as monthly or yearly.
- Renders monthly/yearly tabs only when selected products exist for that billing group.
- Shows yearly products as a monthly equivalent price by default, with a per-card override.
- Formats card prices without subscription period text and hides trailing zero decimals.
- Pulls price, billing period, Zencoin grant amount, and add-to-cart URL from WooCommerce at render time.

- `Zen Zencoin Packages`
- Lists WooCommerce products where CBB Zencoin product type is `package`.
- Lets the editor choose which package products to show.
- Pulls price, Zencoin amount, price per Zencoin, validity days, and add-to-cart URL from WooCommerce/CBB meta.
- Supports per-card overrides for displayed Zencoins, usage text, validity text, and button label.

- `Zen Drop-ins`
- Lists WooCommerce products where CBB Zencoin product type is `drop_in` or `free_drop_in`.
- Lets the editor choose which drop-in products to show.
- Pulls price, Zencoin amount, product image, validity days, and add-to-cart URL from WooCommerce/CBB meta.
- Supports per-card overrides for image URL, price, displayed Zencoins, usage text, validity text, note text, and button label.

## Dependencies

- WooCommerce
- WooCommerce Memberships
- WooCommerce Subscriptions for subscription billing labels
- Coin Booking Bridge product meta for Zencoin amounts, when present

## Usage

1. Activate **Zen Purchase Blocks**.
2. Add the **Zen Membership Plans** block in the editor.
3. Select one or more membership plans.
4. Enable the assigned products or variations to display.
5. Set each enabled item to Monthly or Yearly and add benefits/marketing copy.

For packages:

1. Add the **Zen Zencoin Packages** block.
2. Enable the package products to display.
3. Optionally override Zencoin display, usage text, validity text, or button label per card.

For drop-ins:

1. Add the **Zen Drop-ins** block.
2. Enable the drop-in or free drop-in products to display.
3. Optionally override image URL, price display, Zencoin display, usage text, validity text, note text, or button label per card.
