import { supabase } from '@/lib/supabaseClient'
import type { Document, DocumentType, ProductType } from '@/types'

class DocumentService {
  /**
   * Get all documents
   */
  async getAllDocuments(): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return data || []
    } catch (error) {
      console.error('Failed to load documents:', error)
      throw error
    }
  }

  /**
   * Get documents by product type
   */
  async getDocumentsByProductType(productType: ProductType): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('product_type', productType)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return data || []
    } catch (error) {
      console.error('Failed to load documents:', error)
      throw error
    }
  }

  /**
   * Get a single document by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      return data || null
    } catch (error) {
      console.error('Failed to get document:', error)
      throw error
    }
  }

  /**
   * Validate PDF file
   */
  private async validatePDF(file: File): Promise<{ valid: boolean; error?: string }> {
    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'File must be a PDF document' }
    }

    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'File size exceeds 50MB limit' }
    }

    if (file.size < 1024) {
      return { valid: false, error: 'File is too small to be a valid PDF' }
    }

    try {
      const arrayBuffer = await file.slice(0, 5).arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const signature = String.fromCharCode(...bytes)

      if (!signature.startsWith('%PDF')) {
        return { valid: false, error: 'File does not appear to be a valid PDF' }
      }

      return { valid: true }
    } catch (error) {
      return { valid: false, error: 'Failed to read file' }
    }
  }

  /**
   * Upload a new document
   */
  async uploadDocument(
    file: File,
    productType: ProductType,
    onProgress?: (progress: number) => void
  ): Promise<Document> {
    try {
      // Validate file
      const validation = await this.validatePDF(file)
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid PDF file')
      }

      // Upload file to Supabase Storage
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      if (onProgress) onProgress(50)

      // Get public URL for the file
      const { data: publicUrlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      const fileUrl = publicUrlData?.publicUrl || ''

      // Detect document type
      const type = this.detectDocumentType(file.name)

      // Create document metadata
      const document: Omit<Document, 'id' | 'fileData'> = {
        name: this.extractDocumentName(file.name, type),
        description: `${type} Document`,
        filename: file.name,
        url: fileUrl,
        size: file.size,
        type,
        required: false,
        products:
          productType === 'structural-floor'
            ? ['3/4-in (20mm)']
            : ['1/2-in (13mm)', '5/8-in (16mm)'],
        product_type: productType,
      }

      // Insert document metadata into database
      const { data: insertedDoc, error: insertError } = await supabase
        .from('documents')
        .insert([document])
        .select()
        .single()

      if (insertError) {
        // Delete uploaded file if metadata insert fails
        await supabase.storage.from('documents').remove([fileName])
        throw new Error(insertError.message)
      }

      if (onProgress) onProgress(100)

      return insertedDoc as Document
    } catch (error) {
      console.error('Failed to upload document:', error)
      throw error
    }
  }

  /**
   * Update document metadata
   */
  async updateDocument(id: string, updates: Partial<Document>): Promise<void> {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Failed to update document:', error)
      throw error
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      // Get document to find file URL
      const doc = await this.getDocument(id)
      if (!doc) {
        throw new Error('Document not found')
      }

      // Delete from database
      const { error: dbError } = await supabase.from('documents').delete().eq('id', id)

      if (dbError) {
        throw new Error(dbError.message)
      }

      // Delete file from storage if URL exists
      if (doc.url) {
        try {
          const fileName = doc.url.split('/').pop()
          if (fileName) {
            await supabase.storage.from('documents').remove([fileName])
          }
        } catch (storageError) {
          console.error('Failed to delete file from storage:', storageError)
        }
      }
    } catch (error) {
      console.error('Failed to delete document:', error)
      throw error
    }
  }

  /**
   * Detect document type from filename
   */
  private detectDocumentType(filename: string): DocumentType {
    const lower = filename.toLowerCase()

    if (lower.includes('tds') || lower.includes('technical data')) return 'TDS'
    if (lower.includes('esr') || lower.includes('evaluation report')) return 'ESR'
    if (lower.includes('msds') || lower.includes('safety data')) return 'MSDS'
    if (lower.includes('leed')) return 'LEED'
    if (lower.includes('installation') || lower.includes('install')) return 'Installation'
    if (lower.includes('warranty')) return 'Warranty'
    if (lower.includes('acoustic') || lower.includes('esl')) return 'Acoustic'
    if (lower.includes('spec') || lower.includes('3-part')) return 'PartSpec'

    return 'TDS'
  }

  /**
   * Extract a clean document name from filename
   */
  private extractDocumentName(filename: string, type: DocumentType): string {
    let name = filename.replace(/\.pdf$/i, '')

    const typeMap: Record<DocumentType, string> = {
      TDS: 'Technical Data Sheet',
      ESR: 'Evaluation Report',
      MSDS: 'Material Safety Data Sheet',
      LEED: 'LEED Credit Guide',
      Installation: 'Installation Guide',
      Warranty: 'Limited Warranty',
      Acoustic: 'Acoustical Performance',
      PartSpec: '3-Part Specifications',
    }

    return typeMap[type] || name
  }

  /**
   * Get all documents with file data for worker
   */
  async getAllDocumentsWithData(): Promise<Array<Document & { fileData: string }>> {
    try {
      const documents = await this.getAllDocuments()
      const results = []

      for (const doc of documents) {
        try {
          if (doc.url) {
            // Fetch file content from URL
            const response = await fetch(doc.url)
            if (response.ok) {
              const blob = await response.blob()
              const reader = new FileReader()
              await new Promise((resolve, reject) => {
                reader.onloadend = () => {
                  const base64 = reader.result as string
                  const fileData = base64.split(',')[1]
                  results.push({ ...doc, fileData })
                  resolve(true)
                }
                reader.onerror = reject
                reader.readAsDataURL(blob)
              })
            }
          }
        } catch (error) {
          console.error(`Failed to get file data for document ${doc.id}:`, error)
        }
      }

      return results
    } catch (error) {
      console.error('Failed to get documents with data:', error)
      throw error
    }
  }
}

export const documentService = new DocumentService()
