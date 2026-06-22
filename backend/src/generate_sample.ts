import fs from "fs/promises";
import path from "path";
import { pdfGenerator } from "./services/pdf-generator";

async function main() {
  await pdfGenerator.init();

  const getBase64Image = async (filename: string) => {
    try {
      const filePath = path.join(process.cwd(), "src/placeholders", filename);
      const data = await fs.readFile(filePath);
      return `data:image/png;base64,${data.toString("base64")}`;
    } catch (err) {
      console.warn(`Could not read image ${filename}: ${err}`);
      return "";
    }
  };

  const pdfData = {
    candidate_name: "Hari Krishna S",
    reference_no: `AMS/HR/INT/${new Date().getFullYear()}/101`,
    offer_date: "29 May 2026",
    internship_domain: "Artificial Intelligence(AI)",
    start_date: "01 June 2026",
    end_date: "30 June 2026",
    hr_name: "Sinega S",
    company_name: "Aptimark Solutions",
    company_tagline: "Smart Solutions . Better Tomorrrow",
    company_address: "No -8/2 , Venus Garden Street , Sundapalayam , Coimbatore.",
    company_email: "contact@aptimarksolutions.in",
    company_website: "www.aptimarksolutions.in",
    company_logo: await getBase64Image("Company_Logo.png"),
    signature_image: await getBase64Image("Hr_Sign.png"),
    watermark_logo: await getBase64Image("Watermark.png"),
    footer_logo: await getBase64Image("Fotter.png")
  };

  const pdfBuffer = await pdfGenerator.generateOfferLetter(pdfData);

  const outPath = path.join(process.cwd(), "..", "sample_pdf.pdf");
  await fs.writeFile(outPath, pdfBuffer);
  console.log(`Generated sample PDF at ${outPath}`);
}

main().catch(console.error);
