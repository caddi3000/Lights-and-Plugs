# Lights and Plugs v0.2.1

HACS Lovelace/dashboard card.

Fixes:
- floorplan.png is bundled beside the JavaScript file
- the image URL is resolved relative to the HACS-loaded module
- the floorplan stage has a fixed aspect ratio, preventing marker collapse
- no power measurements
- brightness sliders remain for dimmable lights
- automatic Home Assistant Area discovery remains

Card YAML:

```yaml
type: custom:auto-floorplan-controls
title: Lights & Plugs
```

Upload the CONTENTS of this ZIP directly to the root of `caddi3000/Lights-and-Plugs`.
