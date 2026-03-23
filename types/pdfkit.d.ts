declare module "pdfkit" {
  interface PDFDocumentMargins {
    top: number
    bottom: number
    left: number
    right: number
  }

  interface PDFDocumentOptions {
    size?: string
    margins?: Partial<PDFDocumentMargins>
    compress?: boolean
  }

  interface PDFTextOptions {
    width?: number
    align?: "left" | "center" | "right" | "justify"
    indent?: number
    lineGap?: number
  }

  interface PDFMetadata {
    Title?: string
    Author?: string
    Subject?: string
  }

  interface PDFPage {
    width: number
    margins: PDFDocumentMargins
  }

  export default class PDFDocument {
    constructor(options?: PDFDocumentOptions)

    info: PDFMetadata
    page: PDFPage
    y: number

    pipe<T extends NodeJS.WritableStream>(destination: T): T
    font(name: string): this
    fontSize(size: number): this
    fillColor(color: string): this
    text(text: string, options?: PDFTextOptions): this
    moveDown(lines?: number): this
    moveTo(x: number, y: number): this
    lineTo(x: number, y: number): this
    lineWidth(width: number): this
    strokeColor(color: string): this
    stroke(): this
    end(): void
  }
}
