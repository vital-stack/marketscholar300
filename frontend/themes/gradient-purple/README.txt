GRADIENT PURPLE THEME (Previous Design)
========================================
This is the previous MarketScholar homepage design featuring:
- Dark gradient purple/indigo hero section
- White card-based recommendation cards
- Gradient nav bar with purple accents
- Rounded 2xl borders, shadow-based depth

To restore this theme, copy these files over the active ones:

  cp themes/gradient-purple/app/page.tsx app/page.tsx
  cp themes/gradient-purple/app/globals.css app/globals.css
  cp themes/gradient-purple/app/layout.tsx app/layout.tsx
  cp themes/gradient-purple/components/Header.tsx components/Header.tsx
  cp themes/gradient-purple/components/FileUploader.tsx components/FileUploader.tsx
  cp themes/gradient-purple/components/RecommendationCard.tsx components/RecommendationCard.tsx
  cp themes/gradient-purple/tailwind.config.js tailwind.config.js

To switch back to the deep-space dark theme, revert with git:

  git checkout -- app/page.tsx app/globals.css app/layout.tsx components/Header.tsx components/FileUploader.tsx components/RecommendationCard.tsx tailwind.config.js

Saved from commit: 881a9eb (UI cleanup: remove non-functional elements, improve search box)
