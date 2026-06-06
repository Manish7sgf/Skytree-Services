import re
import sys

try:
    with open('d:/Project/Skytree/Website/src/components/PhotoStudioServiceModule.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    ret_start = content.find("  return (\n    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.3fr) 1fr'")
    if ret_start == -1:
        print("Return block not found")
        sys.exit(1)
        
    new_return = """  return (
    <div style={{ position: 'relative', width: '100%', minHeight: 'calc(100vh - 120px)' }}>
      {/* --------------------- */}
      {/* FULL SCREEN EDIT MODE */}
      {/* --------------------- */}
      {step === 'edit' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', zIndex: 1200, display: 'flex', flexDirection: 'column', padding: '20px'
        }}>
          <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', background: 'var(--bg-dark)', borderRadius: '16px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '20px' }}>Photo Editor</h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px' }} onClick={() => setStep('upload')}>Cancel</button>
                <button className="btn-primary" style={{ padding: '8px 24px', borderRadius: '8px', fontWeight: 'bold' }} onClick={() => setStep('layout')}>Confirm & Layout &rarr;</button>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', height: 'calc(100% - 70px)' }}>
              {/* Left Canvas Preview */}
              <div style={{ padding: '24px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <canvas ref={singlePreviewCanvasRef} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', borderRadius: '4px', background: 'url("data:image/svg+xml,%3Csvg width=\\'20\\' height=\\'20\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cpath d=\\'M0 0h10v10H0zm10 10h10v10H10z\\' fill=\\'%23f0f0f0\\' fill-rule=\\'evenodd\\'/%3E%3C/svg%3E") #fff' }} />
              </div>
              
              {/* Right Controls Panel */}
              <div className="custom-scrollbar" style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--glass)' }}>
                {batchImages.length > 1 && (
                  <div>
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
                
                <div>
                  <h3 style={{ margin: '0 0 10px', color: 'var(--text-main)', fontSize: '15px' }}>Photo Size</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {(Object.keys(PHOTO_SIZES_CM) as PhotoSizeKey[]).map((k) => (
                      <label key={k} style={{ color: 'var(--text-main)', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' }}><input type="radio" checked={photoSizeKey === k} onChange={() => setPhotoSizeKey(k)} />{PHOTO_SIZES_CM[k].label.split(' ')[0]}</label>
                    ))}
                  </div>
                  {photoSizeKey === 'custom' && (
                    <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input type="number" min={1} step={0.1} value={customWidthCm} onChange={(e) => setCustomWidthCm(Number(e.target.value) || 1)} className="input-field" placeholder="Width cm" />
                      <input type="number" min={1} step={0.1} value={customHeightCm} onChange={(e) => setCustomHeightCm(Number(e.target.value) || 1)} className="input-field" placeholder="Height cm" />
                    </div>
                  )}
                </div>

                <div>
                  <h3 style={{ margin: '0 0 10px', color: 'var(--text-main)', fontSize: '15px' }}>Adjustments & Crop</h3>
                  <div style={{ color: 'var(--text-main)', display: 'grid', gap: '12px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Crop Zoom</span><span>{cropZoom.toFixed(2)}x</span></div><input type="range" min={1} max={2.5} step={0.01} value={cropZoom} onChange={(e) => setCropZoom(Number(e.target.value))} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Horizontal shift</span><span>{offsetX.toFixed(2)}</span></div><input type="range" min={-1} max={1} step={0.01} value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Vertical shift</span><span>{offsetY.toFixed(2)}</span></div><input type="range" min={-1} max={1} step={0.01} value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Head alignment</span><span>{headAlign}%</span></div><input type="range" min={20} max={70} step={1} value={headAlign} onChange={(e) => setHeadAlign(Number(e.target.value))} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Brightness</span><span>{photoEditor.brightness}%</span></div><input type="range" min={50} max={150} value={photoEditor.brightness} onChange={(e) => setPhotoEditor((p) => ({ ...p, brightness: Number(e.target.value) }))} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Contrast</span><span>{photoEditor.contrast}%</span></div><input type="range" min={50} max={150} value={photoEditor.contrast} onChange={(e) => setPhotoEditor((p) => ({ ...p, contrast: Number(e.target.value) }))} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Saturation</span><span>{photoEditor.saturation}%</span></div><input type="range" min={0} max={200} value={photoEditor.saturation} onChange={(e) => setPhotoEditor((p) => ({ ...p, saturation: Number(e.target.value) }))} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sharpness</span><span>{photoEditor.sharpness}%</span></div><input type="range" min={0} max={40} value={photoEditor.sharpness} onChange={(e) => setPhotoEditor((p) => ({ ...p, sharpness: Number(e.target.value) }))} /></div>
                  </div>
                  <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
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

                <div>
                  <h3 style={{ margin: '0 0 10px', color: 'var(--text-main)', fontSize: '15px' }}>Background Masking</h3>
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
                  <div style={{ marginTop: '16px', color: 'var(--text-main)', display: 'grid', gap: '12px', fontSize: '14px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={aiBackgroundRemoval} onChange={(e) => setAiBackgroundRemoval(e.target.checked)} /> AI-like background removal</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Mask tolerance</span><span>{aiMaskTolerance}</span></div><input type="range" min={12} max={80} value={aiMaskTolerance} onChange={(e) => setAiMaskTolerance(Number(e.target.value))} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Edge refinement</span><span>{aiEdgeRefine}</span></div><input type="range" min={4} max={40} value={aiEdgeRefine} onChange={(e) => setAiEdgeRefine(Number(e.target.value))} /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------- */}
      {/* CARD LAYOUT MODE    */}
      {/* ------------------- */}
      {step === 'layout' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.3fr) 1fr', gap: '24px', alignItems: 'start', width: '100%', maxHeight: 'calc(100vh - 120px)' }}>
          {/* Left Column: Layout Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
            <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '18px' }}>Card Layout</h3>
                <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px' }} onClick={() => setStep('edit')}>&larr; Back to Editor</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e0e0e0', borderRadius: '12px', minHeight: '400px', border: '1px solid var(--glass-border)', overflow: 'hidden', padding: '20px' }}>
                {renderedDataUrl ? (
                  <img src={renderedDataUrl} alt="Rendered photo card" style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 350px)', objectFit: 'contain', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', borderRadius: '4px' }} />
                ) : (
                  <div style={{ color: '#666', textAlign: 'center' }}>Click "Generate Layout" to see the print card.</div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn-primary" style={{ padding: '10px 16px', borderRadius: '8px' }} onClick={() => setRotationDeg((prev) => (prev + 90) % 360)}>Rotate 90°</button>
                <button className="btn-primary" style={{ padding: '10px 16px', borderRadius: '8px' }} onClick={printRenderedPreview} disabled={!renderedDataUrl}>Print</button>
                <button className="btn-primary" style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold' }} onClick={renderOutput} disabled={!uploadedImage || isRendering}>{isRendering ? 'Updating...' : 'Generate Layout'}</button>
                <button className="btn-primary" style={{ padding: '10px 16px', borderRadius: '8px' }} onClick={() => setShowPreview(true)} disabled={!renderedDataUrl}>Full View</button>
              </div>
            </div>
          </div>

          {/* Right Column: Layout Settings */}
          <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '8px' }}>
            <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
              <h3 style={{ margin: '0 0 16px', color: 'var(--text-main)', fontSize: '16px' }}>Card Size & Grid</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
              <label style={{ marginTop: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <input type="checkbox" checked={fillRemainingWithBatch} onChange={(e) => setFillRemainingWithBatch(e.target.checked)} /> Fill remaining spaces with next batch photos
              </label>
            </div>

            <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
              <h3 style={{ margin: '0 0 16px', color: 'var(--text-main)', fontSize: '16px' }}>Cutting Marks & Print Area</h3>
              <div style={{ color: 'var(--text-main)', display: 'grid', gap: '12px', fontSize: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={showCuttingMarks} onChange={(e) => setShowCuttingMarks(e.target.checked)} /> Show cutting guides</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={showSafeArea} onChange={(e) => setShowSafeArea(e.target.checked)} /> Print-safe area indicator</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Margin</span><span>{marginPx}px</span></div><input type="range" min={6} max={80} value={marginPx} onChange={(e) => setMarginPx(Number(e.target.value))} /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Spacing</span><span>{gapPx}px</span></div><input type="range" min={0} max={40} value={gapPx} onChange={(e) => setGapPx(Number(e.target.value))} /></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------- */}
      {/* HIDDEN CANVAS / MODALS */}
      {/* ------------------- */}
      <canvas ref={renderCanvasRef} style={{ display: 'none' }} />

      {showPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', zIndex: 1300, display: 'grid', placeItems: 'center' }}>
          <div style={{ width: 'min(92vw, 1100px)', maxHeight: '92vh', overflow: 'auto', borderRadius: '16px', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: 'var(--text-main)' }}>
              <strong style={{ fontSize: '18px' }}>Photo Card Full Preview</strong>
              <button onClick={() => setShowPreview(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '24px' }}>&times;</button>
            </div>
            {renderedDataUrl ? (
              <img src={renderedDataUrl} alt="Generated photo card preview" style={{ width: '100%', maxHeight: 'calc(92vh - 120px)', objectFit: 'contain', border: '1px solid var(--glass-border)', borderRadius: '8px', background: '#fff' }} />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Generate output to preview the photo card.</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px' }} onClick={() => setShowPreview(false)}>Close</button>
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
