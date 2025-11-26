# LUSERY E-Commerce Design Guidelines

## Design Approach
**Reference-Based**: Drawing inspiration from premium fashion e-commerce leaders (Zara, ASOS, Net-a-Porter) with a modern, sophisticated aesthetic that emphasizes product photography and clean typography.

## Color Palette Strategy
Create a sophisticated palette derived from the LUSERY logo:
- **Primary**: Extract dominant color from logo (likely elegant/premium tone)
- **Secondary**: Complementary accent for CTAs and highlights
- **Neutrals**: Rich blacks, warm grays, and crisp whites
- **Dark Mode**: Deep charcoal backgrounds with elevated elements, warm neutral text
- **Light Mode**: Clean white/off-white backgrounds with strong contrast

## Typography System
- **Headings**: Modern sans-serif (Inter or Poppins), weights 600-700, large and confident
- **Body**: Clean sans-serif (Inter), weight 400, 16px base, excellent readability
- **Product Names**: Semi-bold, 18-20px, letter-spacing for elegance
- **Prices**: Bold, slightly larger than body, prominent display
- **Admin Panel**: Utilitarian sans-serif for clarity

## Layout & Spacing
**Core Spacing Units**: Tailwind 4, 6, 8, 12, 16 for consistent rhythm
- **Container**: max-w-7xl with px-4 md:px-6 lg:px-8
- **Product Grids**: 2 columns mobile, 3 tablet, 4 desktop (grid-cols-2 md:grid-cols-3 lg:grid-cols-4)
- **Section Padding**: py-12 md:py-16 lg:py-20
- **Card Spacing**: gap-6 md:gap-8 for breathing room

## Component Library

### Navigation
- Fixed header with transparent-to-solid scroll transition
- Logo left, search center, cart/favorites/account right
- Mobile: Hamburger menu with slide-in drawer
- Category mega-menu on hover (desktop)
- Sticky on scroll with elevated shadow

### Hero Section
Full-width lifestyle image showcasing LUSERY clothing in context:
- Height: 70vh on desktop, 50vh mobile
- Overlay: Subtle gradient for text legibility
- CTA buttons with blurred glass-morphism background
- Centered headline + subheadline + dual CTAs (Shop Now, New Collection)

### Product Cards
- **Image**: Square aspect ratio, hover zoom effect, 2-3 images per product
- **Quick Actions**: Floating heart icon (favorites) on hover, cart icon
- **Content**: Product name, category tag, price (bold), size indicators
- **Hover State**: Slight lift with shadow, second image swap
- **Sale Badge**: Corner ribbon for discounted items

### Product Filters & Search
- Left sidebar (desktop) with collapsible filter groups
- Filters: Categories, Size, Price Range (slider), Color swatches, Availability
- Top bar: Sort dropdown (Newest, Price, Popularity), View toggle (grid/list)
- Search: Prominent with autocomplete suggestions, recent searches

### Shopping Cart
- Slide-in panel from right side
- Product thumbnail, name, size, quantity stepper, remove icon
- Subtotal calculation
- Prominent checkout button
- Empty state with suggested products

### Image Gallery (Product Detail)
- Large main image with thumbnail carousel below
- Left/right navigation arrows
- Image counter (e.g., "3 / 8")
- Fullscreen lightbox mode
- Video support with play overlay
- Mobile: Swipeable gallery

### Admin Dashboard
Professional dark sidebar layout:
- **Sidebar**: Navigation (Products, Categories, Media, Orders, Settings)
- **Main Area**: Data tables with search, filter, pagination
- **Product Management**: Drag-drop image upload, rich text editor, category selector, price/inventory inputs
- **Category Management**: Hierarchical tree view, add/edit/delete, image assignment
- **Media Library**: Grid view with upload area, metadata editing, usage tracking
- **Real-time Indicator**: WebSocket connection status icon

### Favorites System
- Heart icon toggle (outline/filled states)
- Dedicated favorites page with same product grid layout
- Cookie-based persistence with visual feedback on add/remove

### Dark/Light Mode
- Toggle switch in header (moon/sun icon)
- Smooth transition (transition-colors duration-200)
- Persistent via localStorage
- Optimized contrast ratios for both modes

## Images
**Required Images**:
1. **Hero**: Full-width lifestyle shot of models wearing LUSERY clothing in urban/studio setting
2. **Product Images**: High-quality product photography on neutral backgrounds, 4-6 images per item including detail shots
3. **Category Banners**: Styled images for each category (Men's, Women's, Accessories)
4. **About/Brand Story**: Behind-the-scenes, team photos for authenticity

## Interactions & Animations
**Minimal, Purpose-Driven**:
- Product card hover transforms
- Smooth cart/menu slide-ins
- Image carousel transitions
- Loading skeletons for async content
- Toast notifications for cart/favorites actions
- Real-time product updates (fade-in new items)

## Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation throughout
- Focus indicators with brand color
- Alt text for all product images
- Color contrast meeting WCAG AA standards