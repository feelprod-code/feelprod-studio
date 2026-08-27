#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import sys
import datetime
import subprocess

def export_txt(text, duration_str=""):
    desktop = os.path.expanduser("~/Desktop/TRANSCRIPTIONS_FEELPROD")
    os.makedirs(desktop, exist_ok=True)
    now = datetime.datetime.now()
    timestamp = now.strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"Transcription_{timestamp}.txt"
    filepath = os.path.join(desktop, filename)
    
    header = (
        f"==================================================\n"
        f"FEELPROD VOICE — TRANSCRIPTION OFFICIELLE\n"
        f"Date : {now.strftime('%d/%m/%Y à %H:%M:%S')}\n"
        f"Durée : {duration_str or 'Non spécifiée'}\n"
        f"==================================================\n\n"
    )
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(header + text + "\n")
    
    print(filepath)
    return filepath

def export_pdf(text, duration_str=""):
    desktop = os.path.expanduser("~/Desktop/TRANSCRIPTIONS_FEELPROD")
    os.makedirs(desktop, exist_ok=True)
    now = datetime.datetime.now()
    timestamp = now.strftime("%Y-%m-%d_%H-%M-%S")
    pdf_filename = f"Transcription_{timestamp}.pdf"
    pdf_path = os.path.join(desktop, pdf_filename)
    
    html_path = f"/tmp/transcription_{timestamp}.html"
    
    # Format text with paragraphs
    paragraphs = text.strip().split("\n\n")
    body_html = "".join([f"<p style='margin-bottom: 14px; line-height: 1.7;'>{p.replace(chr(10), '<br/>')}</p>" for p in paragraphs])
    
    html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  @page {{
    size: A4;
    margin: 22mm 20mm;
    @bottom-right {{
      content: counter(page) " / " counter(pages);
      font-size: 9pt;
      color: #8C827A;
    }}
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #1C1917;
    background-color: #FAF7F2;
    padding: 20px;
    margin: 0;
  }}
  .header {{
    border-bottom: 2px solid #7EAEC8;
    padding-bottom: 16px;
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}
  .title {{
    font-size: 22px;
    font-weight: 800;
    color: #2C2825;
    letter-spacing: 0.05em;
    margin: 0;
  }}
  .subtitle {{
    font-size: 11px;
    font-weight: 600;
    color: #8C4E33;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    margin-top: 4px;
  }}
  .meta {{
    font-size: 11px;
    color: #57534E;
    text-align: right;
  }}
  .content {{
    font-size: 13px;
    color: #292524;
    text-align: left;
  }}
  .footer {{
    margin-top: 40px;
    padding-top: 12px;
    border-top: 1px solid #E7E5E4;
    font-size: 10px;
    color: #78716C;
    text-align: center;
  }}
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">FEELPROD VOICE</h1>
      <div class="subtitle">Transcription Haute Fidélité — Cabinet & Enseignement</div>
    </div>
    <div class="meta">
      <div><strong>Date :</strong> {now.strftime('%d/%m/%Y à %H:%M')}</div>
      <div><strong>Durée enregistrée :</strong> {duration_str or 'Enregistrement direct'}</div>
      <div><strong>Mots :</strong> {len(text.split())} mots</div>
    </div>
  </div>
  <div class="content">
    {body_html}
  </div>
  <div class="footer">
    FeelProd &bull; Ostéopathie Tissulaire TDT &bull; Document confidentiel édité le {now.strftime('%d/%m/%Y')}
  </div>
</body>
</html>
"""
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    # Convert HTML to PDF using cupsfilter / sips / wkhtmltopdf / headless chromium
    try:
        # Try headless chromium with playwright if available
        render_cmd = f"npx playwright pdf {html_path} {pdf_path} --format A4"
        res = subprocess.run(render_cmd, shell=True, capture_output=True)
        if res.returncode != 0 or not os.path.exists(pdf_path):
            # Fallback to cupsfilter or textutil
            subprocess.run(["cupsfilter", html_path], stdout=open(pdf_path, "wb"), stderr=subprocess.DEVNULL, check=False)
    except Exception:
        pass
        
    if not os.path.exists(pdf_path) or os.path.getsize(pdf_path) == 0:
        # Textutil fallback
        rtf_path = f"/tmp/transcription_{timestamp}.rtf"
        subprocess.run(["textutil", "-convert", "rtf", html_path, "-output", rtf_path], check=False)
        subprocess.run(["cupsfilter", rtf_path], stdout=open(pdf_path, "wb"), stderr=subprocess.DEVNULL, check=False)

    print(pdf_path)
    return pdf_path

if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(1)
    mode = sys.argv[1] # --txt or --pdf
    text_arg = sys.argv[2]
    dur = sys.argv[3] if len(sys.argv) > 3 else ""
    
    if mode == "--txt":
        export_txt(text_arg, dur)
    elif mode == "--pdf":
        export_pdf(text_arg, dur)
