import fs from "fs/promises";
import path from "path";

export async function deleteSupabaseFile(fileUrl: string | null): Promise<void> {
  if (!fileUrl) return;

  // Handle local files
  if (fileUrl.startsWith("/api/public/pdfs/") || !fileUrl.includes("supabase.co")) {
    try {
      const filename = fileUrl.split("/").pop();
      if (filename) {
        const filePath = path.join(process.cwd(), "public/pdfs", filename);
        await fs.unlink(filePath);
      }
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        console.warn(`Error deleting local file: ${err}`);
      }
    }
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return;

  // fileUrl format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[filename]
  const filename = fileUrl.split("/").pop();
  if (!filename) return;

  // Bucket name used by upload routes.
  try {
    const deleteRes = await fetch(`${supabaseUrl}/storage/v1/object/pdfs/${filename}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
      },
    });

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      // If the file was already deleted or is not found, handle it gracefully.
      if (deleteRes.status === 404 || deleteRes.status === 400 || errText.includes("not_found") || errText.includes("Object not found")) {
        console.info(`File ${filename} already removed or not found on Supabase storage.`);
      } else {
        console.warn(`Supabase deletion failed for ${filename}: ${deleteRes.status} ${errText}`);
      }
    }
  } catch (err) {
    console.warn(`Error deleting file from Supabase: ${err}`);
  }
}
