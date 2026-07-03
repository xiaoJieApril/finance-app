const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'images');

const COLORS = {
  navy: [9, 18, 35, 255],
  navy2: [15, 28, 52, 255],
  indigo: [79, 70, 229, 255],
  emerald: [16, 185, 129, 255],
  gold: [212, 175, 55, 255],
  slate: [148, 163, 184, 255],
  white: [248, 250, 252, 255],
  transparent: [0, 0, 0, 0],
};

function png(size, transparent = false) {
  const image = new PNG({ width: size, height: size });
  fill(image, transparent ? COLORS.transparent : COLORS.navy);
  return image;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function blendColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    Math.round(a[3] + (b[3] - a[3]) * t),
  ];
}

function fill(image, color) {
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      setPixel(image, x, y, color);
    }
  }
}

function setPixel(image, x, y, color, alpha = 1) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const idx = (Math.floor(y) * image.width + Math.floor(x)) * 4;
  const srcA = (color[3] / 255) * alpha;
  const dstA = image.data[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);

  if (outA <= 0) {
    image.data[idx] = 0;
    image.data[idx + 1] = 0;
    image.data[idx + 2] = 0;
    image.data[idx + 3] = 0;
    return;
  }

  image.data[idx] = Math.round((color[0] * srcA + image.data[idx] * dstA * (1 - srcA)) / outA);
  image.data[idx + 1] = Math.round((color[1] * srcA + image.data[idx + 1] * dstA * (1 - srcA)) / outA);
  image.data[idx + 2] = Math.round((color[2] * srcA + image.data[idx + 2] * dstA * (1 - srcA)) / outA);
  image.data[idx + 3] = Math.round(outA * 255);
}

function gradientBackground(image) {
  const cx = image.width * 0.68;
  const cy = image.height * 0.25;
  const maxD = Math.hypot(image.width, image.height);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const vertical = y / image.height;
      const glow = 1 - clamp(Math.hypot(x - cx, y - cy) / (maxD * 0.72), 0, 1);
      let color = blendColor(COLORS.navy, COLORS.navy2, vertical * 0.72);
      color = blendColor(color, [28, 41, 84, 255], glow * 0.55);
      setPixel(image, x, y, color);
    }
  }
}

function roundedRect(image, x, y, w, h, r, color, alpha = 1) {
  const x2 = x + w;
  const y2 = y + h;
  for (let py = Math.floor(y); py <= Math.ceil(y2); py += 1) {
    for (let px = Math.floor(x); px <= Math.ceil(x2); px += 1) {
      const dx = Math.max(x - px, 0, px - x2 + 1);
      const dy = Math.max(y - py, 0, py - y2 + 1);
      if (dx * dx + dy * dy <= r * r || (px >= x + r && px <= x2 - r) || (py >= y + r && py <= y2 - r)) {
        setPixel(image, px, py, color, alpha);
      }
    }
  }
}

function circle(image, cx, cy, r, color, alpha = 1) {
  const rr = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
      const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d <= rr) setPixel(image, x, y, color, alpha);
    }
  }
}

function line(image, x1, y1, x2, y2, width, color, alpha = 1) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    circle(image, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, color, alpha);
  }
}

function polygon(image, points, color, alpha = 1) {
  const minX = Math.floor(Math.min(...points.map((p) => p[0])));
  const maxX = Math.ceil(Math.max(...points.map((p) => p[0])));
  const minY = Math.floor(Math.min(...points.map((p) => p[1])));
  const maxY = Math.ceil(Math.max(...points.map((p) => p[1])));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        const xi = points[i][0];
        const yi = points[i][1];
        const xj = points[j][0];
        const yj = points[j][1];
        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      if (inside) setPixel(image, x, y, color, alpha);
    }
  }
}

function shieldPoints(size, scale = 1) {
  const cx = size / 2;
  const top = size * 0.21;
  const w = size * 0.48 * scale;
  return [
    [cx, top],
    [cx + w * 0.52, top + size * 0.1],
    [cx + w * 0.45, top + size * 0.38],
    [cx + w * 0.18, top + size * 0.55],
    [cx, top + size * 0.65],
    [cx - w * 0.18, top + size * 0.55],
    [cx - w * 0.45, top + size * 0.38],
    [cx - w * 0.52, top + size * 0.1],
  ];
}

function drawShieldLogo(image, transparent = false) {
  const s = image.width;
  if (!transparent) gradientBackground(image);
  polygon(image, shieldPoints(s, 1.18), COLORS.gold, 0.96);
  polygon(image, shieldPoints(s, 0.95), transparent ? COLORS.navy : [13, 25, 48, 255], 1);
  polygon(image, shieldPoints(s, 0.77), [18, 36, 63, 255], 0.95);

  line(image, s * 0.31, s * 0.58, s * 0.43, s * 0.48, s * 0.055, COLORS.emerald);
  line(image, s * 0.43, s * 0.48, s * 0.53, s * 0.54, s * 0.055, COLORS.emerald);
  line(image, s * 0.53, s * 0.54, s * 0.72, s * 0.36, s * 0.055, COLORS.emerald);
  polygon(image, [
    [s * 0.72, s * 0.36],
    [s * 0.68, s * 0.49],
    [s * 0.81, s * 0.45],
  ], COLORS.emerald);
  circle(image, s * 0.5, s * 0.5, s * 0.075, COLORS.indigo, 0.9);
  circle(image, s * 0.5, s * 0.5, s * 0.04, COLORS.white, 0.95);
}

function drawWalletLogo(image) {
  const s = image.width;
  gradientBackground(image);
  roundedRect(image, s * 0.23, s * 0.34, s * 0.54, s * 0.34, s * 0.07, COLORS.gold);
  roundedRect(image, s * 0.28, s * 0.28, s * 0.42, s * 0.18, s * 0.05, COLORS.indigo);
  roundedRect(image, s * 0.31, s * 0.39, s * 0.47, s * 0.23, s * 0.055, [17, 31, 58, 255]);
  circle(image, s * 0.66, s * 0.505, s * 0.045, COLORS.emerald);
  line(image, s * 0.34, s * 0.57, s * 0.5, s * 0.48, s * 0.035, COLORS.emerald);
  line(image, s * 0.5, s * 0.48, s * 0.61, s * 0.535, s * 0.035, COLORS.emerald);
}

function drawCashflowLogo(image) {
  const s = image.width;
  gradientBackground(image);
  circle(image, s * 0.5, s * 0.5, s * 0.31, [19, 36, 67, 255], 0.96);
  circle(image, s * 0.5, s * 0.5, s * 0.255, COLORS.navy, 0.92);
  line(image, s * 0.29, s * 0.61, s * 0.43, s * 0.51, s * 0.06, COLORS.gold);
  line(image, s * 0.43, s * 0.51, s * 0.54, s * 0.57, s * 0.06, COLORS.gold);
  line(image, s * 0.54, s * 0.57, s * 0.73, s * 0.36, s * 0.06, COLORS.emerald);
  polygon(image, [
    [s * 0.73, s * 0.36],
    [s * 0.69, s * 0.51],
    [s * 0.84, s * 0.46],
  ], COLORS.emerald);
  roundedRect(image, s * 0.31, s * 0.68, s * 0.38, s * 0.055, s * 0.025, COLORS.indigo, 0.95);
}

function save(image, filename) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, filename);
  fs.writeFileSync(file, PNG.sync.write(image));
  return file;
}

function make() {
  const icon = png(1024);
  drawShieldLogo(icon);
  save(icon, 'icon-v2.png');

  const splash = png(1024, true);
  drawShieldLogo(splash, true);
  save(splash, 'splash-icon-v2.png');

  const foreground = png(1024, true);
  drawShieldLogo(foreground, true);
  save(foreground, 'android-icon-foreground-v2.png');

  const background = png(1024);
  gradientBackground(background);
  save(background, 'android-icon-background-v2.png');

  const monochrome = png(1024, true);
  drawShieldLogo(monochrome, true);
  save(monochrome, 'android-icon-monochrome-v2.png');

  const favicon = png(64);
  drawShieldLogo(favicon);
  save(favicon, 'favicon-v2.png');

  const wallet = png(1024);
  drawWalletLogo(wallet);
  save(wallet, 'logo-candidate-wallet.png');

  const cashflow = png(1024);
  drawCashflowLogo(cashflow);
  save(cashflow, 'logo-candidate-cashflow.png');

  const shield = png(1024);
  drawShieldLogo(shield);
  save(shield, 'logo-candidate-shield.png');
}

make();
console.log('Generated finaTracker logo assets in assets/images');
