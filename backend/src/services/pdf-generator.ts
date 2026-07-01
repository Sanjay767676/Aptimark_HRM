import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PdfGeneratorService {
  private templateHtml: string | null = null;
  private templateCss: string | null = null;
  private compiledTemplate: HandlebarsTemplateDelegate | null = null;
  private certificateTemplateHtml: string | null = null;
  private compiledCertificateTemplate: HandlebarsTemplateDelegate | null = null;

  async init() {
    if (this.compiledTemplate && this.compiledCertificateTemplate) return;

    try {
      const templatePath = path.join(process.cwd(), 'src/templates/offer-letter.html');
      const cssPath = path.join(process.cwd(), 'src/styles/offer-letter.css');
      const certTemplatePath = path.join(process.cwd(), 'src/templates/certificate.html');

      this.templateHtml = await fs.readFile(templatePath, 'utf8');
      this.templateCss = await fs.readFile(cssPath, 'utf8');
      this.compiledTemplate = handlebars.compile(this.templateHtml);

      this.certificateTemplateHtml = await fs.readFile(certTemplatePath, 'utf8');
      this.compiledCertificateTemplate = handlebars.compile(this.certificateTemplateHtml);
    } catch (error) {
      console.error('Failed to load PDF templates:', error);
      throw new Error('Template initialization failed');
    }
  }

  async generateOfferLetter(data: Record<string, any>): Promise<Buffer> {
    await this.init();

    if (!this.compiledTemplate) {
      throw new Error('Template not initialized');
    }

    // Merge CSS into the data so it can be injected into the template
    const templateData = {
      ...data,
      css: this.templateCss
    };

    const htmlContent = this.compiledTemplate(templateData).replace('/* CSS_PLACEHOLDER */', this.templateCss || '');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
      await page.evaluate(async () => {
        const doc = (globalThis as { document?: { fonts?: { ready?: Promise<void> } } }).document;
        if (doc?.fonts?.ready) {
          await doc.fonts.ready;
        }
      });

      // Ensure A4 format with no margins to match exact design
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0'
        }
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  async generateCertificate(data: Record<string, any>): Promise<Buffer> {
    await this.init();

    if (!this.compiledCertificateTemplate) {
      throw new Error('Certificate template not initialized');
    }

    const templateData = {
      ...data,
      css: this.templateCss
    };

    const htmlContent = this.compiledCertificateTemplate(templateData).replace('/* CSS_PLACEHOLDER */', this.templateCss || '');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
      await page.evaluate(async () => {
        const doc = (globalThis as { document?: { fonts?: { ready?: Promise<void> } } }).document;
        if (doc?.fonts?.ready) {
          await doc.fonts.ready;
        }
      });

      // Ensure A4 landscape format
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0'
        }
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}

export const pdfGenerator = new PdfGeneratorService();
