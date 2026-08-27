import Cocoa
import AVFoundation
import Carbon

class CustomFloatingPanel: NSPanel {
    override var canBecomeKey: Bool { return true }
    override var canBecomeMain: Bool { return true }
}

class VisualizerWindowController: NSWindowController {
    var textView: NSTextView!
    var statsLabel: NSTextField!
    var currentDuration: String = "00:00"

    convenience init() {
        let win = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 680, height: 520),
                           styleMask: [.titled, .closable, .miniaturizable, .resizable],
                           backing: .buffered, defer: false)
        win.title = "FeelProd Voice — Visualiseur & Exportation"
        win.backgroundColor = NSColor(red: 0.98, green: 0.97, blue: 0.95, alpha: 1.0)
        win.isReleasedWhenClosed = false
        win.center()
        self.init(window: win)
        setupUI()
    }

    func setupUI() {
        guard let win = window, let contentView = win.contentView else { return }
        
        let headerView = NSView(frame: NSRect(x: 0, y: 450, width: 680, height: 70))
        headerView.autoresizingMask = [.width, .minYMargin]
        
        let title = NSTextField(labelWithString: "FEELPROD VOICE")
        title.font = NSFont.systemFont(ofSize: 18, weight: .heavy)
        title.textColor = NSColor(red: 0.16, green: 0.14, blue: 0.13, alpha: 1.0)
        title.frame = NSRect(x: 20, y: 36, width: 300, height: 24)
        headerView.addSubview(title)

        statsLabel = NSTextField(labelWithString: "Durée : 00:00 • 0 mots")
        statsLabel.font = NSFont.systemFont(ofSize: 12, weight: .medium)
        statsLabel.textColor = NSColor(red: 0.55, green: 0.31, blue: 0.20, alpha: 1.0)
        statsLabel.frame = NSRect(x: 20, y: 12, width: 640, height: 20)
        headerView.addSubview(statsLabel)
        contentView.addSubview(headerView)

        let scrollView = NSScrollView(frame: NSRect(x: 20, y: 65, width: 640, height: 380))
        scrollView.autoresizingMask = [.width, .height]
        scrollView.hasVerticalScroller = true
        scrollView.borderType = .bezelBorder

        textView = NSTextView(frame: scrollView.contentView.bounds)
        textView.autoresizingMask = [.width]
        textView.font = NSFont.systemFont(ofSize: 14.5, weight: .regular)
        textView.textColor = NSColor(red: 0.12, green: 0.11, blue: 0.10, alpha: 1.0)
        textView.backgroundColor = .white
        textView.isEditable = true
        textView.textContainerInset = NSSize(width: 14, height: 14)
        scrollView.documentView = textView
        contentView.addSubview(scrollView)

        let bottomBar = NSView(frame: NSRect(x: 20, y: 12, width: 640, height: 42))
        bottomBar.autoresizingMask = [.width, .maxYMargin]

        let pdfBtn = NSButton(title: "📄 Exporter en PDF", target: self, action: #selector(exportPDF))
        pdfBtn.bezelStyle = .rounded
        pdfBtn.frame = NSRect(x: 0, y: 6, width: 145, height: 30)
        bottomBar.addSubview(pdfBtn)

        let txtBtn = NSButton(title: "📝 Exporter en TXT", target: self, action: #selector(exportTXT))
        txtBtn.bezelStyle = .rounded
        txtBtn.frame = NSRect(x: 155, y: 6, width: 145, height: 30)
        bottomBar.addSubview(txtBtn)

        let copyBtn = NSButton(title: "📋 Copier Tout", target: self, action: #selector(copyAll))
        copyBtn.bezelStyle = .rounded
        copyBtn.frame = NSRect(x: 310, y: 6, width: 125, height: 30)
        bottomBar.addSubview(copyBtn)

        let pasteBtn = NSButton(title: "🚀 Injecter dans Antigravity", target: self, action: #selector(injectAntigravity))
        pasteBtn.bezelStyle = .rounded
        pasteBtn.frame = NSRect(x: 445, y: 6, width: 195, height: 30)
        bottomBar.addSubview(pasteBtn)

        contentView.addSubview(bottomBar)
    }

    func showWithText(_ text: String, duration: String) {
        currentDuration = duration
        textView.string = text
        let wordCount = text.split { $0.isWhitespace || $0.isNewline }.count
        statsLabel.stringValue = "⏱️ Durée : \(duration)   •   📊 Total : \(wordCount) mots   •   Dossier : Bureau/TRANSCRIPTIONS_FEELPROD"
        showWindow(nil)
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc func exportPDF() { runExporter(mode: "--pdf") }
    @objc func exportTXT() { runExporter(mode: "--txt") }
    @objc func copyAll() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(textView.string, forType: .string)
        NSSound(named: "Glass")?.play()
    }
    @objc func injectAntigravity() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(textView.string, forType: .string)
        let script = "tell application \"Antigravity\" to activate\ndelay 0.25\ntell application \"System Events\" to keystroke \"v\" using command down"
        let p = Process(); p.executableURL = URL(fileURLWithPath: "/usr/bin/osascript"); p.arguments = ["-e", script]; try? p.run()
    }
    func runExporter(mode: String) {
        var script = "/Applications/FeelProd Voice.app/Contents/Resources/exporter.py"
        if !FileManager.default.fileExists(atPath: script) {
            if let res = Bundle.main.resourceURL?.appendingPathComponent("exporter.py").path, FileManager.default.fileExists(atPath: res) {
                script = res
            }
        }
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
        p.arguments = [script, mode, textView.string, currentDuration]
        let pipe = Pipe(); p.standardOutput = pipe; try? p.run(); p.waitUntilExit()
        let path = String(data: pipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !path.isEmpty && FileManager.default.fileExists(atPath: path) {
            NSWorkspace.shared.selectFile(path, inFileViewerRootedAtPath: "")
            NSSound(named: "Glass")?.play()
        }
    }
}

class PillView: NSView {
    var isRecording = false
    var isTranscribing = false
    var timer: Timer?
    var seconds = 0

    let avatarImageView = NSImageView()
    let titleLabel = NSTextField(labelWithString: "FEELPROD VOICE")
    let targetPopup = NSPopUpButton()
    let closeButton = NSButton()
    var onToggle: (() -> Void)?
    var onClose: (() -> Void)?
    var onTargetChange: ((String) -> Void)?
    var dragStart: NSPoint = .zero
    var didDrag = false

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        setupUI(width: frameRect.width, height: frameRect.height)
    }
    required init?(coder: NSCoder) { fatalError() }

    func setupUI(width: CGFloat, height: CGFloat) {
        let avatarSize: CGFloat = 58
        avatarImageView.frame = NSRect(x: 10, y: (height - avatarSize) / 2, width: avatarSize, height: avatarSize)
        avatarImageView.imageScaling = .scaleProportionallyUpOrDown
        avatarImageView.wantsLayer = true
        avatarImageView.layer?.cornerRadius = avatarSize / 2
        avatarImageView.layer?.masksToBounds = true
        avatarImageView.layer?.borderWidth = 1.8
        avatarImageView.layer?.borderColor = NSColor(red: 0.29, green: 0.49, blue: 0.61, alpha: 0.70).cgColor
        
        var avatarLoaded = false
        if let resURL = Bundle.main.resourceURL?.appendingPathComponent("avatar.png"), let img = NSImage(contentsOf: resURL) {
            avatarImageView.image = img
            avatarLoaded = true
        }
        if !avatarLoaded {
            let p1 = "/Applications/FeelProd Voice.app/Contents/Resources/avatar.png"
            let p2 = "/Users/guillaumephilippe/.gemini/antigravity/brain/1d49e8d7-553d-4b83-b3f4-d8f61cdb3385/scratch/avatar_guillaume_nogreen.png"
            if let img = NSImage(contentsOfFile: p1) ?? NSImage(contentsOfFile: p2) {
                avatarImageView.image = img
            }
        }
        addSubview(avatarImageView)

        titleLabel.stringValue = "FEELPROD VOICE"
        titleLabel.font = NSFont.systemFont(ofSize: 13.5, weight: .heavy)
        titleLabel.textColor = NSColor(red: 0.16, green: 0.14, blue: 0.13, alpha: 1.0)
        titleLabel.alignment = .left
        titleLabel.frame = NSRect(x: 76, y: 40, width: width - 110, height: 24)
        titleLabel.isEditable = false
        titleLabel.drawsBackground = false
        addSubview(titleLabel)

        closeButton.title = "✕"
        closeButton.font = NSFont.systemFont(ofSize: 11, weight: .bold)
        closeButton.isBordered = false
        closeButton.bezelStyle = .circular
        closeButton.contentTintColor = NSColor(red: 0.55, green: 0.50, blue: 0.48, alpha: 0.85)
        closeButton.frame = NSRect(x: width - 26, y: height - 26, width: 18, height: 18)
        closeButton.target = self
        closeButton.action = #selector(closeClicked)
        addSubview(closeButton)

        targetPopup.frame = NSRect(x: 74, y: 10, width: width - 96, height: 24)
        targetPopup.font = NSFont.systemFont(ofSize: 11, weight: .bold)
        targetPopup.isBordered = false
        targetPopup.pullsDown = false
        targetPopup.wantsLayer = true
        targetPopup.layer?.backgroundColor = NSColor(red: 0.92, green: 0.88, blue: 0.82, alpha: 0.95).cgColor
        targetPopup.layer?.cornerRadius = 9
        targetPopup.layer?.borderWidth = 1.0
        targetPopup.layer?.borderColor = NSColor(red: 0.29, green: 0.49, blue: 0.61, alpha: 0.40).cgColor
        
        let m = NSMenu()
        m.addItem(withTitle: "🎯 Détection Auto (Focus)", action: nil, keyEquivalent: "")
        m.addItem(withTitle: "👁️ Visualiser & Exporter (Fenêtre)", action: nil, keyEquivalent: "")
        m.addItem(withTitle: "🚀 Antigravity", action: nil, keyEquivalent: "")
        m.addItem(withTitle: "🌐 Google Chrome (Doctolib)", action: nil, keyEquivalent: "")
        m.addItem(withTitle: "🧭 Safari", action: nil, keyEquivalent: "")
        m.addItem(withTitle: "📝 Notes / Texte", action: nil, keyEquivalent: "")
        m.addItem(withTitle: "📋 Presse-papier (Copier)", action: nil, keyEquivalent: "")
        targetPopup.menu = m
        targetPopup.target = self
        targetPopup.action = #selector(targetChanged)
        addSubview(targetPopup)
    }

    @objc func targetChanged() {
        guard let title = targetPopup.selectedItem?.title else { return }
        onTargetChange?(title)
    }
    @objc func closeClicked() { onClose?() }

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)
        let path = NSBezierPath(roundedRect: bounds.insetBy(dx: 2, dy: 2), xRadius: 26, yRadius: 26)
        if isTranscribing {
            NSColor(red: 0.95, green: 0.92, blue: 0.98, alpha: 0.98).setFill()
            path.fill()
            NSColor(red: 0.55, green: 0.35, blue: 0.85, alpha: 1.0).setStroke()
            path.lineWidth = 2.5
            path.stroke()
        } else if isRecording {
            NSColor(red: 0.99, green: 0.92, blue: 0.92, alpha: 0.98).setFill()
            path.fill()
            NSColor(red: 0.88, green: 0.25, blue: 0.25, alpha: 1.0).setStroke()
            path.lineWidth = 2.5
            path.stroke()
        } else {
            NSColor(red: 0.98, green: 0.97, blue: 0.95, alpha: 0.97).setFill()
            path.fill()
            NSColor(red: 0.29, green: 0.49, blue: 0.61, alpha: 0.90).setStroke()
            path.lineWidth = 2.2
            path.stroke()
        }
    }

    override func mouseDown(with event: NSEvent) {
        let loc = convert(event.locationInWindow, from: nil)
        if targetPopup.frame.contains(loc) || closeButton.frame.contains(loc) { super.mouseDown(with: event); return }
        dragStart = event.locationInWindow; didDrag = false
    }
    override func mouseDragged(with event: NSEvent) {
        let loc = event.locationInWindow
        let dx = loc.x - dragStart.x; let dy = loc.y - dragStart.y
        if abs(dx) > 2 || abs(dy) > 2 {
            didDrag = true
            if let w = window { var o = w.frame.origin; o.x += dx; o.y += dy; w.setFrameOrigin(o) }
        }
    }
    override func mouseUp(with event: NSEvent) {
        let loc = convert(event.locationInWindow, from: nil)
        if targetPopup.frame.contains(loc) || closeButton.frame.contains(loc) { super.mouseUp(with: event); return }
        if !didDrag { onToggle?() }
        didDrag = false
    }

    func setState(rec: Bool, trans: Bool) {
        isRecording = rec
        isTranscribing = trans
        if trans {
            timer?.invalidate()
            titleLabel.stringValue = "✨ Gemini transcrit..."
            titleLabel.textColor = NSColor(red: 0.40, green: 0.20, blue: 0.70, alpha: 1.0)
            avatarImageView.layer?.borderColor = NSColor(red: 0.55, green: 0.35, blue: 0.85, alpha: 1.0).cgColor
        } else if rec {
            seconds = 0
            titleLabel.stringValue = "🔴 00:00 • En écoute"
            titleLabel.textColor = NSColor(red: 0.85, green: 0.15, blue: 0.15, alpha: 1.0)
            avatarImageView.layer?.borderColor = NSColor(red: 0.88, green: 0.25, blue: 0.25, alpha: 1.0).cgColor
            timer?.invalidate()
            timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
                guard let self = self else { return }
                self.seconds += 1
                let h = self.seconds / 3600; let m = (self.seconds % 3600) / 60; let s = self.seconds % 60
                self.titleLabel.stringValue = h > 0 ? String(format: "🔴 %02d:%02d:%02d • En écoute", h, m, s) : String(format: "🔴 %02d:%02d • En écoute", m, s)
            }
        } else {
            timer?.invalidate()
            titleLabel.stringValue = "FEELPROD VOICE"
            titleLabel.textColor = NSColor(red: 0.16, green: 0.14, blue: 0.13, alpha: 1.0)
            avatarImageView.layer?.borderColor = NSColor(red: 0.29, green: 0.49, blue: 0.61, alpha: 0.70).cgColor
        }
        needsDisplay = true
    }
}

class AppDelegate: NSObject, NSApplicationDelegate, AVAudioRecorderDelegate {
    var panel: CustomFloatingPanel!
    var pillView: PillView!
    var visualizer: VisualizerWindowController!
    var recorder: AVAudioRecorder?
    var isRec = false
    var isTrans = false
    let audioURL = URL(fileURLWithPath: "/tmp/feelprod_voice_clip.m4a")
    var lastTargetAppName = "Google Chrome"
    var selectedTargetApp = "Auto"
    var lastTranscribedText = ""
    var lastRecordedDurationString = "00:00"

    func applicationDidFinishLaunching(_ notification: Notification) {
        AVCaptureDevice.requestAccess(for: .audio) { _ in }
        visualizer = VisualizerWindowController()

        let width: CGFloat = 330
        let height: CGFloat = 76
        let screenFrame = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1400, height: 900)
        let x = screenFrame.midX - (width / 2)
        let y = screenFrame.maxY - height - 30

        panel = CustomFloatingPanel(contentRect: NSRect(x: x, y: y, width: width, height: height),
                                    styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        panel.isFloatingPanel = true
        panel.level = .statusBar
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.hidesOnDeactivate = false
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.hasShadow = true

        pillView = PillView(frame: NSRect(x: 0, y: 0, width: width, height: height))
        pillView.onToggle = { [weak self] in self?.toggle() }
        pillView.onClose = { [weak self] in self?.quitApp() }
        pillView.onTargetChange = { [weak self] title in
            if title.contains("Visualiser") {
                self?.selectedTargetApp = "Visualizer"
                if let self = self, !self.lastTranscribedText.isEmpty {
                    self.visualizer.showWithText(self.lastTranscribedText, duration: self.lastRecordedDurationString)
                }
            } else if title.contains("Antigravity") { self?.selectedTargetApp = "Antigravity" }
            else if title.contains("Chrome") { self?.selectedTargetApp = "Google Chrome" }
            else if title.contains("Safari") { self?.selectedTargetApp = "Safari" }
            else if title.contains("Notes") { self?.selectedTargetApp = "Notes" }
            else if title.contains("Presse-papier") { self?.selectedTargetApp = "Clipboard" }
            else { self?.selectedTargetApp = "Auto" }
        }

        panel.contentView = pillView
        panel.orderFrontRegardless()
        setupHotKey()
    }

    func quitApp() {
        NSSound(named: "Pop")?.play()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { NSApplication.shared.terminate(self) }
    }

    func toggle() {
        if isTrans { return }
        if isRec { stopAndTranscribe() } else { startRec() }
    }

    func startRec() {
        if let frontApp = NSWorkspace.shared.frontmostApplication, let name = frontApp.localizedName, !name.contains("FeelProd") {
            lastTargetAppName = name
        }
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
            AVEncoderBitRateKey: 128000
        ]
        do {
            try? FileManager.default.removeItem(at: audioURL)
            recorder = try AVAudioRecorder(url: audioURL, settings: settings)
            recorder?.delegate = self
            recorder?.prepareToRecord()
            if recorder?.record() == true {
                isRec = true
                pillView.setState(rec: true, trans: false)
                NSSound(named: "Tink")?.play()
            }
        } catch { print("Mic error: \(error)") }
    }

    func stopAndTranscribe() {
        let totalSec = pillView.seconds
        let h = totalSec / 3600; let m = (totalSec % 3600) / 60; let s = totalSec % 60
        lastRecordedDurationString = h > 0 ? String(format: "%02d:%02d:%02d", h, m, s) : String(format: "%02d:%02d", m, s)

        recorder?.stop()
        isRec = false
        isTrans = true
        pillView.setState(rec: false, trans: true)
        NSSound(named: "Pop")?.play()

        let target = self.selectedTargetApp
        let autoApp = self.lastTargetAppName
        let durStr = self.lastRecordedDurationString

        DispatchQueue.global(qos: .userInitiated).asyncAfter(deadline: .now() + 0.15) { [weak self] in
            guard let self = self else { return }
            
            var scriptPath = "/Applications/FeelProd Voice.app/Contents/Resources/transcribe_engine.py"
            if !FileManager.default.fileExists(atPath: scriptPath) {
                if let res = Bundle.main.resourceURL?.appendingPathComponent("transcribe_engine.py").path, FileManager.default.fileExists(atPath: res) {
                    scriptPath = res
                }
            }

            let proc = Process()
            proc.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
            if !FileManager.default.fileExists(atPath: "/usr/bin/python3") {
                proc.executableURL = URL(fileURLWithPath: "/usr/local/bin/python3")
            }
            proc.arguments = [scriptPath, self.audioURL.path, "--no-paste"]
            let pipe = Pipe()
            proc.standardOutput = pipe
            try? proc.run()
            proc.waitUntilExit()

            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            let outputText = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

            if !outputText.isEmpty {
                self.lastTranscribedText = outputText
                DispatchQueue.main.async {
                    NSPasteboard.general.clearContents()
                    NSPasteboard.general.setString(outputText, forType: .string)

                    if target == "Visualizer" {
                        self.visualizer.showWithText(outputText, duration: durStr)
                    } else if target == "Clipboard" {
                        NSSound(named: "Glass")?.play()
                    } else {
                        let appToActivate = target == "Auto" ? autoApp : target
                        let scriptText = """
                        tell application "\(appToActivate)" to activate
                        delay 0.25
                        tell application "System Events" to keystroke "v" using command down
                        """
                        let pasteProc = Process()
                        pasteProc.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
                        pasteProc.arguments = ["-e", scriptText]
                        try? pasteProc.run()
                    }
                }
            } else { NSSound(named: "Basso")?.play() }

            DispatchQueue.main.async {
                self.isTrans = false
                self.pillView.setState(rec: false, trans: false)
            }
        }
    }

    func setupHotKey() {
        let hotKeyID = EventHotKeyID(signature: OSType(0x46505631), id: 1)
        var eventType = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: OSType(kEventHotKeyPressed))
        var hotKeyRef: EventHotKeyRef?
        InstallEventHandler(GetApplicationEventTarget(), { (h, e, u) -> OSStatus in
            let del = Unmanaged<AppDelegate>.fromOpaque(u!).takeUnretainedValue()
            del.toggle()
            return noErr
        }, 1, &eventType, UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque()), nil)
        RegisterEventHotKey(UInt32(49), UInt32(controlKey | optionKey), hotKeyID, GetApplicationEventTarget(), 0, &hotKeyRef)
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
