# Editorial redesign assets

`public/images/morning-flat-white.webp` was generated with the built-in image generation tool and optimised to a 960 × 1200 WebP (about 157 KiB). The photograph is decorative editorial imagery, not a photograph of a named surveyed café.

Final generation prompt:

> Use case: photorealistic-natural. Asset type: website hero photograph for Flat White Index, an independent Sydney coffee price survey. Create a premium editorial food photograph, portrait 4:5 composition, close overhead view of a real small white ceramic flat white cup and matching saucer, beautiful naturally imperfect rosetta latte art and rich caramel crema. Cup in upper central two-thirds, with a small stainless steel teaspoon on saucer, on warm dark walnut cafe tabletop with strong natural morning sunlight from upper left and soft long shadows. A subtle folded cream linen napkin just enters one lower corner. Quiet, tactile Australian neighbourhood cafe atmosphere, warm brown and oat palette, realistic ceramic glaze, film-grain subtlety, refined Kinfolk food photography. Crop confidently, coffee the main subject. No text, no logos, no people, no hands, no watermarks, no charts, no graphical overlays.

The sharing image is an evergreen graphic composed from that photograph and SVG typography. Rebuild it with `node scripts/generate-editorial-og.js`. It intentionally contains no changing survey figures.

Public pages share `site.css`, `site.js`, and the independently tested `dashboard-model.js`. Their statistics use visible price observations from `/api/dashboard`; retrieval timestamps must not be described as café collection dates.

Form QA used a separate local server with fixture data and mocked POST endpoints. No real email subscriptions, price submissions, or voice calls were made during testing.
