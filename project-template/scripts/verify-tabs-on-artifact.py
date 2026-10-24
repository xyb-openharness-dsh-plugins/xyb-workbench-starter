#!/usr/bin/env python3
"""在**装机产物**上把所有一级/二级页签逐个点开，证明「装进去的那份能干活」。

为什么不能只跑原型自检：原型是单文件、数据是常量，**接上数据库之后才会走到的分支**
（子表、可选术式、患者没做过的检查）在原型里永远走不到。这里点的是产物 + 真数据库。

判据（缺一条不算通过）：
  1. 0 个未捕获异常、0 条 console error、0 个失败请求（4xx/5xx）
  2. 每个页签都渲染出内容，且没落到「尚未实现」空态
  3. 点开的页签数 = 预期数（传 --navs / --tabs 时校验）
  4. 390 宽不横向溢出

用法：
  node scripts/serve-artifact.mjs --port 5188 &
  python3 scripts/verify-tabs-on-artifact.py --port 5188 --navs 10 --tabs 34

依赖 playwright（`pip install playwright && playwright install chrome`）。
没装就明说，不要静默跳过——跳过等于把这条闸门关掉了。
"""
import argparse
import sys

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("✗ 缺 playwright：pip install playwright && playwright install chrome")
    print("  这条闸门不能跳过——跳过就等于没有装机验收。")
    sys.exit(2)

EMPTY_MARKS = ("本页签尚未实现", "尚未实现", "Not implemented")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=5188)
    ap.add_argument("--width", type=int, default=1440)
    ap.add_argument("--navs", type=int, default=0, help="预期一级数，0 = 不校验")
    ap.add_argument("--tabs", type=int, default=0, help="预期二级合计，0 = 不校验")
    ap.add_argument("--path", default=None, help="UI 路径，默认按 serve-artifact 的约定推导")
    ap.add_argument("--min-chars", type=int, default=30, help="页签内容少于这么多字算空态")
    args = ap.parse_args()

    if args.path:
        url = f"http://127.0.0.1:{args.port}{args.path}"
    else:
        url = f"http://127.0.0.1:{args.port}/api/{_slug()}/ui/"

    console_errors, failed_requests, page_errors = [], [], []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        page = browser.new_page(viewport={"width": args.width, "height": 900})
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: page_errors.append(str(e)))
        page.on("requestfailed", lambda r: failed_requests.append(f"{r.method} {r.url}"))
        page.on("response", lambda r: failed_requests.append(f"{r.status} {r.url}") if r.status >= 400 else None)

        try:
            page.goto(url, wait_until="networkidle")
        except Exception as error:
            browser.close()
            print(f"✗ 打不开 {url}")
            print(f"  {str(error).splitlines()[0]}")
            print("  先另开一个终端跑：node scripts/serve-artifact.mjs --port " + str(args.port))
            sys.exit(2)
        page.wait_for_timeout(800)

        navs = page.eval_on_selector_all(
            "nav a[data-page], .sidenav a[data-page], [data-page]",
            "els => els.map(e => e.dataset.page)",
        )
        seen = set()
        navs = [n for n in navs if n and not (n in seen or seen.add(n))]
        print(f"一级导航：{len(navs)} 个 → {navs}")

        total, empty_tabs = 0, []
        for nav in navs:
            page.click(f'[data-page="{nav}"]')
            page.wait_for_timeout(120)
            tabs = page.eval_on_selector_all(
                "button[role=tab], [data-tab]", "els => els.map(e => e.dataset.tab)"
            )
            seen_t = set()
            tabs = [t for t in tabs if t and not (t in seen_t or seen_t.add(t))]
            for tab in tabs:
                page.click(f'[data-tab="{tab}"]')
                page.wait_for_timeout(60)
                body = page.inner_text("body")
                total += 1
                if any(m in body for m in EMPTY_MARKS) or len(body.strip()) < args.min_chars:
                    empty_tabs.append(f"{nav}/{tab}")

        print(f"二级页签：{total} 个")
        for t in empty_tabs:
            print(f"  ✗ 空态 {t}")

        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(300)
        overflow = page.evaluate("() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth })")
        browser.close()

    print()
    ok = True

    def chk(cond, label, extra=""):
        nonlocal ok
        print(f"  {'✓' if cond else '✗'} {label}{('  ' + extra) if extra else ''}")
        if not cond:
            ok = False

    chk(not page_errors, "0 个未捕获异常", f"{page_errors[:2]}" if page_errors else "")
    chk(not console_errors, "0 条 console error", f"{console_errors[:2]}" if console_errors else "")
    chk(not failed_requests, "0 个失败请求", f"{failed_requests[:2]}" if failed_requests else "")
    chk(not empty_tabs, f"无空态页签（{len(empty_tabs)} 个）")
    if args.navs:
        chk(len(navs) == args.navs, f"一级导航 {args.navs} 个（实测 {len(navs)}）")
    if args.tabs:
        chk(total == args.tabs, f"二级页签 {args.tabs} 个（实测 {total}）")
    chk(overflow["doc"] <= overflow["win"], "390 宽不横向溢出", f"{overflow}")

    print()
    print("PASS —— 装机产物上所有页签可打开" if ok else "FAIL —— 见上面 ✗ 项")
    sys.exit(0 if ok else 1)


def _slug():
    """从本项目 package.json 推导 UI 前缀里的 slug（不写死任何一个癌种）。"""
    import json
    import pathlib

    here = pathlib.Path(__file__).resolve().parent.parent
    try:
        name = json.loads((here / "package.json").read_text(encoding="utf-8"))["name"]
    except Exception:
        return "workbench"
    return name.split("/")[-1]


if __name__ == "__main__":
    main()
