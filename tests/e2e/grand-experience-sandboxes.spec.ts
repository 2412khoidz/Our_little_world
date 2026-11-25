import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

const SHOWCASE_DIR = process.env.OLW_SHOWCASE_OUTPUT_DIR || path.join(process.cwd(), 'test-results', 'grand-showcase');
const ART_AFTER_DIR = path.join(process.cwd(), 'test-results', 'art-pass', 'after');

function ensureShowcaseDir() {
  fs.mkdirSync(SHOWCASE_DIR, { recursive: true });
  fs.mkdirSync(ART_AFTER_DIR, { recursive: true });
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

function buildGifFromFrames(frameDir: string, outGifPath: string, durationMs = 260) {
  const pyScript = path.join(frameDir, 'make_gif.py');
  const lines = [
    'import glob',
    'from PIL import Image',
    `frames = sorted(glob.glob(${JSON.stringify(path.join(frameDir, '*.png'))}))`,
    'assert len(frames) >= 2, f"Expected >=2 frames, got {len(frames)}"',
    'imgs = [Image.open(f).convert("RGB").resize((640, 360), Image.Resampling.NEAREST) for f in frames]',
    `imgs[0].save(${JSON.stringify(outGifPath)}, save_all=True, append_images=imgs[1:], duration=${durationMs}, loop=0, optimize=True)`,
    'print("GIF OK", len(imgs))',
  ];
  fs.writeFileSync(pyScript, lines.join('\n'), 'utf8');
  execSync(`python "${pyScript}"`, { stdio: 'inherit' });
}

test.describe('Grand Pre-Integration Experience & Sandboxes QA', () => {
  test.beforeEach(() => {
    ensureShowcaseDir();
  });

  test('renders all 5 dev sandboxes cleanly with zero pageerror and zero overflow', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);
    const tag = testInfo.project.name.includes('iphone') ? 'mobile' : 'desktop';
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // 1. Pet Art Sandbox
    await page.goto('/?pet-art=1');
    await expect(page.getByTestId('pet-art-sandbox')).toBeVisible();
    await page.waitForTimeout(350);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(SHOWCASE_DIR, `01-pet-art-${tag}.png`) });

    // 2. UI Variants Sandbox — test both variants
    await page.goto('/?ui-sandbox=1');
    await expect(page.getByTestId('ui-variant-sandbox')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(SHOWCASE_DIR, `02-ui-cottage-${tag}.png`) });

    const sbNotebook = page.getByTestId('our-little-notebook');
    if (await sbNotebook.isVisible()) {
      await sbNotebook.getByRole('button', { name: 'Đóng' }).click();
    }
    await page.getByTestId('btn-variant-storybook').click();
    await page.waitForTimeout(200);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(SHOWCASE_DIR, `03-ui-storybook-${tag}.png`) });

    // 3. World Expansion Sandbox (64x64 / 96x96)
    await page.goto('/?world-sandbox=1');
    await expect(page.getByTestId('world-expansion-sandbox')).toBeVisible();
    await expect(page.getByTestId('world-expansion-sandbox').locator('canvas')).toBeVisible();
    await page.waitForTimeout(700);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(SHOWCASE_DIR, `04-world-expansion-${tag}.png`) });

    // 4. Pet Lab Sandbox
    await page.goto('/?pet-lab=1');
    await expect(page.getByTestId('pet-lab-sandbox')).toBeVisible();
    await page.waitForTimeout(300);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(SHOWCASE_DIR, `05-pet-lab-${tag}.png`) });

    // 5. Combined Experience Demo — physical feeding [1] + [J], interior toggle, notebook check
    await page.goto('/?experience-demo=1');
    await expect(page.getByTestId('combined-experience-demo')).toBeVisible();
    await expect(page.getByTestId('combined-experience-demo').locator('canvas')).toBeVisible();
    await page.waitForTimeout(800);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(SHOWCASE_DIR, `06-combined-experience-${tag}.png`) });
    await page.screenshot({ path: path.join(ART_AFTER_DIR, `after-combined-outdoor-${tag}.png`) });

    if (tag === 'desktop') {
      await page.getByTestId('btn-toggle-interior').click();
      await page.waitForTimeout(550);
      await expect(page.getByTestId('btn-toggle-interior')).toContainText('Ra hiên vườn');
      await page.screenshot({ path: path.join(ART_AFTER_DIR, 'after-combined-indoor-desktop.png') });
      await page.getByTestId('btn-toggle-interior').click();
      await page.waitForTimeout(450);
    }

    // Select hotbar slot 1 (kibble) & interact via [J] or context button
    await page.getByTestId('hotbar-slot-1').click();
    await page.waitForTimeout(150);
    const primaryBtn = page.getByTestId('btn-context-primary');
    if (await primaryBtn.isVisible()) {
      await primaryBtn.click();
    } else {
      await page.keyboard.press('KeyJ');
    }
    await page.waitForTimeout(350);

    // Open Shared Notebook and verify pet tab + journal tab
    await page.getByTestId('btn-open-notebook').click();
    await expect(page.getByTestId('our-little-notebook')).toBeVisible();
    await expect(page.getByTestId('pet-notebook-page')).toBeVisible();
    await page.waitForTimeout(220);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(SHOWCASE_DIR, `07-notebook-pet-${tag}.png`) });

    await page.getByTestId('notebook-tab-journal').click();
    await page.getByTestId('journal-input-title').fill('Chiều dạo cùng Quýt');
    await page.getByTestId('journal-input-body').fill('Bé tự chạy ra đón bên hiên nắng.');
    await page.getByTestId('journal-submit-btn').click();
    await expect(page.getByText('Chiều dạo cùng Quýt')).toBeVisible();
    await assertNoHorizontalOverflow(page);

    if (tag === 'desktop') {
      // Also verify small mobile 390x844 and landscape 844x390 on combined experience
      await page.goto('/?experience-demo=1');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);
      await assertNoHorizontalOverflow(page);
      await page.screenshot({ path: path.join(SHOWCASE_DIR, '08-combined-small-390x844.png') });

      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(500);
      await assertNoHorizontalOverflow(page);
      await page.screenshot({ path: path.join(SHOWCASE_DIR, '09-combined-landscape-844x390.png') });
    }

    expect(errors).toEqual([]);
  });

  test('captures real animated GIF evidence for locomotion/wake and physical feeding/play on desktop', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name.includes('iphone'), 'Animated GIF capture runs once on desktop viewport.');

    const tmpFramesA = path.join(SHOWCASE_DIR, '.tmp-frames-loco');
    const tmpFramesB = path.join(SHOWCASE_DIR, '.tmp-frames-care');
    fs.rmSync(tmpFramesA, { recursive: true, force: true });
    fs.rmSync(tmpFramesB, { recursive: true, force: true });
    fs.mkdirSync(tmpFramesA, { recursive: true });
    fs.mkdirSync(tmpFramesB, { recursive: true });

    try {
      // GIF 1: Pet Art Sandbox cycling Sleep -> Wake Yawn Stretch -> Walk East -> Happy Hop
      await page.goto('/?pet-art=1');
      await expect(page.getByTestId('pet-art-sandbox')).toBeVisible();
      const statesToCapture = [
        'Cuộn tròn ngủ',
        'Thức dậy · Ngáp & Duỗi',
        'Đi bộ (Đông)',
        'Nhảy mừng vui vẻ',
      ];
      let idx = 0;
      for (const label of statesToCapture) {
        const btn = page.getByRole('button', { name: label, exact: true });
        await btn.click();
        for (let k = 0; k < 3; k += 1) {
          await page.waitForTimeout(210);
          idx += 1;
          await page.screenshot({
            path: path.join(tmpFramesA, `f-${String(idx).padStart(2, '0')}.png`),
          });
        }
      }
      buildGifFromFrames(
        tmpFramesA,
        path.join(SHOWCASE_DIR, 'pet-locomotion-and-wake.gif'),
        240,
      );

      // GIF 2: Combined Experience Demo — walk, hold food slot 1, feed/pet near cat, hold yarn slot 5 & toss
      await page.goto('/?experience-demo=1');
      await expect(page.getByTestId('combined-experience-demo').locator('canvas')).toBeVisible();
      await page.waitForTimeout(700);

      let f2 = 0;
      const snapCare = async (waitMs = 240) => {
        await page.waitForTimeout(waitMs);
        f2 += 1;
        await page.screenshot({
          path: path.join(tmpFramesB, `c-${String(f2).padStart(2, '0')}.png`),
        });
      };

      await snapCare(250);
      await page.getByTestId('hotbar-slot-1').click();
      await snapCare(250);
      await page.keyboard.press('KeyJ');
      await snapCare(300);
      await snapCare(300);
      await page.getByTestId('hotbar-slot-5').click();
      await snapCare(250);
      await page.keyboard.press('KeyJ');
      await snapCare(300);
      await snapCare(300);
      await page.keyboard.down('KeyD');
      await snapCare(280);
      await page.keyboard.up('KeyD');
      await snapCare(250);

      buildGifFromFrames(
        tmpFramesB,
        path.join(SHOWCASE_DIR, 'pet-physical-feeding-and-play.gif'),
        280,
      );

      expect(fs.existsSync(path.join(SHOWCASE_DIR, 'pet-locomotion-and-wake.gif'))).toBe(true);
      expect(fs.existsSync(path.join(SHOWCASE_DIR, 'pet-physical-feeding-and-play.gif'))).toBe(true);

      // Copy & capture final Art Pass visual proof (Pet Art + Quadruped GIF + 4 Tabletop Mini-games)
      await page.goto('/?pet-art=1');
      await expect(page.getByTestId('pet-art-sandbox')).toBeVisible();
      await page.getByRole('button', { name: 'Đi bộ (Đông)', exact: true }).click();
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(ART_AFTER_DIR, 'after-pet-art-desktop.png') });
      fs.copyFileSync(
        path.join(SHOWCASE_DIR, 'pet-locomotion-and-wake.gif'),
        path.join(ART_AFTER_DIR, 'after-pet-quadruped.gif'),
      );

      await page.goto('/minigames.html');
      await expect(page.getByTestId('caro-shell')).toBeVisible();
      await page.getByTestId('caro-cell-112').click();
      await page.getByTestId('caro-cell-113').click();
      await page.screenshot({ path: path.join(ART_AFTER_DIR, 'after-minigame-caro-desktop.png') });

      await page.setViewportSize({ width: 430, height: 932 });
      await page.getByTestId('minigame-tab-othello').click();
      await expect(page.getByTestId('othello-shell')).toBeVisible();
      await page.screenshot({ path: path.join(ART_AFTER_DIR, 'after-minigame-othello-mobile.png') });

      await page.getByTestId('minigame-tab-memory').click();
      await expect(page.getByTestId('memory-shell')).toBeVisible();
      await page.getByTestId('memory-card-0').click();
      await page.screenshot({ path: path.join(ART_AFTER_DIR, 'after-minigame-memory-mobile.png') });

      await page.getByTestId('minigame-tab-battleship').click();
      await expect(page.getByTestId('battleship-shell')).toBeVisible();
      await page.screenshot({ path: path.join(ART_AFTER_DIR, 'after-minigame-battleship-mobile.png') });
    } finally {
      fs.rmSync(tmpFramesA, { recursive: true, force: true });
      fs.rmSync(tmpFramesB, { recursive: true, force: true });
    }
  });
});
