RStar7 V3.1 Professional (fixed & upgraded build)
==================================================

WHAT THIS IS
------------
RStar7 — 25 free online calculators (finance, math, daily life, converter)
with a full SEO layer, legal pages and mobile-first responsive design.
This is a static website: no build step, no database, no paid API required.

HOW TO DEPLOY (https://www.rstar7.com)
--------------------------------------
1. Log in to your hosting control panel (cPanel / Plesk / File Manager).
2. Open the public_html folder of the domain rstar7.com
   (make sure the www variant serves the same folder).
3. Upload the CONTENTS of this rstar7v3 folder into public_html
   (index.html must sit directly inside public_html).
4. If your host runs Apache, keep the included .htaccess — it forces
   https://www.rstar7.com URLs (301) and enables caching + security headers.
   If not on Apache, create a 301 redirect from the non-www host to www
   in your hosting panel so canonical URLs match.
5. Visit https://www.rstar7.com and https://www.rstar7.com/sitemap.xml to verify.
6. (Recommended) Submit the sitemap in Google Search Console:
   https://search.google.com/search-console  →  Sitemaps → www.rstar7.com/sitemap.xml

WHAT CHANGED VS V3
------------------
See TEST-REPORT.md (shipped alongside this folder in the delivery zip)
for the full audit, bug list, fixes and test results.

FILE MAP
--------
index.html            Homepage
tools/index.html      All 25 calculators (searchable)
tools/*.html          25 calculator pages
about/contact/...     Information & legal pages
assets/style.css      Design system
assets/calculators.js Shared calculation engine (all 25 tools)
assets/r7-ui.js       Calculator form/result glue
assets/app.js         Search filter for the tools page
assets/favicon.svg    Favicon
assets/og-image.png   Social share image (Open Graph / Twitter)
sitemap.xml           Search-engine sitemap (www URLs + lastmod)
robots.txt            Crawler rules + sitemap pointer
.htaccess             Optional Apache config (www redirect, cache, headers)
site.webmanifest      PWA metadata
