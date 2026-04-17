#!/usr/bin/env bash
set -euo pipefail

echo "==> NoteDesk macOS ARM build"
echo ""

# Check prerequisites
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js not found. Install it: brew install node"
  exit 1
fi

if ! command -v cargo &> /dev/null; then
  echo "ERROR: Rust not found. Install it: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
  exit 1
fi

echo "==> Installing npm dependencies..."
npm ci

echo "==> Building Tauri app for macOS ARM..."
npx tauri build --target aarch64-apple-darwin

echo ""
echo "==> Build complete!"
echo ""

DMG=$(find src-tauri/target/aarch64-apple-darwin/release/bundle/dmg -name '*.dmg' 2>/dev/null | head -1)
APP=$(find src-tauri/target/aarch64-apple-darwin/release/bundle/macos -name '*.app' 2>/dev/null | head -1)

if [ -n "$DMG" ]; then
  echo "  DMG: $DMG"
fi
if [ -n "$APP" ]; then
  echo "  App: $APP"
  echo ""
  echo "To install, either:"
  echo "  1. Open the .dmg and drag NoteDesk to Applications"
  echo "  2. Copy the .app directly:  cp -r \"$APP\" /Applications/"
fi
