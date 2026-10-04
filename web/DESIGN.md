# UniMatch interface

Use the existing U/heart symbol in `public/unimatch-logo.png` through the shared `Brand` component. The violet logo is the brand mark; controls use charcoal. Do not add stock portraits, floating illustrations, marketing feature cards or invented community counts.

| Role | Color |
| --- | --- |
| Primary control | `#353247` |
| Page background | `#F7F7F5` |
| Surface | `#FFFFFF` |
| Selected / muted surface | `#EEEFEB` |
| Main text | `#242724` |
| Secondary text | `#666B65` |
| Border | `#E1E3DD` |

Tokens are defined in `production-design.css` and mirrored in Clerk appearance and the web manifest. Keep the entry to one viewport at 320 × 640 and above. Login and account creation are visible immediately; demonstrations are explicitly labeled and opened by the visitor.

Profiles and photos are the main content. No-photo states stay compact. The desktop side panel shows actual interests and preferences rather than promotional copy. Use separators for profile-editing sections, flat controls with 4–6 px radii, and no decorative shadows or gradients. System sans-serif typography avoids external font requests. Primary touch targets are at least 44 px.

Keep motion short and functional: a 180 ms profile transition and subtle control feedback. Honor `prefers-reduced-motion`. Private photos remain authenticated; the public brand image uses Next Image optimization.

APK 0.3 embedded screens receive the interface online. Its installed launcher icon belongs to the separately built Android binary.
