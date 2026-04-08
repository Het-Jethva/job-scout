declare module "pdfkit" {
  interface PDFMargins {
    top: number
    bottom: number
    left: number
    right: number
  }

  interface PDFPage {
    width: number
    height: number
    margins: PDFMargins
  }

  interface PDFInfo {
    Title?: string
    Author?: string
    Subject?: string
  }

  interface PDFTextOptions {
    width?: number
    align?: "left" | "center" | "right" | "justify"
    lineGap?: number
    indent?: number
  }

  interface PDFDocumentInstance {
    page: PDFPage
    info: PDFInfo
    y: number
    font(name: string): this
    fontSize(size: number): this
    fillColor(color: string): this
    text(text: string, options?: PDFTextOptions): this
    moveTo(x: number, y: number): this
    lineTo(x: number, y: number): this
    lineWidth(width: number): this
    strokeColor(color: string): this
    stroke(): this
    moveDown(lines?: number): this
    pipe(stream: NodeJS.WritableStream): this
    end(): void
  }

  interface PDFDocumentConstructor {
    new (...args: unknown[]): PDFDocumentInstance
  }

  const PDFDocument: PDFDocumentConstructor
  export default PDFDocument
}
