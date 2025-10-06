// Document Processor Module
// Handles PDF and PowerPoint extraction

/**
 * Extract text from PDF file
 * @param {File} file - PDF file to extract text from
 * @param {Function} onProgress - Callback for progress updates (0-100)
 * @returns {Promise<string>} Extracted text content
 */
export async function extractTextFromPDF(file, onProgress = null) {
    try {
        console.log('📄 Starting PDF extraction...');
        
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Load PDF document
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        console.log(`📄 PDF has ${numPages} pages`);
        
        let fullText = '';
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Combine text items from page
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ');
            
            fullText += `\n\n--- Strona ${pageNum} ---\n\n${pageText}`;
            
            // Update progress
            if (onProgress) {
                const progress = Math.round((pageNum / numPages) * 100);
                onProgress(progress);
            }
            
            console.log(`✅ Extracted page ${pageNum}/${numPages}`);
        }
        
        console.log('✅ PDF extraction complete');
        return fullText.trim();
        
    } catch (error) {
        console.error('❌ PDF extraction error:', error);
        throw new Error(`Nie udało się wyekstrahować tekstu z PDF: ${error.message}`);
    }
}

/**
 * Extract text from PowerPoint file (PPT/PPTX)
 * This requires backend processing
 * @param {File} file - PowerPoint file
 * @param {string} backendUrl - Backend server URL
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise<string>} Extracted text content
 */
export async function extractTextFromPowerPoint(file, backendUrl, onProgress = null) {
    try {
        console.log('📊 Starting PowerPoint extraction...');
        
        if (onProgress) onProgress(10);
        
        // Create FormData to send file to backend
        const formData = new FormData();
        formData.append('file', file);
        
        if (onProgress) onProgress(30);
        
        // Send to backend for processing
        const response = await fetch(`${backendUrl}/api/extract-ppt`, {
            method: 'POST',
            body: formData
        });
        
        if (onProgress) onProgress(70);
        
        if (!response.ok) {
            throw new Error(`Backend error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (onProgress) onProgress(100);
        
        console.log('✅ PowerPoint extraction complete');
        return result.text || '';
        
    } catch (error) {
        console.error('❌ PowerPoint extraction error:', error);
        throw new Error(`Nie udało się wyekstrahować tekstu z PowerPoint: ${error.message}`);
    }
}

/**
 * Process document file (auto-detect type and extract)
 * @param {File} file - Document file (PDF or PPT/PPTX)
 * @param {string} backendUrl - Backend server URL (for PPT processing)
 * @param {Function} onProgress - Callback for progress updates (0-100)
 * @returns {Promise<{text: string, type: string, fileName: string}>} Extracted content
 */
export async function processDocument(file, backendUrl, onProgress = null) {
    try {
        const fileName = file.name.toLowerCase();
        let text = '';
        let type = '';
        
        // Detect file type and process accordingly
        if (fileName.endsWith('.pdf')) {
            type = 'pdf';
            text = await extractTextFromPDF(file, onProgress);
        } else if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
            type = 'powerpoint';
            text = await extractTextFromPowerPoint(file, backendUrl, onProgress);
        } else {
            throw new Error('Nieobsługiwany format pliku. Dozwolone: PDF, PPT, PPTX');
        }
        
        return {
            text,
            type,
            fileName: file.name
        };
        
    } catch (error) {
        console.error('❌ Document processing error:', error);
        throw error;
    }
}

/**
 * Validate document file
 * @param {File} file - File to validate
 * @returns {Object} Validation result {valid: boolean, error: string}
 */
export function validateDocumentFile(file) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedExtensions = ['.pdf', '.ppt', '.pptx'];
    
    // Check file size
    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'Plik jest za duży. Maksymalny rozmiar to 50MB.'
        };
    }
    
    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
        return {
            valid: false,
            error: 'Nieobsługiwany format pliku. Dozwolone: PDF, PPT, PPTX'
        };
    }
    
    return { valid: true, error: null };
}

/**
 * Format extracted text for better readability
 * @param {string} text - Raw extracted text
 * @returns {string} Formatted text
 */
export function formatExtractedText(text) {
    return text
        // Remove excessive whitespace
        .replace(/\s+/g, ' ')
        // Remove multiple newlines
        .replace(/\n{3,}/g, '\n\n')
        // Trim
        .trim();
}
