# DESIGN SYSTEM — Gemica

Premium, elegant, minimal. Product photography leads; decoration stays restrained. Built with **plain CSS and CSS variables** (no CSS framework).

---

## 1. Colour Palette

```css
:root {
  --color-bg:        #FBF8F2; /* ivory */
  --color-surface:   #FFFFFF;
  --color-surface-2: #F4EEE2; /* cream */
  --color-border:    #E6DDCB;
  --color-text:      #2B2622; /* charcoal brown */
  --color-text-muted:#6F665C;
  --color-accent:    #B8923A; /* muted gold */
  --color-accent-dark:#9A7A2E;
  --color-success:   #3C7A57;
  --color-warning:   #B7791F;
  --color-danger:    #B3392F;
  --color-focus:     #1F5FBF;
}
```

Contrast: body text on `--color-bg` exceeds 4.5:1. Gold is used for accents and button fills with dark text or large text only; never gold text on ivory at small sizes.

## 2. Typography

- Headings: **Cormorant Garamond** (fallback `Georgia, serif`).
- Body/UI: **Inter** (fallback `system-ui, sans-serif`).

```css
:root {
  --font-display: "Cormorant Garamond", Georgia, serif;
  --font-body: "Inter", system-ui, sans-serif;
  --fs-xs: .75rem; --fs-sm: .875rem; --fs-md: 1rem;
  --fs-lg: 1.25rem; --fs-xl: 1.75rem; --fs-2xl: 2.5rem; --fs-hero: clamp(2.5rem, 6vw, 4.5rem);
  --lh-body: 1.6; --lh-heading: 1.2;
}
```

## 3. Spacing, Radius, Shadow

```css
:root {
  --space-1: .25rem; --space-2: .5rem; --space-3: .75rem; --space-4: 1rem;
  --space-6: 1.5rem; --space-8: 2rem; --space-12: 3rem; --space-16: 4rem;
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 14px;
  --shadow-sm: 0 1px 2px rgba(43,38,34,.06);
  --shadow-md: 0 6px 18px rgba(43,38,34,.08);
}
```

## 4. Layout

- Container: `max-width: 1200px; margin-inline: auto; padding-inline: var(--space-4)`.
- Product grid: CSS Grid, `repeat(auto-fill, minmax(220px, 1fr))`; 2 columns on mobile.
- Generous section spacing (`--space-12` to `--space-16`).
- Sticky header; footer with contact, policies and support.

**Breakpoints:** mobile `< 640px`, tablet `640–1023px`, desktop `≥ 1024px`. Design mobile-first.

## 5. Components

**Buttons**
- Primary: gold fill, charcoal text, hover `--color-accent-dark`.
- Secondary: transparent, 1px charcoal border, hover cream fill.
- Ghost/link: text only with underline on hover.
- Min height 44px, disabled state at 50% opacity with `not-allowed` cursor, loading state with spinner and disabled click.

**Forms**
- Visible `<label>` above every input; 44px min height; border `--color-border`; focus ring `2px solid var(--color-focus)` with offset.
- Errors: red text below the field plus `aria-describedby`; never colour alone.

**Product card**
- 4:5 image ratio with `object-fit: cover`, lazy loaded.
- Name (one to two lines, clamped), price in INR (`₹1,299`), availability badge, wishlist icon button.
- Subtle border, hover: slight shadow and second image or 1.03 zoom (disabled under `prefers-reduced-motion`).

**Navigation:** logo (Gemica wordmark in display font), shop, categories, search, wishlist, cart with count badge, account. Mobile: hamburger drawer.

**Other:** toast notifications for success/error; skeleton loaders for grids; empty-state with icon, message and action; status badges for orders (placed, confirmed, processing, shipped, delivered, cancelled); data tables for admin with horizontal scroll on small screens.

## 6. Pages — Key Layout Notes

- **Home:** hero with one primary CTA, category tiles, featured products, brand promise strip, footer.
- **Shop:** filter sidebar (drawer on mobile), sort dropdown, grid, pagination.
- **Product detail:** image gallery with thumbnails, variant selector, quantity stepper, Add to Cart / Wishlist, specifications.
- **Cart/Checkout:** two-column on desktop (items + sticky summary), single column on mobile.
- **Admin:** sidebar navigation, summary cards, tables, product form with image upload preview.

## 7. Accessibility

- Semantic HTML (`header`, `nav`, `main`, `footer`), one `h1` per page.
- Keyboard-reachable controls, visible focus states, skip-to-content link.
- `alt` text on all product images; icon-only buttons have `aria-label`.
- Respect `prefers-reduced-motion`.
- Minimum touch target 44×44px; minimum text size 16px for inputs (prevents mobile zoom).

## 8. CSS Guidance (No Framework)

- `styles/tokens.css` (variables above), `base.css` (reset, typography), `components.css` (shared classes), plus a co-located `.css` file per component or page.
- Naming: BEM-style (`.product-card__title`, `.btn--primary`).
- Use CSS Grid/Flexbox, `clamp()`, and logical properties; avoid inline styles and `!important`.
- Icons: inline SVG components (no icon library unless approved in `rules.md`).
- Images: sized for display, `loading="lazy"`, explicit width/height to prevent layout shift.

## 9. Motion

Short (150–250ms) ease transitions on hover/focus and drawers only. No auto-playing carousels or heavy animation.
