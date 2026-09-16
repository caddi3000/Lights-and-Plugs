# Lights and Plugs v0.2.3

HACS Lovelace floorplan card. v0.2.3 uses the newly approved exact floorplan image, embedded directly into the JavaScript so there is no secondary image loading problem.

- Automatic Home Assistant Area discovery
- Lounge, Dining and Kitchen remain separate
- Lights, plugs and switches only; no power measurements
- Brightness sliders for dimmable lights

```yaml
type: custom:auto-floorplan-controls
title: Lights & Plugs
```

Upload these files to the repository root on the `main` branch, then re-download/update in HACS and hard-refresh the browser.
