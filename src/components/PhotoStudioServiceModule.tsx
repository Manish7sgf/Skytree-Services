import { useEffect, useMemo, useRef, useState } from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

type PhotoSizeKey = 'passport' | 'stamp' | 'custom' | 'pan' | 'aadhar' | 'dl' | 'cm_health' | 'pm_health'
const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
type PaperSizeKey = '4x6' | '5x7' | 'a4' | '6x4'
type LayoutCount = 2 | 4 | 8 | 12 | 16 | 'auto'
type TileBackgroundMode = 'none' | 'white' | 'blue' | 'custom'
type QualityPreset = 'normal' | 'high-clarity' | 'soft-tone' | 'studio-light'

interface PhotoEditorState {
  brightness: number
  contrast: number
  saturation: number
  sharpness: number
  blur: number
  hueRotation: number
}

interface PhotoStudioProps {
  moduleKey: string
  onBack: () => void
}

interface BatchImage {
  id: string
  name: string
  dataUrl: string
}

const DPI = 300

const PHOTO_SIZES_CM: Record<'passport' | 'stamp' | 'custom', { label: string; widthCm: number; heightCm: number }> = {
  passport: { label: 'Passport 3.5 x 4.5 cm', widthCm: 3.5, heightCm: 4.5 },
  stamp: { label: 'Stamp 2.5 x 3.0 cm', widthCm: 2.5, heightCm: 3.0 },
  custom: { label: 'Custom', widthCm: 3.5, heightCm: 4.5 },
}

const ID_CARD_DIMENSIONS: Record<string, { widthCm: number; heightCm: number }> = {
  pan: { widthCm: 8.6, heightCm: 5.4 },
  aadhar: { widthCm: 8.6, heightCm: 5.4 },
  dl: { widthCm: 8.6, heightCm: 5.4 },
  cm_health: { widthCm: 8.6, heightCm: 5.4 },
  pm_health: { widthCm: 8.6, heightCm: 5.4 },
}

const PAPER_INCH: Record<PaperSizeKey, { label: string; width: number; height: number }> = {
  '4x6': { label: '4 x 6 in (Portrait)', width: 4, height: 6 },
  '6x4': { label: '6 x 4 in (Landscape)', width: 6, height: 4 },
  '5x7': { label: '5 x 7 in (Portrait)', width: 5, height: 7 },
  a4: { label: 'A4', width: 8.27, height: 11.69 },
}

const defaultEditor: PhotoEditorState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sharpness: 0,
  blur: 0,
  hueRotation: 0,
}

const cmToPx = (cm: number) => Math.round((cm / 2.54) * DPI)

const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

const readImageAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export default function PhotoStudioServiceModule({ moduleKey }: PhotoStudioProps) {
  const [uploadedImage, setUploadedImage] = useState('')
  const [step, setStep] = useState<'upload' | 'edit' | 'layout'>('upload')
  const [maskedSourceNode, setMaskedSourceNode] = useState<CanvasImageSource | null>(null)
  const singlePreviewCanvasRef = useRef<HTMLCanvasElement>(null)

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
  }
  const [batchImages, setBatchImages] = useState<BatchImage[]>([])
  const [activeBatchIndex, setActiveBatchIndex] = useState(0)
  const [cardBleed, setCardBleed] = useState(0)

  const [hoveredBtn, setHoveredBtn] = useState<PhotoSizeKey | null>(null)

  const [photoSizeKey, setPhotoSizeKey] = useState<PhotoSizeKey>('passport')
  const [paperSizeKey, setPaperSizeKey] = useState<PaperSizeKey>('4x6')
  const [layoutCount, setLayoutCount] = useState<LayoutCount>(8)
  const [customWidthCm, setCustomWidthCm] = useState(3.5)
  const [customHeightCm, setCustomHeightCm] = useState(4.5)

  const [tileBackgroundMode, setTileBackgroundMode] = useState<TileBackgroundMode>('white')
  const [tileCustomBackgroundColor, setTileCustomBackgroundColor] = useState('#ffffff')

  const [showCuttingMarks, setShowCuttingMarks] = useState(true)
  const [showSafeArea, setShowSafeArea] = useState(true)
  const [marginPx, setMarginPx] = useState(50)
  const [gapPx, setGapPx] = useState(30)
  const [photoBorderWidth, setPhotoBorderWidth] = useState(0)
  const [photoBorderColor, setPhotoBorderColor] = useState('#ffffff')

  const [cropZoom, setCropZoom] = useState(1.15)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [headAlign, setHeadAlign] = useState(45)

  const [photoEditor, setPhotoEditor] = useState<PhotoEditorState>(defaultEditor)

  const applyClarity = () => {
    setPhotoEditor(prev => ({
      ...prev,
      contrast: 125,
      sharpness: 20,
      saturation: 110
    }))
  }

  const [noiseReduction] = useState(0)
  const [skinSmoothing] = useState(0)

  const [showPreview, setShowPreview] = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const [renderedDataUrl, setRenderedDataUrl] = useState('')
  const [fillRemainingWithBatch, setFillRemainingWithBatch] = useState(true)
  const [rotationDeg, setRotationDeg] = useState(0)
  const [aiBackgroundRemoval, setAiBackgroundRemoval] = useState(false)
  const [aiMaskTolerance, setAiMaskTolerance] = useState(36)
  const [aiEdgeRefine, setAiEdgeRefine] = useState(14)

  const [pdfPassword, setPdfPassword] = useState('')
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null)
  const [isProcessingPdf, setIsProcessingPdf] = useState(false)
  const [pdfType, setPdfType] = useState<'pan' | 'aadhar'>('pan')
  const [cardLayoutMode, setCardLayoutMode] = useState<'single' | 'dual'>('dual')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const renderCanvasRef = useRef<HTMLCanvasElement>(null)

  const templateKey = `${moduleKey}_photo_studio_template`
  const compactButtonStyle: React.CSSProperties = {
    padding: '6px 10px',
    fontSize: '11px',
    borderRadius: '6px',
  }

  const documentButtonStyle: React.CSSProperties = {
    padding: '24px 16px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    border: 'none',
    boxShadow: '0 12px 30px rgba(14, 165, 233, 0.4)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: 'white',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
    cursor: 'pointer',
    width: '100%'
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(templateKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed.photoSizeKey) setPhotoSizeKey(parsed.photoSizeKey)
      if (parsed.paperSizeKey) setPaperSizeKey(parsed.paperSizeKey)
      if (parsed.layoutCount) setLayoutCount(parsed.layoutCount)
      if (typeof parsed.marginPx === 'number') setMarginPx(parsed.marginPx)
      if (typeof parsed.gapPx === 'number') setGapPx(parsed.gapPx)
      if (typeof parsed.customWidthCm === 'number') setCustomWidthCm(parsed.customWidthCm)
      if (typeof parsed.customHeightCm === 'number') setCustomHeightCm(parsed.customHeightCm)
    } catch {
      // Ignore corrupt template payload.
    }
  }, [templateKey])

  const activePhotoSize = useMemo(() => {
    if (photoSizeKey === 'custom') {
      return {
        widthCm: customWidthCm,
        heightCm: customHeightCm,
      }
    }
    if (ID_CARD_DIMENSIONS[photoSizeKey]) {
      return ID_CARD_DIMENSIONS[photoSizeKey]
    }
    return {
      widthCm: PHOTO_SIZES_CM[photoSizeKey as keyof typeof PHOTO_SIZES_CM].widthCm,
      heightCm: PHOTO_SIZES_CM[photoSizeKey as keyof typeof PHOTO_SIZES_CM].heightCm,
    }
  }, [photoSizeKey, customWidthCm, customHeightCm])

  const activeTileBackgroundColor = useMemo(() => {
    if (tileBackgroundMode === 'none') return ''
    if (tileBackgroundMode === 'white') return '#ffffff'
    if (tileBackgroundMode === 'blue') return '#dbeafe'
    return tileCustomBackgroundColor
  }, [tileBackgroundMode, tileCustomBackgroundColor])

  const activeBackgroundColor = '#ffffff'

  const getFilterString = () => {
    const filters = [
      `brightness(${photoEditor.brightness}%)`,
      `contrast(${photoEditor.contrast}%)`,
      `saturate(${photoEditor.saturation}%)`,
      `hue-rotate(${photoEditor.hueRotation}deg)`,
      photoEditor.blur > 0 ? `blur(${(photoEditor.blur / 10).toFixed(1)}px)` : '',
      noiseReduction > 0 ? `blur(${(noiseReduction / 20).toFixed(1)}px)` : '',
      skinSmoothing > 0 ? `contrast(${100 - skinSmoothing / 3}%)` : '',
    ]
    return filters.filter(Boolean).join(' ')
  }

  // Auto-enforce paper orientation based on service type
  useEffect(() => {
    const cardServices: PhotoSizeKey[] = ['pan', 'aadhar', 'dl', 'cm_health', 'pm_health']
    if (cardServices.includes(photoSizeKey)) {
      setPaperSizeKey('4x6') // Fixed Portrait for Cards
    } else {
      setPaperSizeKey('6x4') // Default Landscape for Standard Photos
    }
  }, [photoSizeKey])

  const applyQualityPreset = (preset: QualityPreset) => {
    if (preset === 'normal') {
      setPhotoEditor(defaultEditor)
      return
    }
    if (preset === 'high-clarity') {
      setPhotoEditor({ ...defaultEditor, contrast: 112, saturation: 108, sharpness: 18 })
      return
    }
    if (preset === 'soft-tone') {
      setPhotoEditor({ ...defaultEditor, brightness: 105, contrast: 95, saturation: 90, blur: 8 })
      return
    }
    setPhotoEditor({ ...defaultEditor, brightness: 108, contrast: 114, saturation: 112, sharpness: 20 })
  }

  const applyAutoEnhance = () => {
    setPhotoEditor((prev) => ({ ...prev, brightness: 106, contrast: 110, saturation: 106, sharpness: 12 }))
  }

  const applyFaceClarity = () => {
    setPhotoEditor((prev) => ({ ...prev, contrast: 116, sharpness: 22 }))
  }

  const applyWarmTone = () => {
    setPhotoEditor((prev) => ({ ...prev, hueRotation: 8, saturation: 112 }))
  }

  const applyCoolTone = () => {
    setPhotoEditor((prev) => ({ ...prev, hueRotation: -8, saturation: 104 }))
  }

  // Paste-from-clipboard handler — fires when user presses Ctrl+V on the upload screen
  const handlePasteForBtn = async (key: PhotoSizeKey, item: DataTransferItem) => {
    const file = item.getAsFile()
    if (!file) return
    const dataUrl = await readImageAsDataUrl(file)
    const batchItem: BatchImage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name || 'pasted-image.jpg',
      dataUrl,
    }
    setPhotoSizeKey(key)
    if (key === 'aadhar') setPdfType('aadhar')
    setBatchImages([batchItem])
    setUploadedImage(dataUrl)
    setActiveBatchIndex(0)
    setStep('edit')
    setShowPreview(false)
  }

  useEffect(() => {
    if (step !== 'upload') return
    const onPaste = (e: ClipboardEvent) => {
      const activeKey = hoveredBtn
      if (!activeKey) return
      const items = Array.from(e.clipboardData?.items || [])
      const imgItem = items.find(i => i.type.startsWith('image/'))
      if (!imgItem) return
      e.preventDefault()
      handlePasteForBtn(activeKey, imgItem)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, hoveredBtn])

  const handleUploadMany = async (files: File[]) => {
    if (!files.length) return

    const pdfFile = files.find(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    if (pdfFile) {
      if (photoSizeKey === 'aadhar') {
        console.log('PDF detected, starting Aadhaar workflow...')
        setPdfType('aadhar')
        setPendingPdfFile(pdfFile)
        setShowPasswordPrompt(true)
      } else {
        console.log('PDF detected, starting PAN workflow...')
        setPdfType('pan')
        setPhotoSizeKey('pan')
        setPendingPdfFile(pdfFile)
        setShowPasswordPrompt(true)
      }
      return
    }

    const validFiles = files.filter((file) => /image\/(png|jpeg|jpg)/i.test(file.type))
    if (!validFiles.length) {
      alert('Please upload JPG, PNG image files or a PAN Card PDF.')
      return
    }

    const mapped = await Promise.all(validFiles.map(async (file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      dataUrl: await readImageAsDataUrl(file),
    })))

    if (mapped.length > 0) {
      setBatchImages((prev) => [...prev, ...mapped])
      setUploadedImage(mapped[0].dataUrl)
      setActiveBatchIndex(batchImages.length)
      setStep('edit')
    }
    setShowPreview(false)
  }

  const processPanPdf = async (password: string) => {
    if (!pendingPdfFile) return
    setIsProcessingPdf(true)
    setShowPasswordPrompt(false)

    try {
      if (!(window as any).pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = PDFJS_URL
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
      }
      const pdfjsLib = (window as any).pdfjsLib
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL

      const arrayBuffer = await pendingPdfFile.arrayBuffer()
      let pdfDoc
      try {
        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer, password }).promise
      } catch (err: any) {
        if (err.name === 'PasswordException' || err.message?.includes('password')) {
          alert('Incorrect password. Please try again.')
          setShowPasswordPrompt(true)
          setIsProcessingPdf(false)
          return
        }
        throw err
      }

      const page = await pdfDoc.getPage(1)
      const viewport = page.getViewport({ scale: 4.0 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      await page.render({ canvasContext: ctx, viewport }).promise

      const cardW = Math.round((85.6 / 25.4) * DPI) // Exact CR-80 Width
      const cardH = Math.round((54 / 25.4) * DPI)   // Exact CR-80 Height

      const extractRegion = (x: number, y: number) => {
        const temp = document.createElement('canvas')
        temp.width = cardW
        temp.height = cardH
        const tctx = temp.getContext('2d')
        if (tctx) {
          tctx.drawImage(canvas, x, y, cardW, cardH, 0, 0, cardW, cardH)
        }
        return temp.toDataURL('image/png')
      }

      const frontDataUrl = extractRegion(viewport.width * 0.05, viewport.height * 0.78)
      const backDataUrl = extractRegion(viewport.width * 0.52, viewport.height * 0.78)

      const printCanvas = document.createElement('canvas')
      printCanvas.width = 1200 // 4 inches at 300 DPI
      printCanvas.height = 1800 // 6 inches at 300 DPI
      const pctx = printCanvas.getContext('2d')
      if (pctx) {
        pctx.fillStyle = '#ffffff'
        pctx.fillRect(0, 0, 1200, 1800)

        const fImg = new Image()
        const bImg = new Image()

        await Promise.all([
          new Promise((resolve, reject) => {
            fImg.onload = resolve;
            fImg.onerror = reject;
            fImg.src = frontDataUrl;
          }),
          new Promise((resolve, reject) => {
            bImg.onload = resolve;
            bImg.onerror = reject;
            bImg.src = backDataUrl;
          })
        ])

        // Back to white background
        pctx.fillStyle = '#ffffff'
        pctx.fillRect(0, 0, 1200, 1800)

        const startX = (1200 - cardW) / 2

        // Slot 1 (Top Half - Centered)
        pctx.drawImage(fImg, startX, 131, cardW, cardH)

        // Central Cutting Line
        pctx.beginPath()
        pctx.moveTo(50, 900)
        pctx.lineTo(1150, 900)
        pctx.strokeStyle = 'rgba(0,0,0,0.3)'
        pctx.setLineDash([10, 10])
        pctx.stroke()
        pctx.setLineDash([])

        if (cardLayoutMode === 'dual') {
          // Slot 2 (Bottom Half - Centered)
          pctx.drawImage(fImg, startX, 1031, cardW, cardH)
        }

        const finalDataUrl = printCanvas.toDataURL('image/jpeg', 0.95)
        setRenderedDataUrl(finalDataUrl)
        setUploadedImage(frontDataUrl)
        setBatchImages([
          { id: 'pan-front', name: 'PAN Front', dataUrl: frontDataUrl },
          { id: 'pan-back', name: 'PAN Back', dataUrl: backDataUrl }
        ])
        setActiveBatchIndex(0)
        setStep('layout')
        setShowPreview(true)
      }
    } catch (err) {
      console.error('PAN PDF Error:', err)
      alert('Failed to process PAN PDF.')
    } finally {
      setIsProcessingPdf(false)
      setPendingPdfFile(null)
      setPdfPassword('')
    }
  }

  const processAadhaarPdf = async (password: string) => {
    if (!pendingPdfFile) return
    setIsProcessingPdf(true)
    setShowPasswordPrompt(false)

    try {
      if (!(window as any).pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = PDFJS_URL
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
      }
      const pdfjsLib = (window as any).pdfjsLib
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL

      const arrayBuffer = await pendingPdfFile.arrayBuffer()
      let pdfDoc
      try {
        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer, password }).promise
      } catch (err: any) {
        if (err.name === 'PasswordException' || err.message?.includes('password')) {
          alert('Incorrect password. For Aadhaar PDF, password is first 4 letters of your name in CAPITALS followed by birth year (e.g. RAME1990).')
          setShowPasswordPrompt(true)
          setIsProcessingPdf(false)
          return
        }
        throw err
      }

      const page = await pdfDoc.getPage(1)
      const scale = 4.0
      const viewport = page.getViewport({ scale })
      const pdfCanvas = document.createElement('canvas')
      pdfCanvas.width = viewport.width
      pdfCanvas.height = viewport.height
      const pdfCtx = pdfCanvas.getContext('2d')
      if (!pdfCtx) return
      await page.render({ canvasContext: pdfCtx, viewport }).promise

      // Aadhaar card: 88.6mm × 58mm
      const aadharW = Math.round((88.6 / 25.4) * DPI)
      const aadharH = Math.round((58 / 25.4) * DPI)

      // The e-Aadhaar PDF is A4 (210mm × 297mm).
      // Crop instructions: trim 1.4cm from left & right, 3.1cm from bottom.
      // The two cards (front & back) sit side-by-side in the lower portion of the page.
      const pageWidthMm = 210

      const pxPerMm = viewport.width / pageWidthMm

      const leftTrimPx = 1.7 * 10 * pxPerMm  // 14mm
      const rightTrimPx = 1.7 * 10 * pxPerMm  // 14mm
      const bottomTrimPx = 2.0 * 10 * pxPerMm // 31mm

      const usableW = viewport.width - leftTrimPx - rightTrimPx
      const usableH = viewport.height - bottomTrimPx

      // Each card occupies roughly half the usable width side-by-side
      const halfW = usableW / 2
      const cardHeightOnPage = (58 / 25.4) * 72 * scale  // card height in PDF canvas px
      const sy = usableH - cardHeightOnPage

      // FRONT card: extra fine-tune — trim 1mm from right edge, 2mm from top
      const frontExtraRight = 2 * pxPerMm
      const frontExtraTop = 2 * pxPerMm
      const extractCardFront = () => {
        const temp = document.createElement('canvas')
        temp.width = aadharW
        temp.height = aadharH
        const tctx = temp.getContext('2d')
        if (tctx) {
          tctx.imageSmoothingEnabled = true
          tctx.imageSmoothingQuality = 'high'
          tctx.drawImage(
            pdfCanvas,
            leftTrimPx,                               // x start
            Math.max(0, sy + frontExtraTop),          // y start (+2mm down)
            halfW - frontExtraRight,                  // source width (-1mm from right)
            cardHeightOnPage - frontExtraTop,         // source height (cropped top)
            0, 0, aadharW, aadharH
          )
        }
        return temp.toDataURL('image/png')
      }

      // BACK card: extra fine-tune — trim 2mm from left edge, 2mm from top
      const backExtraLeft = 2 * pxPerMm
      const backExtraTop = 2 * pxPerMm
      const extractCardBack = () => {
        const temp = document.createElement('canvas')
        temp.width = aadharW
        temp.height = aadharH
        const tctx = temp.getContext('2d')
        if (tctx) {
          tctx.imageSmoothingEnabled = true
          tctx.imageSmoothingQuality = 'high'
          tctx.drawImage(
            pdfCanvas,
            leftTrimPx + halfW + backExtraLeft,       // x start (+2mm from left of back)
            Math.max(0, sy + backExtraTop),            // y start (+2mm down)
            halfW - backExtraLeft,                    // source width (-2mm from left)
            cardHeightOnPage - backExtraTop,           // source height (cropped top)
            0, 0, aadharW, aadharH
          )
        }
        return temp.toDataURL('image/png')
      }

      const frontDataUrl = extractCardFront()
      const backDataUrl = extractCardBack()

      setUploadedImage(frontDataUrl)
      setPhotoSizeKey('aadhar')
      setBatchImages([
        { id: 'aadhar-front', name: 'Aadhaar Front', dataUrl: frontDataUrl },
        { id: 'aadhar-back', name: 'Aadhaar Back', dataUrl: backDataUrl }
      ])
      setActiveBatchIndex(0)
      setStep('layout')
      setShowPreview(false)
    } catch (err) {
      console.error('Aadhaar PDF Error:', err)
      alert('Failed to process Aadhaar PDF. Please check the file and password.')
    } finally {
      setIsProcessingPdf(false)
      setPendingPdfFile(null)
      setPdfPassword('')
    }
  }

  const activateBatchImage = (index: number) => {
    const item = batchImages[index]
    if (!item) return
    setActiveBatchIndex(index)
    setUploadedImage(item.dataUrl)
    setShowPreview(false)
  }

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

    const slotWidth = Number('width' in maskedSourceNode ? maskedSourceNode.width : 0)
    const slotHeight = Number('height' in maskedSourceNode ? maskedSourceNode.height : 0)

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

  const computeGrid = (paperW: number, paperH: number, photoW: number, photoH: number, desiredOverride?: number | 'auto') => {
    const usableW = Math.max(0, paperW - marginPx * 2)
    const usableH = Math.max(0, paperH - marginPx * 2)
    const maxCols = Math.max(1, Math.floor((usableW + gapPx) / (photoW + gapPx)))
    const maxRows = Math.max(1, Math.floor((usableH + gapPx) / (photoH + gapPx)))
    const maxFit = maxCols * maxRows

    const desired = desiredOverride === undefined
      ? (layoutCount === 'auto' ? maxFit : layoutCount)
      : (desiredOverride === 'auto' ? maxFit : desiredOverride)

    const count = Math.min(desired, maxFit)

    // Eco-Logic: Fill columns vertically first (2 rows high)
    if (count <= 2) return { cols: 1, rows: 2, count }
    if (count <= 4) return { cols: 2, rows: 2, count }
    if (count <= 6) return { cols: 3, rows: 2, count }
    if (count <= 8) return { cols: 4, rows: 2, count }

    const cols = Math.min(maxCols, Math.max(1, Math.ceil(Math.sqrt(count * (usableW / Math.max(1, usableH))))))
    const rows = Math.max(1, Math.ceil(count / cols))
    return { cols, rows, count }
  }

  const removeBackgroundWithMask = (img: HTMLImageElement, tolerance: number, edgeRefine: number) => {
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = img.width
    maskCanvas.height = img.height
    const maskCtx = maskCanvas.getContext('2d')
    if (!maskCtx) return maskCanvas

    maskCtx.drawImage(img, 0, 0)
    const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
    const { data, width, height } = imageData
    const pixelCount = width * height
    const bgMask = new Uint8Array(pixelCount)
    const queue = new Uint32Array(pixelCount)

    const corners = [
      [1, 1],
      [width - 2, 1],
      [1, height - 2],
      [width - 2, height - 2],
    ]

    let r = 0
    let g = 0
    let b = 0
    for (const [cx, cy] of corners) {
      const idx = (cy * width + cx) * 4
      r += data[idx]
      g += data[idx + 1]
      b += data[idx + 2]
    }
    const bgR = r / corners.length
    const bgG = g / corners.length
    const bgB = b / corners.length

    const colorDistance = (x: number, y: number) => {
      const idx = (y * width + x) * 4
      const dr = data[idx] - bgR
      const dg = data[idx + 1] - bgG
      const db = data[idx + 2] - bgB
      return Math.sqrt(dr * dr + dg * dg + db * db)
    }

    let head = 0
    let tail = 0
    const enqueueIfBg = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return
      const p = y * width + x
      if (bgMask[p]) return
      if (colorDistance(x, y) <= tolerance + edgeRefine) {
        bgMask[p] = 1
        queue[tail++] = p
      }
    }

    for (let x = 0; x < width; x++) {
      enqueueIfBg(x, 0)
      enqueueIfBg(x, height - 1)
    }
    for (let y = 0; y < height; y++) {
      enqueueIfBg(0, y)
      enqueueIfBg(width - 1, y)
    }

    while (head < tail) {
      const p = queue[head++]
      const x = p % width
      const y = Math.floor(p / width)
      enqueueIfBg(x + 1, y)
      enqueueIfBg(x - 1, y)
      enqueueIfBg(x, y + 1)
      enqueueIfBg(x, y - 1)
    }

    const softEdge = Math.max(1, edgeRefine)
    for (let p = 0; p < pixelCount; p++) {
      if (!bgMask[p]) continue
      const x = p % width
      const y = Math.floor(p / width)
      const idx = p * 4
      const dist = colorDistance(x, y)

      if (dist <= tolerance) {
        data[idx + 3] = 0
      } else if (dist <= tolerance + softEdge) {
        const alpha = Math.round(((dist - tolerance) / softEdge) * 255)
        data[idx + 3] = Math.min(data[idx + 3], alpha)
      }
    }

    maskCtx.putImageData(imageData, 0, 0)
    return maskCanvas
  }

  const drawCutGuides = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    const mark = 10
    ctx.strokeStyle = 'rgba(80, 80, 80, 0.6)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])

    ctx.beginPath()
    ctx.moveTo(x, y + mark)
    ctx.lineTo(x, y)
    ctx.lineTo(x + mark, y)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(x + w - mark, y)
    ctx.lineTo(x + w, y)
    ctx.lineTo(x + w, y + mark)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(x + w, y + h - mark)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x + w - mark, y + h)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(x + mark, y + h)
    ctx.lineTo(x, y + h)
    ctx.lineTo(x, y + h - mark)
    ctx.stroke()

    ctx.setLineDash([])
  }

  const drawInnerCutLines = (ctx: CanvasRenderingContext2D, startX: number, startY: number, cols: number, rows: number, photoW: number, photoH: number) => {
    const totalW = cols * photoW + (cols - 1) * gapPx
    const totalH = rows * photoH + (rows - 1) * gapPx
    const right = startX + totalW
    const bottom = startY + totalH

    ctx.save()
    ctx.strokeStyle = 'rgba(120, 120, 120, 0.45)'
    ctx.lineWidth = 0.8
    ctx.setLineDash([3, 3])

    for (let col = 1; col < cols; col++) {
      const x = startX + col * photoW + (col - 0.5) * gapPx
      ctx.beginPath()
      ctx.moveTo(x, startY)
      ctx.lineTo(x, bottom)
      ctx.stroke()
    }

    for (let row = 1; row < rows; row++) {
      const y = startY + row * photoH + (row - 0.5) * gapPx
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.lineTo(right, y)
      ctx.stroke()
    }

    ctx.restore()
  }

  const renderCardFromSource = async (sourceDataUrl: string, openPreview: boolean, forPrint: boolean = false) => {
    const canvas = renderCanvasRef.current
    if (!canvas) return

    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = sourceDataUrl
      })

      const shouldExtractForeground = aiBackgroundRemoval || tileBackgroundMode !== 'none'
      const maskTolerance = tileBackgroundMode !== 'none' && !aiBackgroundRemoval ? Math.max(aiMaskTolerance, 55) : aiMaskTolerance
      const sourceNode = shouldExtractForeground ? removeBackgroundWithMask(img, maskTolerance, aiEdgeRefine) : img
      const sourceWidth = 'width' in sourceNode ? sourceNode.width : img.width
      const sourceHeight = 'height' in sourceNode ? sourceNode.height : img.height

      const paper = PAPER_INCH[paperSizeKey]
      const cardRotated = rotationDeg % 180 !== 0
      const paperW = Math.round((cardRotated ? paper.height : paper.width) * DPI)
      const paperH = Math.round((cardRotated ? paper.width : paper.height) * DPI)

      const origW = Math.round(paper.width * DPI)
      const origH = Math.round(paper.height * DPI)
      const photoW = cmToPx(activePhotoSize.widthCm)
      const photoH = cmToPx(activePhotoSize.heightCm)
      const isCard = ['pan', 'aadhar', 'dl', 'cm_health', 'pm_health'].includes(photoSizeKey)
      const useBatchFill = fillRemainingWithBatch && layoutCount !== 'auto' && batchImages.length > 1
      let { cols, rows, count } = computeGrid(origW, origH, photoW, photoH, useBatchFill ? 'auto' : undefined)

      if (isCard) {
        cols = 1
        rows = 2
        count = cardLayoutMode === 'single' ? 1 : 2
      }

      const slotSources: string[] = []

      if (isCard && cardLayoutMode === 'dual') {
        slotSources.push(sourceDataUrl)
        slotSources.push(sourceDataUrl)
      } else if (useBatchFill) {
        const repeatPerImage = Number(layoutCount)
        for (let index = activeBatchIndex; index < batchImages.length && slotSources.length < count; index++) {
          const slotImage = batchImages[index].dataUrl
          const remain = count - slotSources.length
          const repeats = Math.min(repeatPerImage, remain)
          for (let i = 0; i < repeats; i++) slotSources.push(slotImage)
        }
      }

      while (slotSources.length < count) slotSources.push(sourceDataUrl)

      const sourceCache = new Map<string, { node: CanvasImageSource; width: number; height: number }>()
      sourceCache.set(sourceDataUrl, { node: sourceNode, width: sourceWidth, height: sourceHeight })

      for (const dataUrl of slotSources) {
        if (sourceCache.has(dataUrl)) continue
        const slotImg = new Image()
        await new Promise<void>((resolve, reject) => {
          slotImg.onload = () => resolve()
          slotImg.onerror = reject
          slotImg.src = dataUrl
        })
        const slotNode = shouldExtractForeground ? removeBackgroundWithMask(slotImg, maskTolerance, aiEdgeRefine) : slotImg
        const slotW = 'width' in slotNode ? slotNode.width : slotImg.width
        const slotH = 'height' in slotNode ? slotNode.height : slotImg.height
        sourceCache.set(dataUrl, { node: slotNode, width: slotW, height: slotH })
      }

      canvas.width = paperW
      canvas.height = paperH
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = activeBackgroundColor
      ctx.fillRect(0, 0, paperW, paperH)

      ctx.save()
      if (rotationDeg !== 0) {
        ctx.translate(paperW / 2, paperH / 2)
        ctx.rotate((rotationDeg * Math.PI) / 180)
        ctx.translate(-origW / 2, -origH / 2)
      }

      if (showSafeArea) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)'
        ctx.lineWidth = 2
        ctx.setLineDash([10, 8])
        ctx.strokeRect(marginPx, marginPx, origW - marginPx * 2, origH - marginPx * 2)
        ctx.setLineDash([])
      }

      const startX = marginPx
      const startY = marginPx

      ctx.filter = getFilterString()
      for (let i = 0; i < count; i++) {
        const isCard = ['pan', 'aadhar', 'dl', 'cm_health', 'pm_health'].includes(photoSizeKey)

        if (isCard) {
          if (i === 0) {
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, paperW, paperH)
          }

          const cardX = (paperW - photoW) / 2
          const slotY = i === 0 ? 131 : 1031

          const slotSource = sourceCache.get(slotSources[i]) || sourceCache.get(sourceDataUrl)
          if (!slotSource) continue
          const slotNode = slotSource.node
          const slotWidth = slotSource.width
          const slotHeight = slotSource.height

          // Draw the card at 100% of the slot size (original image scale), centred within the slot
          const cardScale = 1.0
          const drawW = photoW * cardScale
          const drawH = photoH * cardScale
          const drawX = cardX + (photoW - drawW) / 2
          const drawY = slotY + (photoH - drawH) / 2

          ctx.save()
          if (photoEditor.sharpness > 0) {
            ctx.filter = `${getFilterString()} contrast(${100 + photoEditor.sharpness}%)`
          } else {
            ctx.filter = getFilterString()
          }

          if (cardBleed > 0) {
            // Create "extra image" bleed by drawing a slightly enlarged, blurred version 
            // of the card BEHIND the main crisp card. This creates a seamless color bleed
            // matching the card's edges, without enlarging the primary card content.
            ctx.save()
            ctx.filter = 'blur(6px)'
            const bleedW = drawW + cardBleed * 2
            const bleedH = drawH + cardBleed * 2
            ctx.drawImage(slotNode, 0, 0, slotWidth, slotHeight,
              drawX - cardBleed, drawY - cardBleed, bleedW, bleedH)
            ctx.restore()
          }

          // Draw the actual crisp image at exactly the correct scale on top
          ctx.drawImage(slotNode, 0, 0, slotWidth, slotHeight, drawX, drawY, drawW, drawH)
          ctx.restore()
          // Card Border (Rounded - Only in Preview)
          if (!forPrint) {
            ctx.strokeStyle = 'rgba(0,0,0,0.45)'
            ctx.lineWidth = 1
            drawRoundedRect(ctx, drawX, drawY, drawW, drawH, 20)
            ctx.stroke()
          }

          // Center cutting guide — draw once after last card slot
          if (cardLayoutMode === 'dual' && i === count - 1) {
            const midY = paperH / 2
            ctx.save()
            ctx.beginPath()
            ctx.moveTo(20, midY)
            ctx.lineTo(paperW - 20, midY)
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
            ctx.lineWidth = 3
            ctx.setLineDash([18, 12])
            ctx.stroke()
            ctx.setLineDash([])
            // Small scissor tick marks at ends
            ctx.lineWidth = 2
            ctx.setLineDash([])
            ctx.beginPath()
            ctx.moveTo(20, midY - 10); ctx.lineTo(20, midY + 10)
            ctx.moveTo(paperW - 20, midY - 10); ctx.lineTo(paperW - 20, midY + 10)
            ctx.stroke()
            ctx.restore()
          }

          continue
        }

        const row = i % rows
        const col = Math.floor(i / rows)
        const x = startX + col * (photoW + gapPx)
        const y = startY + row * (photoH + gapPx)

        // Photo Border (Frame)
        if (photoBorderWidth > 0) {
          ctx.strokeStyle = photoBorderColor
          ctx.lineWidth = photoBorderWidth
          ctx.strokeRect(x - photoBorderWidth / 2, y - photoBorderWidth / 2, photoW + photoBorderWidth, photoH + photoBorderWidth)
        }

        const slotSource = sourceCache.get(slotSources[i]) || sourceCache.get(sourceDataUrl)
        if (!slotSource) continue
        const slotNode = slotSource.node
        const slotWidth = slotSource.width
        const slotHeight = slotSource.height

        if (activeTileBackgroundColor) {
          ctx.fillStyle = activeTileBackgroundColor
          ctx.fillRect(x, y, photoW, photoH)
        }

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


        ctx.drawImage(slotNode, sx, sy, sw, sh, x, y, photoW, photoH)

        if (showCuttingMarks) {
          drawCutGuides(ctx, x, y, photoW, photoH)
          ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)'
          ctx.lineWidth = 1
          ctx.strokeRect(x - 2, y - 2, photoW + 4, photoH + 4)
        }
      }

      if (showCuttingMarks && count > 1 && !isCard) {
        drawInnerCutLines(ctx, startX, startY, cols, rows, photoW, photoH)
      }
      ctx.restore()
      ctx.filter = 'none'

      const dataUrl = canvas.toDataURL('image/png', 1)
      if (!forPrint) {
        setRenderedDataUrl(dataUrl)
        if (openPreview) {
          setShowPreview(true)
        }
      }
      return dataUrl
    } catch (err) {
      console.error(err)
      alert('Unable to generate output. Try another image.')
    }
  }

  const renderOutput = async () => {
    if (!uploadedImage) {
      alert('Please upload a photo first.')
      return
    }

    setIsRendering(true)
    try {
      await renderCardFromSource(uploadedImage, false)
    } finally {
      setIsRendering(false)
    }
  }

  // Automatic Real-time Layout Updates
  useEffect(() => {
    const handler = setTimeout(() => {
      if (step === 'layout' && uploadedImage) {
        renderOutput()
      }
    }, 250)
    return () => clearTimeout(handler)
  }, [
    step,
    uploadedImage,
    layoutCount,
    paperSizeKey,
    photoSizeKey,
    marginPx,
    gapPx,
    showCuttingMarks,
    showSafeArea,
    fillRemainingWithBatch,
    rotationDeg,
    activeBatchIndex,
    batchImages,
    cardLayoutMode,
    cardBleed
  ])

  const printRenderedPreview = async () => {
    if (!uploadedImage) return
    setIsRendering(true)
    try {
      const isCard = ['pan', 'aadhar', 'dl', 'cm_health', 'pm_health'].includes(photoSizeKey)
      // For cards, we generate a borderless version for print
      const printDataUrl = isCard ? await renderCardFromSource(uploadedImage, false, true) : renderedDataUrl

      if (!printDataUrl) return

      const frame = document.createElement('iframe')
      frame.style.position = 'fixed'
      frame.style.right = '0'
      frame.style.bottom = '0'
      frame.style.width = '0'
      frame.style.height = '0'
      frame.style.border = '0'
      document.body.appendChild(frame)

      const doc = frame.contentWindow?.document
      if (!doc) {
        document.body.removeChild(frame)
        return
      }

      doc.open()
      doc.write(`
        <html>
        <head>
          <title>Photo Card Print</title>
          <style>
            body { margin: 0; }
            img { width: 100%; display: block; }
          </style>
        </head>
        <body>
          <img src="${printDataUrl}" alt="Photo card" />
        </body>
        </html>
      `)
      doc.close()

      setTimeout(() => {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()
        setTimeout(() => {
          if (document.body.contains(frame)) document.body.removeChild(frame)
        }, 800)
      }, 250)
    } finally {
      setIsRendering(false)
    }
  }


  return (
    <div style={{ position: 'relative', width: '100%', minHeight: 'calc(100vh - 120px)' }}>
      {/* ------------------- */}
      {/* GLOBAL PDF OVERLAYS */}
      {/* ------------------- */}
      {isProcessingPdf && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 4000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>Processing e-PAN Document...</div>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>Decrypting and extracting card regions</p>
        </div>
      )}

      {showPasswordPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-dark)', padding: '24px', borderRadius: '20px', border: '1px solid var(--glass-border)', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <h3 style={{ color: 'white', margin: '0 0 16px' }}>
              {pdfType === 'aadhar' ? '🔐 Aadhaar PDF Password' : '🔐 PAN PDF Password'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
              {pdfType === 'aadhar'
                ? 'Password format: First 4 letters of your name in CAPITALS + Birth Year. Example: RAME1990'
                : 'Password format: Date of Birth in DDMMYYYY format. Example: 15031985'}
            </p>
            <input
              type="password"
              value={pdfPassword}
              onChange={(e) => setPdfPassword(e.target.value)}
              placeholder={pdfType === 'aadhar' ? 'e.g. RAME1990' : 'e.g. 15031985'}
              className="input-field"
              style={{ marginBottom: '20px', textAlign: 'center', letterSpacing: '0.1em' }}
              onKeyDown={(e) => e.key === 'Enter' && (pdfType === 'aadhar' ? processAadhaarPdf(pdfPassword) : processPanPdf(pdfPassword))}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setShowPasswordPrompt(false); setPendingPdfFile(null); }}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }}
                onClick={() => pdfType === 'aadhar' ? processAadhaarPdf(pdfPassword) : processPanPdf(pdfPassword)}
                disabled={isProcessingPdf}>
                {isProcessingPdf ? 'Processing...' : 'Unlock & Extract'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ------------------- */}
      {/* UPLOAD STEP VIEW    */}
      {/* ------------------- */}
      {step === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)', padding: '20px 40px', position: 'relative' }}>

          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,application/pdf,.pdf" multiple style={{ display: 'none' }} onChange={(e) => handleUploadMany(Array.from(e.target.files || []))} />

          <div style={{ textAlign: 'left', width: '100%', maxWidth: '860px', margin: '0 auto' }}>
            <style>{`
              @keyframes pasteGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(99,202,253,0); } 50% { box-shadow: 0 0 0 10px rgba(99,202,253,0.55); } }
              .doc-btn-active { animation: pasteGlow 1s ease-in-out infinite !important; outline: 2px dashed rgba(99,202,253,0.9) !important; }
            `}</style>

            <h3 style={{ color: 'var(--text-main)', fontSize: '18px', marginBottom: '16px', borderLeft: '4px solid var(--primary)', paddingLeft: '12px' }}>Standard Photos</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <button
                className={`btn-primary${hoveredBtn === 'passport' ? ' doc-btn-active' : ''}`}
                onClick={() => { setPhotoSizeKey('passport'); fileInputRef.current?.click(); }}
                onMouseEnter={() => setHoveredBtn('passport')}
                onMouseLeave={() => setHoveredBtn(null)}
                onDragOver={(e) => { e.preventDefault(); setHoveredBtn('passport') }}
                onDragLeave={() => setHoveredBtn(null)}
                onDrop={(e) => { e.preventDefault(); setHoveredBtn(null); setPhotoSizeKey('passport'); handleUploadMany(Array.from(e.dataTransfer.files || [])) }}
                style={documentButtonStyle}
              >
                <span style={{ fontSize: '32px' }}>🛂</span>
                <span style={{ fontSize: '16px', fontWeight: '700' }}>Passport / Stamp</span>
              </button>
            </div>

            <h3 style={{ color: 'var(--text-main)', fontSize: '18px', marginBottom: '16px', borderLeft: '4px solid #10b981', paddingLeft: '12px' }}>Identity Documents</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <button
                className={`btn-primary${hoveredBtn === 'pan' ? ' doc-btn-active' : ''}`}
                onClick={() => { setPhotoSizeKey('pan'); fileInputRef.current?.click(); }}
                onMouseEnter={() => setHoveredBtn('pan')}
                onMouseLeave={() => setHoveredBtn(null)}
                onDragOver={(e) => { e.preventDefault(); setHoveredBtn('pan') }}
                onDragLeave={() => setHoveredBtn(null)}
                onDrop={(e) => { e.preventDefault(); setHoveredBtn(null); setPhotoSizeKey('pan'); handleUploadMany(Array.from(e.dataTransfer.files || [])) }}
                style={{ ...documentButtonStyle, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 8px 20px rgba(5, 150, 105, 0.3)' }}
              >
                <span style={{ fontSize: '32px' }}>💳</span>
                <span style={{ fontSize: '16px', fontWeight: '700' }}>PAN Card</span>
              </button>

              <button
                className={`btn-primary${hoveredBtn === 'aadhar' ? ' doc-btn-active' : ''}`}
                onClick={() => { setPhotoSizeKey('aadhar'); setPdfType('aadhar'); fileInputRef.current?.click(); }}
                onMouseEnter={() => setHoveredBtn('aadhar')}
                onMouseLeave={() => setHoveredBtn(null)}
                onDragOver={(e) => { e.preventDefault(); setHoveredBtn('aadhar') }}
                onDragLeave={() => setHoveredBtn(null)}
                onDrop={(e) => { e.preventDefault(); setHoveredBtn(null); setPhotoSizeKey('aadhar'); setPdfType('aadhar'); handleUploadMany(Array.from(e.dataTransfer.files || [])) }}
                style={{ ...documentButtonStyle, background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', boxShadow: '0 8px 20px rgba(217, 119, 6, 0.3)' }}
              >
                <span style={{ fontSize: '32px' }}>🆔</span>
                <span style={{ fontSize: '16px', fontWeight: '700' }}>Aadhar Card</span>
              </button>

              <button
                className={`btn-primary${hoveredBtn === 'dl' ? ' doc-btn-active' : ''}`}
                onClick={() => { setPhotoSizeKey('dl'); fileInputRef.current?.click(); }}
                onMouseEnter={() => setHoveredBtn('dl')}
                onMouseLeave={() => setHoveredBtn(null)}
                onDragOver={(e) => { e.preventDefault(); setHoveredBtn('dl') }}
                onDragLeave={() => setHoveredBtn(null)}
                onDrop={(e) => { e.preventDefault(); setHoveredBtn(null); setPhotoSizeKey('dl'); handleUploadMany(Array.from(e.dataTransfer.files || [])) }}
                style={{ ...documentButtonStyle, background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', boxShadow: '0 8px 20px rgba(124, 58, 237, 0.3)' }}
              >
                <span style={{ fontSize: '32px' }}>🚗</span>
                <span style={{ fontSize: '16px', fontWeight: '700' }}>Driving Licence</span>
              </button>

              <button
                className={`btn-primary${hoveredBtn === 'cm_health' ? ' doc-btn-active' : ''}`}
                onClick={() => { setPhotoSizeKey('cm_health'); fileInputRef.current?.click(); }}
                onMouseEnter={() => setHoveredBtn('cm_health')}
                onMouseLeave={() => setHoveredBtn(null)}
                onDragOver={(e) => { e.preventDefault(); setHoveredBtn('cm_health') }}
                onDragLeave={() => setHoveredBtn(null)}
                onDrop={(e) => { e.preventDefault(); setHoveredBtn(null); setPhotoSizeKey('cm_health'); handleUploadMany(Array.from(e.dataTransfer.files || [])) }}
                style={{ ...documentButtonStyle, background: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)', boxShadow: '0 8px 20px rgba(219, 39, 119, 0.3)' }}
              >
                <span style={{ fontSize: '32px' }}>🏥</span>
                <span style={{ fontSize: '16px', fontWeight: '700' }}>CM Health Card</span>
              </button>

              <button
                className={`btn-primary${hoveredBtn === 'pm_health' ? ' doc-btn-active' : ''}`}
                onClick={() => { setPhotoSizeKey('pm_health'); fileInputRef.current?.click(); }}
                onMouseEnter={() => setHoveredBtn('pm_health')}
                onMouseLeave={() => setHoveredBtn(null)}
                onDragOver={(e) => { e.preventDefault(); setHoveredBtn('pm_health') }}
                onDragLeave={() => setHoveredBtn(null)}
                onDrop={(e) => { e.preventDefault(); setHoveredBtn(null); setPhotoSizeKey('pm_health'); handleUploadMany(Array.from(e.dataTransfer.files || [])) }}
                style={{ ...documentButtonStyle, background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)' }}
              >
                <span style={{ fontSize: '32px' }}>🏥</span>
                <span style={{ fontSize: '16px', fontWeight: '700' }}>PM Health Card</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                <button className="btn-secondary" style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }} onClick={() => setStep('upload')}>&larr; Back</button>
                <button className="btn-primary" style={{ padding: '6px 18px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }} onClick={() => setStep('layout')}>Done &rarr;</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', height: 'calc(100% - 70px)' }}>
              {/* Left Canvas Preview */}
              <div style={{ padding: '24px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <canvas ref={singlePreviewCanvasRef} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', borderRadius: '4px', background: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h10v10H0zm10 10h10v10H10z\' fill=\'%23f0f0f0\' fill-rule=\'evenodd\'/%3E%3C/svg%3E") #fff' }} />
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

                {/* Photo Size selection moved to Layout page */}


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
                  <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    <button className="btn-primary" style={{ ...compactButtonStyle, background: 'linear-gradient(135deg, #3d5afe 0%, #536dfe 100%)', fontWeight: 'bold', gridColumn: 'span 3', padding: '10px' }} onClick={applyClarity}>✨ Enhance Clarity (Auto)</button>
                    <button className="btn-secondary" style={compactButtonStyle} onClick={() => applyQualityPreset('normal')}>Reset</button>
                    <button className="btn-secondary" style={compactButtonStyle} onClick={applyAutoEnhance}>Auto</button>
                    <button className="btn-secondary" style={compactButtonStyle} onClick={applyFaceClarity}>Face</button>
                    <button className="btn-secondary" style={compactButtonStyle} onClick={applyWarmTone}>Warm Tone</button>
                    <button className="btn-secondary" style={compactButtonStyle} onClick={applyCoolTone}>Cool Tone</button>
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 10px', color: 'var(--text-main)', fontSize: '15px' }}>Background Masking</h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>Replace original background with color:</div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div
                      onClick={() => setTileBackgroundMode('white')}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'white', border: tileBackgroundMode === 'white' ? '2px solid var(--primary)' : '1px solid #ddd', cursor: 'pointer', transition: 'all 0.2s' }}
                      title="White Background"
                    />
                    <div
                      onClick={() => setTileBackgroundMode('blue')}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#007bff', border: tileBackgroundMode === 'blue' ? '2px solid var(--primary)' : '1px solid #ddd', cursor: 'pointer', transition: 'all 0.2s' }}
                      title="Blue Background"
                    />
                    <div
                      onClick={() => setTileBackgroundMode('none')}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: tileBackgroundMode === 'none' ? '2px solid var(--primary)' : '1px dashed #666', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Transparent"
                    >
                      <span style={{ fontSize: '10px', color: '#666' }}>❌</span>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input type="color" value={tileCustomBackgroundColor} onChange={(e) => { setTileCustomBackgroundColor(e.target.value); setTileBackgroundMode('custom') }} style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'none', cursor: 'pointer', borderRadius: '50%', overflow: 'hidden' }} />
                    </div>
                  </div>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e0e0e0', borderRadius: '12px', minHeight: '400px', border: '1px solid var(--glass-border)', overflow: 'hidden', padding: '20px', position: 'relative' }}>
                {isRendering && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
                    <div style={{ width: '30px', height: '30px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  </div>
                )}
                {renderedDataUrl ? (
                  <img src={renderedDataUrl} alt="Rendered photo card" style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 350px)', objectFit: 'contain', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', borderRadius: '4px' }} />
                ) : (
                  <div style={{ color: '#666', textAlign: 'center' }}>Generating preview...</div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }} onClick={() => setRotationDeg((prev) => (prev - 90 + 360) % 360)} title="Rotate Anticlockwise">🔄 Rotate</button>
                <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }} onClick={printRenderedPreview} disabled={!renderedDataUrl || isRendering}>🖨️ Print</button>
                <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }} onClick={() => setShowPreview(true)} disabled={!renderedDataUrl || isRendering}>👁️ View</button>
              </div>
            </div>
          </div>

          {/* Right Column: Layout Settings */}
          <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '8px' }}>
            {!['pan', 'aadhar', 'dl', 'cm_health', 'pm_health'].includes(photoSizeKey) && (
              <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
                <h3 style={{ margin: '0 0 12px', color: 'var(--text-main)', fontSize: '16px' }}>Photo Type / Size</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {Object.keys(PHOTO_SIZES_CM).map((k) => (
                    <button
                      key={k}
                      className={photoSizeKey === k ? 'btn-primary' : 'btn-secondary'}
                      style={{ ...compactButtonStyle, padding: '8px 4px' }}
                      onClick={() => setPhotoSizeKey(k as PhotoSizeKey)}
                    >
                      {PHOTO_SIZES_CM[k as keyof typeof PHOTO_SIZES_CM].label.split(' ')[0]}
                    </button>
                  ))}
                </div>
                {photoSizeKey === 'custom' && (
                  <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Width (cm)</span>
                      <input type="number" min={1} step={0.1} value={customWidthCm} onChange={(e) => setCustomWidthCm(Number(e.target.value) || 1)} className="input-field" style={{ padding: '6px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Height (cm)</span>
                      <input type="number" min={1} step={0.1} value={customHeightCm} onChange={(e) => setCustomHeightCm(Number(e.target.value) || 1)} className="input-field" style={{ padding: '6px' }} />
                    </div>
                  </div>
                )}
              </div>
            )}
            {['pan', 'aadhar', 'dl', 'cm_health', 'pm_health'].includes(photoSizeKey) && (
              <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
                <h3 style={{ margin: '0 0 16px', color: 'var(--text-main)', fontSize: '16px' }}>Card Layout Mode</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                  <button
                    className={cardLayoutMode === 'single' ? 'btn-primary' : 'btn-secondary'}
                    style={{ ...compactButtonStyle, padding: '12px 4px' }}
                    onClick={() => setCardLayoutMode('single')}
                  >
                    1 Card (Top)
                  </button>
                  <button
                    className={cardLayoutMode === 'dual' ? 'btn-primary' : 'btn-secondary'}
                    style={{ ...compactButtonStyle, padding: '12px 4px' }}
                    onClick={() => setCardLayoutMode('dual')}
                  >
                    2 Card (Same)
                  </button>
                </div>

                <h3 style={{ margin: '16px 0 12px', color: 'var(--text-main)', fontSize: '16px' }}>Card Tools</h3>
                <button
                  className="btn-primary"
                  style={{ padding: '12px', width: '100%', borderRadius: '8px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color: 'white', fontWeight: 'bold' }}
                  onClick={() => setCardBleed(prev => prev > 0 ? 0 : 40)}
                >
                  {cardBleed > 0 ? '- Remove Bleed Border' : '+ Extend Image Outside (Bleed)'}
                </button>
              </div>
            )}
            {!['pan', 'aadhar', 'dl', 'cm_health', 'pm_health'].includes(photoSizeKey) && (
              <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
                <h3 style={{ margin: '0 0 16px', color: 'var(--text-main)', fontSize: '16px' }}>Card Size & Grid</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <select
                    className="input-field"
                    value={paperSizeKey}
                    onChange={(e) => setPaperSizeKey(e.target.value as PaperSizeKey)}
                  >
                    {(Object.keys(PAPER_INCH) as PaperSizeKey[]).map((k) => (
                      <option key={k} value={k}>{PAPER_INCH[k].label}</option>
                    ))}
                  </select>
                  <select className="input-field" value={layoutCount} onChange={(e) => setLayoutCount(e.target.value === 'auto' ? 'auto' : Number(e.target.value) as LayoutCount)}>
                    <option value={4}>4 Photos (Eco Mode)</option>
                    <option value={8}>8 Photos (Full Sheet)</option>
                    <option value={12}>12 Photos</option>
                    <option value={16}>16 Photos</option>
                    <option value="auto">Auto-fit grid</option>
                  </select>
                </div>
                <label style={{ marginTop: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input type="checkbox" checked={fillRemainingWithBatch} onChange={(e) => setFillRemainingWithBatch(e.target.checked)} /> Fill remaining spaces with next batch photos
                </label>
              </div>
            )}

            <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
              <h3 style={{ margin: '0 0 16px', color: 'var(--text-main)', fontSize: '16px' }}>Photo Border</h3>
              <div style={{ color: 'var(--text-main)', display: 'grid', gap: '12px', fontSize: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Border Width</span><span>{photoBorderWidth}px</span></div>
                  <input type="range" min={0} max={15} value={photoBorderWidth} onChange={(e) => setPhotoBorderWidth(Number(e.target.value))} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Border Color</span>
                  <input type="color" value={photoBorderColor} onChange={(e) => setPhotoBorderColor(e.target.value)} style={{ width: '40px', height: '24px', padding: 0, border: 'none', background: 'none' }} />
                </div>
              </div>
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
