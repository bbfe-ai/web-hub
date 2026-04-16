from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    errors = []
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}"))

    page.goto("http://localhost:3000")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    cards = page.locator(".project-card")
    print(f"1. Initial cards: {cards.count()}")

    if cards.count() > 0:
        # Click to open
        cards.nth(0).click()
        page.wait_for_timeout(2000)

        # Wait for auto screenshot (server triggers on /open)
        page.wait_for_timeout(12000)

        # Click manual screenshot
        btn = page.locator("#screenCapBtn")
        btn_text = btn.text_content().strip()
        print(f"2. Button: '{btn_text}', disabled={btn.is_disabled()}")

        if not btn.is_disabled():
            btn.click()
            page.wait_for_timeout(15000)
            toasts = page.locator(".toast")
            print(f"3. Toasts after manual: {toasts.count()}")

        # Close iframe
        close_btn = page.locator('button:has-text("关闭")')
        close_btn.click()
        page.wait_for_timeout(3000)

        # Check final state
        cards2 = page.locator(".project-card")
        print(f"4. Final cards: {cards2.count()}")
        if cards2.count() > 0:
            preview = cards2.nth(0).locator(".card-preview")
            imgs = preview.locator("img")
            placeholder = preview.locator(".card-preview-placeholder")
            grid = preview.locator(".card-preview-grid")
            single = preview.locator(".card-preview-img")
            print(f"   Images: {imgs.count()}")
            print(f"   Placeholder visible: {placeholder.is_visible()}")
            print(
                f"   Grid visible: {grid.is_visible() if grid.count() > 0 else 'N/A'}"
            )
            print(
                f"   Single img visible: {single.is_visible() if single.count() > 0 else 'N/A'}"
            )
            for i in range(imgs.count()):
                src = imgs.nth(i).get_attribute("src")
                nw = imgs.nth(i).evaluate("el => el.naturalWidth")
                nh = imgs.nth(i).evaluate("el => el.naturalHeight")
                box = imgs.nth(i).bounding_box()
                print(
                    f"   img[{i}]: src={src}, naturalSize={nw}x{nh}, visible={box is not None}"
                )

    # Print server log errors
    fetch_errors = [e for e in errors if "error" in e.lower()]
    if fetch_errors:
        print("\n=== Fetch Errors ===")
        for e in fetch_errors[:5]:
            print(e)

    browser.close()
