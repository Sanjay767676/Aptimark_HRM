export async function deleteSupabaseFile(fileUrl: string | null): Promise<void> {
  if (!fileUrl) return;
  if (!fileUrl.includes("supabase.co")) return;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return;

  // fileUrl format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[filename]
  const filename = fileUrl.split("/").pop();
  if (!filename) return;

  // We hardcode the bucket name to 'pdsf' based on user configuration
  try {
    const deleteRes = await fetch(`${supabaseUrl}/storage/v1/object/pdsf/${filename}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
      },
    });

    if (!deleteRes.ok) {
      console.warn(`Supabase deletion failed for ${filename}: ${deleteRes.status} ${await deleteRes.text()}`);
    }
  } catch (err) {
    console.warn(`Error deleting file from Supabase: ${err}`);
  }
}
