# Zen Purchase Blocks

Dynamic Gutenberg blocks for Zenctuary purchase offers.

## Current Block

- `Zen Membership Plans`
- Selects one or more WooCommerce Memberships plans.
- Lists products and variations assigned to the selected plans.
- Lets the editor choose which items to show and tag each as monthly or yearly.
- Renders monthly/yearly tabs only when selected products exist for that billing group.
- Pulls price, billing period, Zencoin grant amount, and add-to-cart URL from WooCommerce at render time.

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
