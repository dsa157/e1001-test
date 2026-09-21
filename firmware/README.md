# Deploying to Seeed reTerminal E1001

This directory contains deployment options to flash the analog clock firmware to your **Seeed Studio reTerminal E1001** over USB-C (`/dev/cu.usbserial-110`).

---

### Option 1: Browser Web-Serial Flashing (Fastest / No CLI Required)
1. Open Google Chrome or Microsoft Edge.
2. Navigate to the **[Seeed reTerminal E-Series Firmware Hub](https://seeed-projects.github.io/OSHW-reTerminal-Series-E-D/)**.
3. Select **reTerminal E1001**.
4. Click **Connect Device** and choose `/dev/cu.usbserial-110`.
5. Upload your compiled `.bin` or choose the dashboard clock preset.

---

### Option 2: ESPHome CLI Deployment
If you have ESPHome installed:
```bash
# Install ESPHome if needed:
pip install esphome

# Compile and flash directly to your connected E1001:
esphome run firmware/esphome/e1001_analog_clock.yaml --device /dev/cu.usbserial-110
```

---

### Option 3: Arduino IDE / PlatformIO
1. Open the [E1001_Analog_Clock.ino](file:///Users/dsa157/Development/e1001-test/firmware/arduino/E1001_Analog_Clock/E1001_Analog_Clock.ino) sketch in Arduino IDE.
2. Under **Tools > Board**, select **ESP32S3 Dev Module** (or **Seeed XIAO ESP32S3**).
3. Under **Tools > Port**, select `/dev/cu.usbserial-110`.
4. Click **Upload**.
