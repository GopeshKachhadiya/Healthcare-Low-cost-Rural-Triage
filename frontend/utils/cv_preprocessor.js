/**
 * Agent P1: Image Preprocessor
 * Runs on-device (in the browser/PWA) to validate and compress images
 * before sending to the YOLO inference API (P2).
 */

export class ImagePreprocessor {
    /**
     * Assesses basic image quality (blur detection via Laplacian variance would require OpenCV.js,
     * so here is a mocked structure for it).
     */
    static assessQuality(imageData) {
        // Mocking OpenCV.js Laplacian variance check
        const isBlurry = false;
        const isTooDark = false;
        
        if (isBlurry) return { valid: false, reason: "Image too blurry — hold phone steady" };
        if (isTooDark) return { valid: false, reason: "Too dark — find better lighting" };
        
        return { valid: true };
    }

    /**
     * Resizes and normalizes the image for YOLOv8 (640x640)
     */
    static async preprocess(file) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 640;
                const ctx = canvas.getContext('2d');
                
                // Draw and resize
                ctx.drawImage(img, 0, 0, 640, 640);
                
                // Export as compressed JPEG
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.8);
            };
        });
    }
}
