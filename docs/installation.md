# Installation

FOSSPad provides pre-built binaries for macOS, Linux, and Windows. Grab the latest from the [Releases page](https://github.com/anthropics/note-desk/releases) or from CI artifacts on the [Actions tab](https://github.com/anthropics/note-desk/actions).

---

## macOS (Apple Silicon)

**Formats:** `.dmg`, `.app`

### Install from DMG

1. Download `FOSSPad_<version>_aarch64.dmg`.
2. Open the DMG and drag **FOSSPad** into your Applications folder.
3. Close the DMG.

### Remove Quarantine

The app is not signed with an Apple Developer certificate. macOS will block it on first launch. Run this once after installing:

```bash
xattr -d com.apple.quarantine /Applications/FOSSPad.app
```

Alternatively, right-click the app in Finder → Open, then click "Open" in the dialog that appears. You only need to do this once.

### Verify the App Works

Double-click FOSSPad in Applications. If you see a "damaged" error, the quarantine attribute was not removed — re-run the `xattr` command above.

---

## Linux

**Formats:** `.deb` (x64 and arm64), `.AppImage` (x64 and arm64)

### Debian / Ubuntu (.deb)

```bash
sudo dpkg -i FOSSPad_<version>_amd64.deb
# or for ARM64:
sudo dpkg -i FOSSPad_<version>_arm64.deb
```

If there are missing dependencies:

```bash
sudo apt-get install -f
```

### AppImage (any distro)

```bash
chmod +x FOSSPad_<version>_amd64.AppImage
./FOSSPad_<version>_amd64.AppImage
```

The AppImage is fully portable — no installation needed. You can move it anywhere.

### System Dependencies

If building from source or if the app fails to launch, ensure you have the WebKitGTK runtime:

| Distro | Package |
| --- | --- |
| Fedora | `webkit2gtk4.1` |
| Ubuntu / Debian | `libwebkit2gtk-4.1-0` |
| Arch | `webkit2gtk-4.1` |

---

## Windows

**Formats:** `.exe` (NSIS installer), `.msi`

### NSIS Installer

1. Download `FOSSPad_<version>_x64-setup.exe`.
2. Run the installer. It installs to `C:\Program Files\FOSSPad\` by default.
3. Launch FOSSPad from the Start Menu.

### MSI Installer

1. Download `FOSSPad_<version>_x64_en-US.msi`.
2. Double-click to install.

### Requirements

- **Windows 10** or later.
- **WebView2** runtime (pre-installed on most Windows 10+ systems). If not present, the installer will prompt you to download it from [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

---

## Verifying Downloads

All release assets are built by GitHub Actions from the public source. You can compare file hashes against the CI logs if you want to verify integrity.

## Updating

FOSSPad does not auto-update. To update, download the new version from the Releases page and replace the existing installation. Your workspace data is stored separately and will not be affected.

## Uninstalling

- **macOS**: Drag FOSSPad from Applications to Trash.
- **Linux (deb):** `sudo dpkg -r fosspad`
- **Linux (AppImage):** Delete the AppImage file.
- **Windows:** Use "Add or Remove Programs" in Settings.

Your workspace folder and notes are independent of the application and will remain on disk.
