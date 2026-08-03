#!/usr/bin/env python3
"""Generate campaign poster design guide PDF (poster-guide.pdf)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    from fpdf import FPDF
except ImportError:
    print("Installing fpdf2...", file=sys.stderr)
    os.system(f'"{sys.executable}" -m pip install fpdf2 -q')
    from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[2]
OUT_PATH = ROOT / "src" / "component" / "lobby" / "campaign" / "assets" / "poster-guide.pdf"

FONT_CANDIDATES = [
    Path(r"C:\Windows\Fonts\msyh.ttc"),
    Path(r"C:\Windows\Fonts\msyhbd.ttc"),
    Path(r"C:\Windows\Fonts\simhei.ttf"),
    Path(r"C:\Windows\Fonts\simsun.ttc"),
    Path("/System/Library/Fonts/PingFang.ttc"),
    Path("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"),
    Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
]


def find_font() -> Path:
    for candidate in FONT_CANDIDATES:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        "No CJK font found. Install fpdf2 and ensure msyh/simhei/Noto CJK is available."
    )


class GuidePDF(FPDF):
    def __init__(self, font_path: Path) -> None:
        super().__init__(orientation="P", unit="mm", format="A4")
        self.font_path = font_path
        self.add_font("CJK", "", str(font_path))
        self.add_font("CJK", "B", str(font_path))
        self.set_auto_page_break(auto=True, margin=18)

    def header_block(self, title: str, subtitle: str = "") -> None:
        self.set_font("CJK", "B", 18)
        self.multi_cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        if subtitle:
            self.set_font("CJK", "", 10)
            self.set_text_color(90, 90, 90)
            self.multi_cell(0, 6, subtitle, new_x="LMARGIN", new_y="NEXT")
            self.set_text_color(0, 0, 0)
        self.ln(2)

    def section(self, title: str) -> None:
        self.ln(3)
        self.set_font("CJK", "B", 13)
        self.set_fill_color(37, 99, 235)
        self.set_text_color(255, 255, 255)
        self.cell(0, 8, f"  {title}", new_x="LMARGIN", new_y="NEXT", fill=True)
        self.set_text_color(0, 0, 0)
        self.ln(2)

    def body(self, text: str) -> None:
        self.set_font("CJK", "", 10)
        self.multi_cell(0, 5.5, text, new_x="LMARGIN", new_y="NEXT")

    def bullet(self, text: str) -> None:
        self.set_font("CJK", "", 10)
        self.multi_cell(0, 5.5, f"  • {text}", new_x="LMARGIN", new_y="NEXT")

    def diagram_box(self, lines: list[str], title: str = "") -> None:
        if title:
            self.set_font("CJK", "B", 10)
            self.body(title)
        self.set_font("Courier", "", 8.5)
        self.set_fill_color(248, 250, 252)
        max_len = max(len(line) for line in lines)
        w = min(170, max(120, max_len * 1.9))
        h = len(lines) * 4.2 + 6
        x = self.get_x()
        y = self.get_y()
        self.rect(x, y, w, h, style="F")
        self.set_xy(x + 4, y + 3)
        for line in lines:
            self.cell(w - 8, 4.2, line, new_x="LMARGIN", new_y="NEXT")
        self.set_xy(x, y + h + 2)
        self.set_font("CJK", "", 10)


def build_pdf() -> None:
    font_path = find_font()
    pdf = GuidePDF(font_path)

    pdf.add_page()
    pdf.header_block(
        "活动海报设计指南",
        "Campaign Landing Poster Guide · 横竖各一张 · tacticalMonster",
    )

    pdf.section("1. 交付物")
    pdf.bullet("poster-portrait.jpg — 竖屏背景，比例 9:16（如 1080×1920 或 1170×2532）")
    pdf.bullet("poster-landscape.jpg — 横屏背景，比例 16:9（如 1920×1080）")
    pdf.bullet("同一活动、同一视觉主题，两种独立构图（不要只裁一张）")
    pdf.body(
        "页面对应：竖屏用 bg-mobile，横屏用 bg-desktop；"
        "通过 <picture> + object-fit: cover 全屏铺满。"
    )

    pdf.section("2. 页面 UI 占用（必留安全区）")
    pdf.diagram_box(
        [
            "+-----------------------------+",
            "|  顶栏安全区  ~60-120px       |  商家名、登录（白字+顶渐变）",
            "|                             |",
            "|      ★ 主视觉安全区 ★        |  角色/产品/主标题放这里",
            "|      （画面中心 60-70%）      |",
            "|                             |",
            "|  底栏安全区  ~200-300px      |  活动栏 150px + 按钮",
            "+-----------------------------+",
            "     左右各约 5-8% 可能被 cover 裁切",
        ],
        "竖屏安全区示意（1080×1920 基准）：",
    )
    pdf.body(
        "横屏（1920×1080）：顶栏约 80px，底栏约 200px；"
        "主体水平居中，可略偏左。"
    )

    pdf.section("3. object-fit: cover 裁切规则")
    pdf.bullet("等比放大图片直到铺满视口，多出的部分裁掉，不变形。")
    pdf.bullet("默认 object-position: center — 以图片中心为锚点裁切。")
    pdf.bullet("视口比图片更「扁」→ 裁左右；视口比图片更「高」→ 裁上下。")
    pdf.bullet("与是否 16:9 / 9:16 无关；非标比例（4:3、19.5:9）只是多裁一点边。")
    pdf.body("设计原则：主体放在画面中心安全框内，四边当出血。")

    pdf.section("4. 海报上放什么 / 不放什么")
    pdf.set_font("CJK", "B", 10)
    pdf.body("可放在海报上：")
    pdf.bullet("品牌 / 产品 / 角色主视觉")
    pdf.bullet("可选：活动主标题或一句 slogan（须在主视觉区内）")
    pdf.ln(1)
    pdf.set_font("CJK", "B", 10)
    pdf.body("不要放在海报上（由活动栏 UI 展示）：")
    pdf.bullet("活动时间、倒计时、奖励规则、已领 x/y、按钮文案")
    pdf.body("避免与透明底栏白字重复或被遮挡。")

    pdf.section("5. 竖屏 vs 横屏构图")
    pdf.diagram_box(
        [
            "竖屏 9:16              横屏 16:9",
            "   +---+                +----------------+",
            "   | 脸 |                |  脸 + 场景横向  |",
            "   | 身 |                |                |",
            "   +---+                +----------------+",
        ],
        "同一主题，两种构图：",
    )
    pdf.bullet("竖屏：主体纵向居中或略偏上")
    pdf.bullet("横屏：主体横向展开，居中或略偏左")
    pdf.bullet("顶/底 15-20% 做 UI 友好层：略暗、低细节、少纹理")

    pdf.add_page()
    pdf.section("6. 色彩与可读性")
    pdf.bullet("活动栏为透明底 + 白字 + 深色描边；底区避免纯白/高对比条纹。")
    pdf.bullet("中间主视觉可饱和；上下略压暗便于 UI 阅读。")
    pdf.bullet("导出 sRGB JPG，质量 82-85%，单张建议 < 500KB。")

    pdf.section("7. 导出尺寸速查")
    pdf.set_font("CJK", "", 10)
    col_w = [45, 30, 55, 45]
    pdf.set_fill_color(229, 231, 235)
    headers = ["用途", "比例", "推荐像素", "文件名"]
    for i, h in enumerate(headers):
        pdf.cell(col_w[i], 7, h, border=1, fill=True)
    pdf.ln()
    rows = [
        ("竖屏背景", "9:16", "1080×1920", "bg-mobile"),
        ("横屏背景", "16:9", "1920×1080", "bg-desktop"),
    ]
    for row in rows:
        for i, cell in enumerate(row):
            pdf.cell(col_w[i], 7, cell, border=1)
        pdf.ln()

    pdf.section("8. 上线前验收清单")
    checks = [
        "iPhone 竖屏 390×844 — 主体完整、底栏白字清晰",
        "iPhone 横屏 844×390 — 主体未被裁没",
        "平板横屏 1024×768 — 构图正常",
        "横屏宽 < 1000px — 活动栏内容单行/换行正常",
        "竖横两张风格统一，不是同图硬裁",
    ]
    for item in checks:
        pdf.bullet(item)

    pdf.section("9. 可选扩展")
    pdf.bullet("商家后台配置 posterPortraitUrl / posterLandscapeUrl")
    pdf.bullet("按活动配置 object-position（如 center 35%）微调裁切焦点")

    pdf.ln(6)
    pdf.set_font("CJK", "", 9)
    pdf.set_text_color(120, 120, 120)
    pdf.body(
        f"Generated for tacticalMonster campaign landing · "
        f"Output: {OUT_PATH.relative_to(ROOT).as_posix()}"
    )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT_PATH))
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    build_pdf()
