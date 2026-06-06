import sys

try:
    with open('d:/Project/Skytree/Website/src/components/PhotoStudioServiceModule.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add imports
    import_block = "import { useEffect, useMemo, useRef, useState } from 'react'"
    new_imports = """import { useEffect, useMemo, useRef, useState } from 'react'
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'"""
    
    if "import ReactCrop" not in content:
        content = content.replace(import_block, new_imports)

    # 2. Add state
    state_anchor = "  const singlePreviewCanvasRef = useRef<HTMLCanvasElement>(null)"
    new_state = """  const singlePreviewCanvasRef = useRef<HTMLCanvasElement>(null)
  
  // Manual Crop
  const [showManualCrop, setShowManualCrop] = useState(false)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const cropImageRef = useRef<HTMLImageElement>(null)

  const applyManualCrop = () => {
    if (!completedCrop || !cropImageRef.current || !completedCrop.width || !completedCrop.height) {
      setShowManualCrop(false)
      return
    }
    const image = cropImageRef.current
    const canvas = document.createElement('canvas')
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    canvas.width = completedCrop.width * scaleX
    canvas.height = completedCrop.height * scaleY
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY
      )
      const croppedBase64 = canvas.toDataURL('image/png', 1)
      setUploadedImage(croppedBase64)
      
      if (batchImages.length > 0) {
        const updatedBatch = [...batchImages]
        updatedBatch[activeBatchIndex].dataUrl = croppedBase64
        setBatchImages(updatedBatch)
      }
    }
    setShowManualCrop(false)
    setCrop(undefined)
    setCompletedCrop(undefined)
  }"""
    
    if "const [showManualCrop, setShowManualCrop]" not in content:
        content = content.replace(state_anchor, new_state)

    # 3. Add button to UI
    btn_anchor = """              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" style={compactButtonStyle} onClick={() => setStep('upload')}>&larr; Upload New</button>
              </div>"""
    new_btn = """              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" style={compactButtonStyle} onClick={() => setStep('upload')}>&larr; Upload New</button>
                <button className="btn-secondary" style={compactButtonStyle} onClick={() => setShowManualCrop(true)}>✂️ Manual Crop</button>
              </div>"""
    content = content.replace(btn_anchor, new_btn)

    # 4. Add crop overlay modal
    modal_anchor = "      <canvas ref={renderCanvasRef} style={{ display: 'none' }} />"
    crop_modal = """      <canvas ref={renderCanvasRef} style={{ display: 'none' }} />

      {/* MANUAL CROP OVERLAY */}
      {showManualCrop && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.9)', zIndex: 1400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '100%', maxHeight: '100%' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#111' }}>Manual Crop Overlay</h3>
            <div style={{ overflow: 'auto', maxWidth: '90vw', maxHeight: '70vh', background: '#e0e0e0', border: '1px solid #ccc' }}>
              <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)}>
                <img ref={cropImageRef} src={uploadedImage} alt="Crop" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
              </ReactCrop>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', width: '100%', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" style={{ padding: '8px 24px', borderRadius: '8px', color: '#111', border: '1px solid #ccc' }} onClick={() => setShowManualCrop(false)}>Cancel</button>
              <button className="btn-primary" style={{ padding: '8px 24px', borderRadius: '8px', fontWeight: 'bold' }} onClick={applyManualCrop}>Apply Crop</button>
            </div>
          </div>
        </div>
      )}
"""
    if "{/* MANUAL CROP OVERLAY */}" not in content:
        content = content.replace(modal_anchor, crop_modal)

    with open('d:/Project/Skytree/Website/src/components/PhotoStudioServiceModule.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Successfully added manual crop tool")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
