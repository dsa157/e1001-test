# Seeed E1001 Analog Clock Screen

A responsive screen renderer, web dashboard, and native embedded firmware optimized for the Seeed Studio reTerminal E1001 7.5" e-paper display (800x480 resolution).

## Project Documentation
- [Architecture](docs/ARCHITECTURE.md)
- [Requirements](docs/REQUIREMENTS.md)
- [UI Design](docs/UI_DESIGN.md)
- [Unit Test Plan](docs/UNIT_TEST.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [Firmware Deployment Guide](firmware/README.md)

## Features
- **Precise 800x480 Canvas**: Native resolution matching the Seeed E1001 7.5-inch e-paper display.
- **Minute-Boundary Sync**: Ticks and updates automatically at exact 60-second intervals.
- **5 Adobe Kuler Palettes**: Curated palettes for e-ink contrast or color preview.
- **E-Paper Simulation**: 1-bit monochrome and 4-level grayscale dithering filters.
- **Mascot**: ChronoOwl ("Inky"), the vigilant e-paper timekeeper.
- **Zero Dependencies**: Lightweight pure HTML5/CSS3/Vanilla JavaScript.
- **Native Firmware**: Embedded ESP32-S3 driver supporting Seeed_GxEPD2 and ESPHome.
