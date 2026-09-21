/**
 * ============================================================================
 * Seeed reTerminal E1001 E-Paper Clock - GxEPD2 Native Driver Firmware
 * Version: 2026.09.21.18.15.00
 * Description: Native e-paper driver firmware for Seeed Studio reTerminal E1001.
 *              Uses Seeed_GxEPD2 with UC8179/GDEY075T7 controller to render
 *              a centered analog clock updating every 60 seconds.
 * ============================================================================
 */

#include <Arduino.h>
#include <SPI.h>
#include <GxEPD2_BW.h>
#include <Adafruit_GFX.h>
#include <time.h>
#include <sys/time.h>

// ============================================================================
// CONFIGURATION PARAMETERS (NO MAGIC NUMBERS)
// Default values are documented in comments for reference and modification.
// ============================================================================

// Hardware SPI and Control Pins for Seeed reTerminal E1001 (ESP32-S3)
const int PIN_SPI_SCK   = 7;  // Default: 7 (SPI Clock)
const int PIN_SPI_MISO  = 8;  // Default: 8 (SPI MISO)
const int PIN_SPI_MOSI  = 9;  // Default: 9 (SPI MOSI)
const int PIN_EPD_CS    = 10; // Default: 10 (E-Paper Chip Select)
const int PIN_EPD_DC    = 11; // Default: 11 (E-Paper Data/Command)
const int PIN_EPD_RST   = 12; // Default: 12 (E-Paper Reset)
const int PIN_EPD_BUSY  = 13; // Default: 13 (E-Paper Busy)
const int PIN_SD_CS     = 14; // Default: 14 (MicroSD Chip Select - must be HIGH to release SPI bus)
const int PIN_SD_EN     = 16; // Default: 16 (MicroSD Power Enable)

// Display Canvas Geometry
const int SCREEN_WIDTH      = 800; // Default: 800 (E1001 width)
const int SCREEN_HEIGHT     = 480; // Default: 480 (E1001 height)
const int CENTER_X          = SCREEN_WIDTH / 2;  // Default: 400 (Canvas X center)
const int CENTER_Y          = SCREEN_HEIGHT / 2; // Default: 240 (Canvas Y center)

// Dial & Hands Geometry
const int CLOCK_RADIUS      = 195; // Default: 195 (Outer clock radius)
const int INNER_DIAL_RADIUS = 185; // Default: 185 (Inner bezel radius)
const int HOUR_HAND_LENGTH  = 105; // Default: 105 (Hour hand length)
const int MINUTE_HAND_LENGTH= 155; // Default: 155 (Minute hand length)
const int HOUR_HAND_WIDTH   = 6;   // Default: 6 (Hour hand stroke width)
const int MINUTE_HAND_WIDTH = 4;   // Default: 4 (Minute hand stroke width)
const int CENTER_PIN_RADIUS = 7;   // Default: 7 (Center cap radius)

// Dial Markings
const int HOUR_TICK_LEN     = 16;  // Default: 16 (Length of hour tick)
const int MINUTE_TICK_LEN   = 7;   // Default: 7 (Length of minute tick)
const int NUMERAL_INSET     = 34;  // Default: 34 (Numeral distance from rim)

// Timing & Sleep
const uint64_t UPDATE_INTERVAL_US = 60ULL * 1000000ULL; // Default: 60s in microseconds
const uint32_t GLOBAL_SEED        = 42;                 // Default: 42 (Global PRNG seed)

// ============================================================================
// 5 ADOBE KULER INSPIRED PALETTES (E-Paper 2-color / Monochrome Mapping)
// ============================================================================
struct PaletteConfig {
  const char* name;
  uint16_t bgColor;
  uint16_t fgColor;
};

const PaletteConfig PALETTES[5] = {
  // Palette 0: Classic E-Ink Slate & Paper
  { "Classic E-Ink Slate & Paper", GxEPD_WHITE, GxEPD_BLACK },
  // Palette 1: Bauhaus Modernist
  { "Bauhaus Modernist",           GxEPD_WHITE, GxEPD_BLACK },
  // Palette 2: Nord Timeless
  { "Nord Timeless",               GxEPD_BLACK, GxEPD_WHITE },
  // Palette 3: Vintage Watchmaker
  { "Vintage Watchmaker",          GxEPD_WHITE, GxEPD_BLACK },
  // Palette 4: Sandstorm Minimalist
  { "Sandstorm Minimalist",        GxEPD_WHITE, GxEPD_BLACK }
};

int activePaletteIndex = 0; // Default: 0 (Classic E-Ink Slate & Paper)

// GxEPD2 Display Instance for 7.5" 800x480 (UC8179 / GDEY075T7)
GxEPD2_BW<GxEPD2_750_T7, GxEPD2_750_T7::HEIGHT> display(
  GxEPD2_750_T7(PIN_EPD_CS, PIN_EPD_DC, PIN_EPD_RST, PIN_EPD_BUSY)
);

/**
 * Draws the analog clock face into GxEPD2 buffer
 */
void drawClockPage(int hour, int minute, int day, int month) {
  const PaletteConfig& pal = PALETTES[activePaletteIndex];

  // 1. Clear Screen
  display.fillScreen(pal.bgColor);

  // 2. Draw Outer Bezel & Inner Rim
  display.drawCircle(CENTER_X, CENTER_Y, CLOCK_RADIUS, pal.fgColor);
  display.drawCircle(CENTER_X, CENTER_Y, CLOCK_RADIUS - 1, pal.fgColor);
  display.drawCircle(CENTER_X, CENTER_Y, INNER_DIAL_RADIUS, pal.fgColor);

  // 3. Draw Ticks around Dial
  for (int i = 0; i < 60; i++) {
    float angle = (i * PI) / 30.0f;
    bool isHour = (i % 5 == 0);
    int tickLen = isHour ? HOUR_TICK_LEN : MINUTE_TICK_LEN;

    int x1 = CENTER_X + (int)(sin(angle) * INNER_DIAL_RADIUS);
    int y1 = CENTER_Y - (int)(cos(angle) * INNER_DIAL_RADIUS);
    int x2 = CENTER_X + (int)(sin(angle) * (INNER_DIAL_RADIUS - tickLen));
    int y2 = CENTER_Y - (int)(cos(angle) * (INNER_DIAL_RADIUS - tickLen));

    display.drawLine(x1, y1, x2, y2, pal.fgColor);
    if (isHour) {
      display.drawLine(x1 + 1, y1, x2 + 1, y2, pal.fgColor);
    }
  }

  // 4. Draw Dial Numerals (12, 3, 6, 9)
  display.setTextColor(pal.fgColor);
  display.setTextSize(3);

  display.setCursor(CENTER_X - 18, CENTER_Y - INNER_DIAL_RADIUS + NUMERAL_INSET - 10);
  display.print("12");

  display.setCursor(CENTER_X - 8, CENTER_Y + INNER_DIAL_RADIUS - NUMERAL_INSET - 12);
  display.print("6");

  display.setCursor(CENTER_X + INNER_DIAL_RADIUS - NUMERAL_INSET - 8, CENTER_Y - 10);
  display.print("3");

  display.setCursor(CENTER_X - INNER_DIAL_RADIUS + NUMERAL_INSET - 12, CENTER_Y - 10);
  display.print("9");

  // 5. Draw Date Widget Ribbon
  char dateBuf[32];
  const char* monthNames[] = { "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC" };
  snprintf(dateBuf, sizeof(dateBuf), "%s %02d", monthNames[month % 12], day);

  display.drawRoundRect(CENTER_X - 60, CENTER_Y + 55, 120, 28, 6, pal.fgColor);
  display.setTextSize(2);
  display.setCursor(CENTER_X - 42, CENTER_Y + 62);
  display.print(dateBuf);

  // 6. Calculate Hand Angles
  float hourAngle = ((hour % 12) + minute / 60.0f) * (PI / 6.0f);
  float minAngle  = minute * (PI / 30.0f);

  // 7. Draw Hour Hand
  int hx = CENTER_X + (int)(sin(hourAngle) * HOUR_HAND_LENGTH);
  int hy = CENTER_Y - (int)(cos(hourAngle) * HOUR_HAND_LENGTH);
  for (int w = -HOUR_HAND_WIDTH / 2; w <= HOUR_HAND_WIDTH / 2; w++) {
    display.drawLine(CENTER_X + w, CENTER_Y, hx + w, hy, pal.fgColor);
  }

  // 8. Draw Minute Hand
  int mx = CENTER_X + (int)(sin(minAngle) * MINUTE_HAND_LENGTH);
  int my = CENTER_Y - (int)(cos(minAngle) * MINUTE_HAND_LENGTH);
  for (int w = -MINUTE_HAND_WIDTH / 2; w <= MINUTE_HAND_WIDTH / 2; w++) {
    display.drawLine(CENTER_X + w, CENTER_Y, mx + w, my, pal.fgColor);
  }

  // 9. Draw Center Hub
  display.fillCircle(CENTER_X, CENTER_Y, CENTER_PIN_RADIUS, pal.fgColor);
  display.fillCircle(CENTER_X, CENTER_Y, 2, pal.bgColor);

  // 10. Draw Telemetry Accents (Keep Battery Level only)
  display.setTextSize(1);
  display.setCursor(SCREEN_WIDTH - 120, 25);
  display.print("BATTERY: 100%");
}

#ifndef BUILD_EPOCH
#define BUILD_EPOCH 1789989600L // Fallback timestamp: Sep 21 2026
#endif

// Persist timestamp across ESP32 deep sleep cycles
RTC_DATA_ATTR static time_t rtc_epoch = 0;

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("=========================================");
  Serial.println("Seeed reTerminal E1001 GxEPD2 Clock Init");
  Serial.println("Version: 2026.09.21.18.20.00");
  Serial.println("=========================================");

  // 1. Release SD Card from SPI bus so it does not interfere with E-Paper
  pinMode(PIN_SD_CS, OUTPUT);
  digitalWrite(PIN_SD_CS, HIGH);
  pinMode(PIN_SD_EN, OUTPUT);
  digitalWrite(PIN_SD_EN, LOW);

  // 2. Initialize Custom SPI for Seeed E1001 pins
  SPI.begin(PIN_SPI_SCK, PIN_SPI_MISO, PIN_SPI_MOSI, PIN_EPD_CS);

  // 3. Initialize GxEPD2 display
  display.init(115200, true, 50, false);
  display.setRotation(0);

  // 4. Real RTC Timekeeping across deep sleep
  esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();
  if (wakeup_reason == ESP_SLEEP_WAKEUP_TIMER && rtc_epoch > 0) {
    // Advance timestamp by the sleep duration (60 seconds)
    rtc_epoch += 60;
  } else {
    // Cold boot / reset: initialize from current build epoch
    rtc_epoch = BUILD_EPOCH;
  }

  // Set system timeval with Bangkok UTC+7 offset
  time_t local_epoch = rtc_epoch + (7 * 3600);
  struct timeval tv = { .tv_sec = local_epoch, .tv_usec = 0 };
  settimeofday(&tv, NULL);

  struct tm* timeinfo = localtime(&local_epoch);

  int curHour   = timeinfo->tm_hour;
  int curMin    = timeinfo->tm_min;
  int curDay    = timeinfo->tm_mday;
  int curMonth  = timeinfo->tm_mon;

  Serial.printf("[E1001] Rendering real-time clock: %02d:%02d on %02d/%02d\n", curHour, curMin, curDay, curMonth + 1);

  // 5. Full buffer render and refresh
  display.setFullWindow();
  display.firstPage();
  do {
    drawClockPage(curHour, curMin, curDay, curMonth);
  } while (display.nextPage());

  display.powerOff();
  Serial.println("[E1001] Display refresh completed.");

  // 6. Deep sleep timer setup (60 seconds)
  esp_sleep_enable_timer_wakeup(UPDATE_INTERVAL_US);
  Serial.println("[E1001] Entering deep sleep for 60s...");
  Serial.flush();
  esp_deep_sleep_start();
}

void loop() {
  // Never reached
}
