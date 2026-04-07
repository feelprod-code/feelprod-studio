import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    // Create folder if doesn't exist
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // ignore
    }

    const savedFiles = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Clean filename
      const safeName = Date.now() + "_" + file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filepath = join(uploadDir, safeName);

      await writeFile(filepath, buffer);
      
      savedFiles.push({
        title: file.name,
        name: safeName,
        url: `/uploads/${safeName}`, // Public URL accessible by browser
        type: file.type
      });
    }

    console.log(`✅ [UPLOAD] ${savedFiles.length} fichiers sauvegardés en local.`);
    return NextResponse.json({ success: true, files: savedFiles });
  } catch (error: any) {
    console.error("❌ ERREUR API UPLOAD :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
