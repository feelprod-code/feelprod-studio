import os
import subprocess
import shutil

icon_jpg = "/Users/guillaumephilippe/.gemini/antigravity/brain/1d49e8d7-553d-4b83-b3f4-d8f61cdb3385/feelprod_voice_icon_guillaume_1787844345730.jpg"
app_name = "FeelProd Voice.app"
target_sys = f"/Applications/{app_name}"
target_user = os.path.expanduser(f"~/Applications/{app_name}")
build_dir = "/tmp/feelprod_voice_build"

shutil.rmtree(build_dir, ignore_errors=True)
os.makedirs(f"{build_dir}/{app_name}/Contents/MacOS", exist_ok=True)
os.makedirs(f"{build_dir}/{app_name}/Contents/Resources", exist_ok=True)

# 1. Generate exact .iconset files
iconset_dir = "/tmp/feelprod_voice.iconset"
shutil.rmtree(iconset_dir, ignore_errors=True)
os.makedirs(iconset_dir, exist_ok=True)

icon_defs = [
    ("icon_16x16.png", 16),
    ("icon_16x16@2x.png", 32),
    ("icon_32x32.png", 32),
    ("icon_32x32@2x.png", 64),
    ("icon_128x128.png", 128),
    ("icon_128x128@2x.png", 256),
    ("icon_256x256.png", 256),
    ("icon_256x256@2x.png", 512),
    ("icon_512x512.png", 512),
    ("icon_512x512@2x.png", 1024),
]

for filename, size in icon_defs:
    subprocess.run([
        "sips", "-s", "format", "png",
        "-z", str(size), str(size),
        icon_jpg,
        "--out", f"{iconset_dir}/{filename}"
    ], capture_output=True, check=True)

icns_path = f"{build_dir}/{app_name}/Contents/Resources/AppIcon.icns"
subprocess.run(["iconutil", "-c", "icns", iconset_dir, "-o", icns_path], check=True)

# 2. Compile Swift binary
swift_src = "/Users/guillaumephilippe/.gemini/antigravity/brain/1d49e8d7-553d-4b83-b3f4-d8f61cdb3385/feelprod-voice-agent/FeelProdVoiceApp.swift"
swift_bin = f"{build_dir}/{app_name}/Contents/Resources/FeelProdVoiceDaemon"
subprocess.run([
    "swiftc",
    "-framework", "Cocoa",
    "-framework", "AVFoundation",
    "-framework", "Carbon",
    swift_src,
    "-o", swift_bin
], check=True)

# 3. Copy python engine
py_engine_src = "/Users/guillaumephilippe/.gemini/antigravity/brain/1d49e8d7-553d-4b83-b3f4-d8f61cdb3385/feelprod-voice-agent/transcribe_engine.py"
shutil.copy(py_engine_src, f"{build_dir}/{app_name}/Contents/Resources/transcribe_engine.py")

# 4. Create Launcher Script with robust PID check
launcher_script = f"""#!/bin/bash
DIR="$(cd "$(dirname "$0")/../Resources" && pwd)"

RUNNING_PID=$(pgrep -x "FeelProdVoiceDaemon" || true)

if [ -n "$RUNNING_PID" ]; then
    kill "$RUNNING_PID" 2>/dev/null || true
    afplay /System/Library/Sounds/Pop.aiff &
else
    afplay /System/Library/Sounds/Tink.aiff &
    nohup "$DIR/FeelProdVoiceDaemon" > /tmp/feelprod_voice.log 2>&1 &
fi
"""
launcher_path = f"{build_dir}/{app_name}/Contents/MacOS/FeelProdVoice"
with open(launcher_path, "w") as f:
    f.write(launcher_script)
os.chmod(launcher_path, 0o755)
os.chmod(swift_bin, 0o755)
os.chmod(f"{build_dir}/{app_name}/Contents/Resources/transcribe_engine.py", 0o755)

# 5. Create Info.plist with Microphone and AppleEvents permissions
info_plist = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>FeelProdVoice</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.feelprod.voice</string>
    <key>CFBundleName</key>
    <string>FeelProd Voice</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>2.0</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSMicrophoneUsageDescription</key>
    <string>FeelProd Voice utilise votre microphone pour dicter vos textes avec l'IA Gemini.</string>
    <key>NSSpeechRecognitionUsageDescription</key>
    <string>Utilisé pour la reconnaissance et le nettoyage vocal.</string>
    <key>NSAppleEventsUsageDescription</key>
    <string>Utilisé pour injecter automatiquement le texte nettoyé dans votre application active.</string>
</dict>
</plist>
"""
with open(f"{build_dir}/{app_name}/Contents/Info.plist", "w") as f:
    f.write(info_plist)

# 6. Install to /Applications and ~/Applications
for target in [target_sys, target_user]:
    shutil.rmtree(target, ignore_errors=True)
    shutil.copytree(f"{build_dir}/{app_name}", target)

print("BUILD_AND_INSTALL_SUCCESSFUL")
