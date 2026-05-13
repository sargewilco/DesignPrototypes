from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:8000")

    # Wait for the page to load
    page.wait_for_selector(".palette-item")

    # Take an initial screenshot
    page.screenshot(path="initial.png")

    # Drag and drop a Router
    router = page.locator(".palette-item[data-type='router']")
    canvas = page.locator("#canvas-container")
    router.drag_to(canvas, target_position={"x": 100, "y": 100})

    # Drag and drop a Switch
    switch = page.locator(".palette-item[data-type='switch']")
    switch.drag_to(canvas, target_position={"x": 300, "y": 100})

    time.sleep(1)
    page.screenshot(path="after_drop.png")

    # To simulate shift+click, we can dispatch events
    page.keyboard.down("Shift")

    page.locator(".node").nth(0).click()
    time.sleep(0.5)
    page.locator(".node").nth(1).click()

    page.keyboard.up("Shift")

    time.sleep(1)
    page.screenshot(path="after_connect.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
