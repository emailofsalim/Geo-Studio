# Geo Studio

A 100% offline, single-file geomatics toolkit by Md Salim Ansari. Runs in Microsoft Edge with no install and no upload — CSV/XLSX/KML/KMZ/DXF/GeoJSON/GPX/WKT/Shapefile conversion, coordinate tools, survey calculator, borehole/cadastral/boundary-offset mapping, an interactive offline map, and a consolidated Settings hub.

Live: https://emailofsalim.github.io/Geo-Studio/
Build: **v6.0** · service-worker cache **geo-studio-v37**.

## Deploy / update
Replace **index.html** and **sw.js** when you change code (these are the files that change most).
Keep the **icons/** folder, **manifest.webmanifest** and **LICENSE**. After every change, bump the
cache number in **sw.js** (see UPDATE_GUIDE.md), then wait for the green github-pages deploy.
