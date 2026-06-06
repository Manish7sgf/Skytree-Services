import re
import sys

try:
    with open('d:/Project/Skytree/Website/src/components/PhotoStudioServiceModule.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add step state
    content = content.replace("  const [uploadedImage, setUploadedImage] = useState('')", 
                              "  const [uploadedImage, setUploadedImage] = useState('')\n  const [step, setStep] = useState<'upload' | 'edit' | 'layout'>('upload')\n  const [maskedSourceNode, setMaskedSourceNode] = useState<CanvasImageSource | null>(null)\n  const singlePreviewCanvasRef = useRef<HTMLCanvasElement>(null)")

    # 2. Update setBatchImages inside handleUploadMany
    old_upload = """      if (!uploadedImage && next.length > 0) {
        setUploadedImage(next[0].dataUrl)
        setSourceFileName(next[0].name)
        setActiveBatchIndex(0)
      }"""
    new_upload = """      if (!uploadedImage && next.length > 0) {
        setUploadedImage(next[0].dataUrl)
        setSourceFileName(next[0].name)
        setActiveBatchIndex(0)
        setStep('edit')
      }"""
    content = content.replace(old_upload, new_upload)

    # 3. Add useEffect for single preview
    old_compute = "  const computeGrid = (paperW: number, paperH: number, photoW: number, photoH: number, desiredOverride?: number | 'auto') => {"
    new_effects = """
  useEffect(() => {
    if (!uploadedImage) return
    let active = true
    const img = new Image()
    img.onload = () => {
      if (!active) return
      if (aiBackgroundRemoval || tileBackgroundMode !== 'none') {
        const maskTolerance = tileBackgroundMode !== 'none' && !aiBackgroundRemoval ? Math.max(aiMaskTolerance, 55) : aiMaskTolerance
        setTimeout(() => {
          if (!active) return
          try {
            const node = removeBackgroundWithMask(img, maskTolerance, aiEdgeRefine)
            setMaskedSourceNode(node)
          } catch (e) {
            setMaskedSourceNode(img)
          }
        }, 10)
      } else {
        setMaskedSourceNode(img)
      }
    }
    img.src = uploadedImage
    return () => { active = false }
  }, [uploadedImage, aiBackgroundRemoval, aiMaskTolerance, aiEdgeRefine, tileBackgroundMode])

  useEffect(() => {
    if (step !== 'edit' && step !== 'layout') return
    if (!maskedSourceNode) return
    const canvas = singlePreviewCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const photoW = cmToPx(activePhotoSize.widthCm)
    const photoH = cmToPx(activePhotoSize.heightCm)
    
    canvas.width = photoW
    canvas.height = photoH
    
    if (activeTileBackgroundColor) {
      ctx.fillStyle = activeTileBackgroundColor
      ctx.fillRect(0, 0, photoW, photoH)
    } else {
      ctx.clearRect(0, 0, photoW, photoH)
    }
    
    ctx.filter = getFilterString()
    
    const slotWidth = 'width' in maskedSourceNode ? maskedSourceNode.width : 0
    const slotHeight = 'height' in maskedSourceNode ? maskedSourceNode.height : 0
    
    if (slotWidth && slotHeight) {
      const sourceAspect = slotWidth / slotHeight
      const targetAspect = photoW / photoH
      const coverW = sourceAspect > targetAspect ? slotHeight * targetAspect : slotWidth
      const coverH = sourceAspect > targetAspect ? slotHeight : slotWidth / targetAspect

      const centerX = slotWidth / 2 + offsetX * (slotWidth * 0.25)
      const centerY = slotHeight * (headAlign / 100) + offsetY * (slotHeight * 0.25)
      const zoom = Math.max(1, cropZoom)
      const sx = Math.max(0, centerX - coverW / (2 * zoom))
      const sy = Math.max(0, centerY - coverH / (2 * zoom))
      const sw = Math.min(slotWidth - sx, coverW / zoom)
      const sh = Math.min(slotHeight - sy, coverH / zoom)

      const sharpBoost = Math.max(0, photoEditor.sharpness)
      if (sharpBoost > 0) {
        ctx.save()
        ctx.filter = `${getFilterString()} contrast(${100 + sharpBoost}%)`
        ctx.drawImage(maskedSourceNode, sx, sy, sw, sh, 0, 0, photoW, photoH)
        ctx.restore()
      } else {
        ctx.drawImage(maskedSourceNode, sx, sy, sw, sh, 0, 0, photoW, photoH)
      }
    }
    ctx.filter = 'none'
  }, [step, maskedSourceNode, photoEditor, noiseReduction, skinSmoothing, cropZoom, offsetX, offsetY, headAlign, activeTileBackgroundColor, activePhotoSize])

  const computeGrid = (paperW: number, paperH: number, photoW: number, photoH: number, desiredOverride?: number | 'auto') => {"""
    content = content.replace(old_compute, new_effects)

    # 4. Replace return block completely.
    # Find start of return block
    ret_start = content.find("  return (\n    <div style={{\n      display: 'grid'")
    if ret_start == -1:
        print("Return block not found")
        sys.exit(1)
        
    new_return = """  if (step === 'upload') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 120px)', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '600px', padding: '60px 40px', borderRadius: '16px', border: isDragOver ? '2px dashed var(--primary)' : '2px dashed var(--glass-border)', background: isDragOver ? 'var(--glass-highlight)' : 'var(--glass)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleUploadMany(Array.from(e.dataTransfer.files || [])) }}
        >
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" multiple style={{ display: 'none' }} onChange={(e) => handleUploadMany(Array.from(e.target.files || []))} />
          <div style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--primary)' }}>📸</div>
          <h2 style={{ color: 'var(--text-main)', marginBottom: '16px' }}>Upload Photo(s)</h2>
          <p style={{ color: 'var(--text-muted)' }}>Drag & drop JPG/PNG here or click to browse</p>
          <div style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>Multi-photo batch upload supported.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.3fr) 1fr', gap: '24px', alignItems: 'start', width: '100%', maxHeight: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '100%', overflowY: 'hidden' }}>
        {step === 'edit' && (
          <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
            <h3 style={{ margin: '0 0 10px', color: 'var(--text-main)' }}>Single Photo Editor (Real-time)</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'url("data:image/svg+xml,%3Csvg width=\\'20\\' height=\\'20\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cpath d=\\'M0 0h10v10H0zm10 10h10v10H10z\\' fill=\\'%23f0f0f0\\' fill-rule=\\'evenodd\\'/%3E%3C/svg%3E") #fff', borderRadius: '10px', border: '1px solid var(--glass-border)', minHeight: '320px', padding: '20px' }}>
              <canvas ref={singlePreviewCanvasRef} style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 300px)', objectFit: 'contain', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" style={compactButtonStyle} onClick={() => setStep('upload')}>&larr; Upload New</button>
              </div>
              <button className="btn-primary" style={{ ...compactButtonStyle, padding: '8px 24px', fontWeight: 'bold' }} onClick={() => setStep('layout')}>Proceed to Layout &rarr;</button>
            </div>
          </div>
        )}

        {step === 'layout' && (
          <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Card Render Preview</h3>
              <button className="btn-secondary" style={compactButtonStyle} onClick={() => setStep('edit')}>&larr; Back to Editor</button>
            </div>
            {renderedDataUrl ? (
              <img src={renderedDataUrl} alt="Rendered photo card" style={{ width: '100%', maxHeight: 'calc(100vh - 280px)', objectFit: 'contain', border: '1px solid var(--glass-border)', borderRadius: '10px', background: '#fff' }} />
            ) : (
              <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px solid var(--glass-border)', borderRadius: '10px', textAlign: 'center', padding: '20px' }}>Click "Update Preview" to generate the layout card.</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn-primary" style={compactButtonStyle} onClick={() => setRotationDeg((prev) => (prev + 90) % 360)}>Rotate 90°</button>
              <button className="btn-primary" style={compactButtonStyle} onClick={printRenderedPreview} disabled={!renderedDataUrl}>Print</button>
              <button className="btn-primary" style={compactButtonStyle} onClick={renderOutput} disabled={!uploadedImage || isRendering}>{isRendering ? 'Updating...' : 'Update Preview'}</button>
              <button className="btn-primary" style={compactButtonStyle} onClick={() => setShowPreview(true)} disabled={!renderedDataUrl}>Full View</button>
            </div>
          </div>
        )}
      </div>

      <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingRight: '8px', paddingBottom: '20px' }}>
        {batchImages.length > 0 && (
          <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
            <h3 style={{ margin: '0 0 10px', color: 'var(--text-main)', fontSize: '14px' }}>Batch Photos</h3>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {batchImages.map((item, index) => (
                <button key={item.id} type="button" onClick={() => activateBatchImage(index)} style={{ minWidth: '86px', borderRadius: '10px', border: index === activeBatchIndex ? '2px solid var(--primary)' : '1px solid var(--glass-border)', background: 'var(--bg-secondary)', padding: '6px', cursor: 'pointer', color: 'var(--text-main)' }}>
                  <img src={item.dataUrl} alt={item.name} style={{ width: '100%', height: '52px', objectFit: 'cover', borderRadius: '6px' }} />
                  <span style={{ display: 'block', marginTop: '4px', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'edit' && (
          <>
            <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
              <h3 style={{ margin: '0 0 10px', color: 'var(--text-main)' }}>Photo Size</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                {(Object.keys(PHOTO_SIZES_CM) as PhotoSizeKey[]).map((k) => (
                  <label key={k} style={{ color: 'var(--text-main)', display: 'flex', gap: '8px', alignItems: 'center' }}><input type="radio" checked={photoSizeKey === k} onChange={() => setPhotoSizeKey(k)} />{PHOTO_SIZES_CM[k].label}</label>
                ))}
              </div>
              {photoSizeKey === 'custom' && (
                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input type="number" min={1} step={0.1} value={customWidthCm} onChange={(e) => setCustomWidthCm(Number(e.target.value) || 1)} className="input-field" placeholder="Width cm" />
                  <input type="number" min={1} step={0.1} value={customHeightCm} onChange={(e) => setCustomHeightCm(Number(e.target.value) || 1)} className="input-field" placeholder="Height cm" />
                </div>
              )}
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
              <h3 style={{ margin: '0 0 10px', color: 'var(--text-main)' }}>Crop / Align / Enhance</h3>
              <div style={{ color: 'var(--text-main)', display: 'grid', gap: '8px' }}>
                <label>Crop Zoom {cropZoom.toFixed(2)}x <input type="range" min={1} max={2.5} step={0.01} value={cropZoom} onChange={(e) => setCropZoom(Number(e.target.value))} /></label>
                <label>Horizontal shift {offsetX.toFixed(2)} <input type="range" min={-1} max={1} step={0.01} value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} /></label>
                <label>Vertical shift {offsetY.toFixed(2)} <input type="range" min={-1} max={1} step={0.01} value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} /></label>
                <label>Head alignment {headAlign}% <input type="range" min={20} max={70} step={1} value={headAlign} onChange={(e) => setHeadAlign(Number(e.target.value))} /></label>
                <label>Brightness {photoEditor.brightness}% <input type="range" min={50} max={150} value={photoEditor.brightness} onChange={(e) => setPhotoEditor((p) => ({ ...p, brightness: Number(e.target.value) }))} /></label>
                <label>Contrast {photoEditor.contrast}% <input type="range" min={50} max={150} value={photoEditor.contrast} onChange={(e) => setPhotoEditor((p) => ({ ...p, contrast: Number(e.target.value) }))} /></label>
                <label>Saturation {photoEditor.saturation}% <input type="range" min={0} max={200} value={photoEditor.saturation} onChange={(e) => setPhotoEditor((p) => ({ ...p, saturation: Number(e.target.value) }))} /></label>
                <label>Sharpness {photoEditor.sharpness}% <input type="range" min={0} max={40} value={photoEditor.sharpness} onChange={(e) => setPhotoEditor((p) => ({ ...p, sharpness: Number(e.target.value) }))} /></label>
                <label>Noise reduction {noiseReduction}% <input type="range" min={0} max={60} value={noiseReduction} onChange={(e) => setNoiseReduction(Number(e.target.value))} /></label>
                <label>Skin smoothing {skinSmoothing}% <input type="range" min={0} max={60} value={skinSmoothing} onChange={(e) => setSkinSmoothing(Number(e.target.value))} /></label>
              </div>
              <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <button className="btn-primary" style={compactButtonStyle} onClick={() => applyQualityPreset('normal')}>Normal</button>
                <button className="btn-primary" style={compactButtonStyle} onClick={() => applyQualityPreset('high-clarity')}>High Clarity</button>
                <button className="btn-primary" style={compactButtonStyle} onClick={() => applyQualityPreset('soft-tone')}>Soft Tone</button>
                <button className="btn-primary" style={compactButtonStyle} onClick={() => applyQualityPreset('studio-light')}>Studio Light</button>
                <button className="btn-primary" style={compactButtonStyle} onClick={applyAutoEnhance}>Auto Enhance</button>
                <button className="btn-primary" style={compactButtonStyle} onClick={applyFaceClarity}>Face Clarity</button>
                <button className="btn-primary" style={compactButtonStyle} onClick={applyWarmTone}>Warm Tone</button>
                <button className="btn-primary" style={compactButtonStyle} onClick={applyCoolTone}>Cool Tone</button>
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
              <h3 style={{ margin: '0 0 10px', color: 'var(--text-main)' }}>Background Masking</h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>Replace original background with color:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <button className="btn-primary" style={{ opacity: tileBackgroundMode === 'none' ? 1 : 0.7 }} onClick={() => setTileBackgroundMode('none')}>None</button>
                <button className="btn-primary" style={{ opacity: tileBackgroundMode === 'white' ? 1 : 0.7 }} onClick={() => setTileBackgroundMode('white')}>White</button>
                <button className="btn-primary" style={{ opacity: tileBackgroundMode === 'blue' ? 1 : 0.7 }} onClick={() => setTileBackgroundMode('blue')}>Blue</button>
                <button className="btn-primary" style={{ opacity: tileBackgroundMode === 'custom' ? 1 : 0.7 }} onClick={() => setTileBackgroundMode('custom')}>Custom</button>
              </div>
              {tileBackgroundMode === 'custom' && (
                <div style={{ marginTop: '10px' }}><input type="color" value={tileCustomBackgroundColor} onChange={(e) => setTileCustomBackgroundColor(e.target.value)} /></div>
              )}
              <div style={{ marginTop: '10px', color: 'var(--text-main)', display: 'grid', gap: '8px' }}>
                <label><input type="checkbox" checked={aiBackgroundRemoval} onChange={(e) => setAiBackgroundRemoval(e.target.checked)} /> AI-like background removal</label>
                <label>Mask tolerance {aiMaskTolerance} <input type="range" min={12} max={80} value={aiMaskTolerance} onChange={(e) => setAiMaskTolerance(Number(e.target.value))} /></label>
                <label>Edge refinement {aiEdgeRefine} <input type="range" min={4} max={40} value={aiEdgeRefine} onChange={(e) => setAiEdgeRefine(Number(e.target.value))} /></label>
              </div>
            </div>
          </>
        )}

        {step === 'layout' && (
          <>
            <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
              <h3 style={{ margin: '0 0 10px', color: 'var(--text-main)' }}>Card Layout Settings</h3>
              <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select className="input-field" value={paperSizeKey} onChange={(e) => setPaperSizeKey(e.target.value as PaperSizeKey)}>
                  {(Object.keys(PAPER_INCH) as PaperSizeKey[]).map((k) => <option key={k} value={k}>{PAPER_INCH[k].label}</option>)}
                </select>
                <select className="input-field" value={layoutCount} onChange={(e) => setLayoutCount(e.target.value === 'auto' ? 'auto' : Number(e.target.value) as LayoutCount)}>
                  <option value={2}>2 photos</option>
                  <option value={4}>4 photos</option>
                  <option value={8}>8 photos</option>
                  <option value={12}>12 photos</option>
                  <option value={16}>16 photos</option>
                  <option value="auto">Auto-fit grid</option>
                </select>
              </div>
              <label style={{ marginTop: '10px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <input type="checkbox" checked={fillRemainingWithBatch} onChange={(e) => setFillRemainingWithBatch(e.target.checked)} /> Fill remaining spaces with next batch photos
              </label>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
              <h3 style={{ margin: '0 0 10px', color: 'var(--text-main)' }}>Cutting Marks & Print Area</h3>
              <div style={{ color: 'var(--text-main)', display: 'grid', gap: '8px' }}>
                <label><input type="checkbox" checked={showCuttingMarks} onChange={(e) => setShowCuttingMarks(e.target.checked)} /> Show cutting guides</label>
                <label><input type="checkbox" checked={showSafeArea} onChange={(e) => setShowSafeArea(e.target.checked)} /> Print-safe area indicator</label>
                <label>Margin: {marginPx}px <input type="range" min={6} max={80} value={marginPx} onChange={(e) => setMarginPx(Number(e.target.value))} /></label>
                <label>Spacing: {gapPx}px <input type="range" min={0} max={40} value={gapPx} onChange={(e) => setGapPx(Number(e.target.value))} /></label>
              </div>
            </div>
          </>
        )}
      </div>

      <canvas ref={renderCanvasRef} style={{ display: 'none' }} />

      {showPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.65)', zIndex: 1200, display: 'grid', placeItems: 'center' }}>
          <div style={{ width: 'min(92vw, 1100px)', maxHeight: '92vh', overflow: 'auto', borderRadius: '12px', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-main)' }}>
              <strong>Photo Card Full Preview</strong>
              <button onClick={() => setShowPreview(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '20px' }}>x</button>
            </div>
            {renderedDataUrl ? (
              <img src={renderedDataUrl} alt="Generated photo card preview" style={{ width: '100%', maxHeight: 'calc(92vh - 120px)', objectFit: 'contain', border: '1px solid var(--glass-border)', borderRadius: '8px', background: '#fff' }} />
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>Generate output to preview the photo card.</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button className="btn-primary" style={compactButtonStyle} onClick={() => setShowPreview(false)}>Back to Editor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
"""
    content = content[:ret_start] + new_return

    with open('d:/Project/Skytree/Website/src/components/PhotoStudioServiceModule.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Successfully replaced content")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
