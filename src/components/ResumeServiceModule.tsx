import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// CDN libraries loaded dynamically — no npm install required
const JSZIP_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
const DOCX_PREVIEW_CDN = 'https://cdn.jsdelivr.net/npm/docx-preview@0.1.15/dist/docx-preview.min.js'
const DOCX_PREVIEW_CSS = 'https://cdn.jsdelivr.net/npm/docx-preview@0.1.15/dist/docx-preview.css'
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

const loadScript = (src: string): Promise<void> => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
  const s = document.createElement('script')
  s.src = src
  s.onload = () => resolve()
  s.onerror = () => reject(new Error(`Failed to load script: ${src}`))
  document.head.appendChild(s)
})

const loadStylesheet = (href: string): Promise<void> => new Promise((resolve, reject) => {
  if (document.querySelector(`link[href="${href}"]`)) { resolve(); return }
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.onload = () => resolve()
  link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`))
  document.head.appendChild(link)
})

type ResumeModuleKey =
  | 'resume-normal'
  | 'resume-first-year'
  | 'resume-fresher'
  | 'resume-experienced'
  | 'resume-labour'
  | 'resume-word-to-pdf'
  | 'resume-edit-pdf'
  | 'resume-edit-word-pdf'

type ResumeTheme = 'classic' | 'modern' | 'executive'
type EducationLayout = 'table' | 'cards'
type RelationType = 'Father' | 'Husband'
type GenderType = 'Male' | 'Female' | 'Other'

type EducationRow = {
  id: number
  qualification: string
  institution: string
  year: string
  score: string
}

type ExperienceRow = {
  id: number
  company: string
  designation: string
  duration: string
  responsibilities: string
}

type CustomField = {
  id: number
  label: string
  value: string
  type: 'text' | 'textarea'
}

type ResumeFormData = {
  fullName: string
  relationType: RelationType
  relationName: string
  dob: string
  gender: GenderType
  mobile: string
  email: string
  permanentAddress: string
  currentAddress: string
  objective: string
  skills: string
  projects: string
  additionalInfo: string
  place: string
  date: string
  signatureName: string
}

type SectionVisibility = {
  relation: boolean
  dob: boolean
  gender: boolean
  mobile: boolean
  email: boolean
  permanentAddress: boolean
  currentAddress: boolean
  objective: boolean
  education: boolean
  skills: boolean
  projects: boolean
  experience: boolean
  additionalInfo: boolean
  photo: boolean
}

type ResumeServiceModuleProps = {
  moduleKey: string
  serviceFee: number
  onBack: () => void
}

const moduleLabels: Record<ResumeModuleKey, string> = {
  'resume-normal': 'Normal / Professional Resume',
  'resume-first-year': '1st Year Student Resume',
  'resume-fresher': 'College Student / Fresher Resume',
  'resume-experienced': 'Experienced / Working Professional Resume',
  'resume-labour': 'Uneducated / Labor Resume',
  'resume-word-to-pdf': 'Upload Word -> Convert to PDF',
  'resume-edit-pdf': 'Edit Existing PDF Resume',
  'resume-edit-word-pdf': 'Edit Existing Word Resume + Convert to PDF'
}

const themeLabel: Record<ResumeTheme, string> = {
  classic: 'Classic',
  modern: 'Modern',
  executive: 'Executive'
}

const themePalette: Record<ResumeTheme, string[]> = {
  classic: ['#1f2937', '#0f766e', '#0f172a'],
  modern: ['#0ea5e9', '#2563eb', '#0f172a'],
  executive: ['#7c2d12', '#374151', '#111827']
}

const createInitialEducationRows = (): EducationRow[] => ([
  { id: 1, qualification: '', institution: '', year: '', score: '' }
])

const createInitialExperienceRows = (): ExperienceRow[] => ([
  { id: 1, company: '', designation: '', duration: '', responsibilities: '' }
])

const createInitialFormData = (): ResumeFormData => ({
  fullName: '',
  relationType: 'Father',
  relationName: '',
  dob: '',
  gender: 'Male',
  mobile: '',
  email: '',
  permanentAddress: '',
  currentAddress: '',
  objective: '',
  skills: '',
  projects: '',
  additionalInfo: '',
  place: '',
  date: new Date().toISOString().split('T')[0],
  signatureName: ''
})

const createDefaultVisibility = (): SectionVisibility => ({
  relation: true,
  dob: true,
  gender: true,
  mobile: true,
  email: true,
  permanentAddress: true,
  currentAddress: true,
  objective: true,
  education: true,
  skills: true,
  projects: true,
  experience: true,
  additionalInfo: true,
  photo: true
})

const toDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result || ''))
  reader.onerror = reject
  reader.readAsDataURL(file)
})

const CURRENT_YEAR = 2026

const validateYear = (year: string): string => {
  if (!year) return year
  const parts = year.split('-')
  const validated = parts.map(part => {
    const num = parseInt(part, 10)
    if (isNaN(num)) return part
    // Ensure year doesn't exceed current year and is reasonable (after 1900)
    if (num > CURRENT_YEAR) return String(CURRENT_YEAR)
    if (num < 1900) return '1900'
    return String(num)
  })
  return validated.join('-')
}

const formatDateDDMMYYYY = (value: string) => {
  if (!value) return '---'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}-${month}-${year}`
}

const normalizeYearRange = (value: string) => {
  const normalized = value.replace(/[^\d-]/g, '').slice(0, 9)
  return validateYear(normalized)
}

const getModuleDefaults = (key: ResumeModuleKey) => {
  if (key === 'resume-first-year') {
    return {
      theme: 'modern' as ResumeTheme,
      objective: 'Motivated first-year student looking to build practical skills and gain internship exposure.',
      skills: 'Basic computer skills\nMS Word\nCommunication\nTeam collaboration',
      projects: 'Mini project: Add a short note about your coursework or mini assignment.',
      additionalInfo: 'Languages: Tamil, English\nHobbies: Reading, Sports',
      visibility: { ...createDefaultVisibility(), experience: false }
    }
  }

  if (key === 'resume-fresher') {
    return {
      theme: 'modern' as ResumeTheme,
      objective: 'Entry-level graduate seeking opportunities to apply academic knowledge and project experience in a growth-focused team.',
      skills: 'Problem solving\nPowerPoint\nExcel\nBasic coding / domain skills',
      projects: 'Final-year project: Write your project title, tools used, and result in 3-4 lines.',
      additionalInfo: 'Certifications: Add if available\nLanguages: Tamil, English',
      visibility: { ...createDefaultVisibility(), experience: false }
    }
  }

  if (key === 'resume-experienced') {
    return {
      theme: 'executive' as ResumeTheme,
      objective: 'Results-oriented professional with practical experience in delivering business targets, team collaboration, and process improvements.',
      skills: 'Team leadership\nClient communication\nReporting\nDomain expertise',
      projects: '',
      additionalInfo: 'Achievements: Mention key outcomes with numbers where possible.',
      visibility: { ...createDefaultVisibility(), projects: false }
    }
  }

  if (key === 'resume-labour') {
    return {
      theme: 'classic' as ResumeTheme,
      objective: 'Hardworking labor worker looking for stable work in construction, warehouse, helper, loading/unloading, or field jobs.',
      skills: 'Physical stamina\nPunctual and reliable\nTeam support\nBasic tools handling',
      projects: '',
      additionalInfo: 'Available for full-time/shift work.\nCan relocate if required.',
      visibility: {
        ...createDefaultVisibility(),
        relation: false,
        email: false,
        currentAddress: false,
        projects: false,
        education: false,
        experience: true
      }
    }
  }

  return {
    theme: 'classic' as ResumeTheme,
    objective: 'Dedicated candidate seeking an opportunity to contribute skills and grow professionally in a responsible role.',
    skills: 'Communication\nComputer basics\nTime management\nTeamwork',
    projects: 'Add project details if relevant.',
    additionalInfo: 'Languages, interests, certifications and other strengths.',
    visibility: createDefaultVisibility()
  }
}

const ResumeServiceModule = ({ moduleKey, serviceFee, onBack }: ResumeServiceModuleProps) => {
  const typedModuleKey = (Object.prototype.hasOwnProperty.call(moduleLabels, moduleKey)
    ? moduleKey
    : 'resume-normal') as ResumeModuleKey

  const previewRef = useRef<HTMLDivElement | null>(null)
  const [photoData, setPhotoData] = useState('')
  const [theme, setTheme] = useState<ResumeTheme>('classic')
  const [accentColor, setAccentColor] = useState(themePalette.classic[0])
  const [educationLayout, setEducationLayout] = useState<EducationLayout>('table')
  const [sectionVisibility, setSectionVisibility] = useState<SectionVisibility>(createDefaultVisibility())
  const [formData, setFormData] = useState<ResumeFormData>(createInitialFormData())
  const [educationRows, setEducationRows] = useState<EducationRow[]>(createInitialEducationRows())
  const [experienceRows, setExperienceRows] = useState<ExperienceRow[]>(createInitialExperienceRows())
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [showPreview, setShowPreview] = useState(false)
  // Document utility module state
  const [docBlob, setDocBlob] = useState<Blob | null>(null)
  const [pdfPages, setPdfPages] = useState<string[]>([])
  const [isParsingDoc, setIsParsingDoc] = useState(false)
  const [parseError, setParseError] = useState('')
  const [originalFileUrl, setOriginalFileUrl] = useState('')
  const moduleTitle = moduleLabels[typedModuleKey]
  const isBuilderModule = !typedModuleKey.includes('word-to-pdf') && !typedModuleKey.includes('edit-pdf') && !typedModuleKey.includes('edit-word-pdf')
  const showProjectsByType = typedModuleKey === 'resume-first-year' || typedModuleKey === 'resume-fresher'

  useEffect(() => {
    const defaults = getModuleDefaults(typedModuleKey)
    setTheme(defaults.theme)
    setAccentColor(themePalette[defaults.theme][0])
    setSectionVisibility(defaults.visibility)
    setFormData(prev => ({
      ...prev,
      objective: defaults.objective,
      skills: defaults.skills,
      projects: defaults.projects,
      additionalInfo: defaults.additionalInfo
    }))
    setEducationLayout(typedModuleKey === 'resume-first-year' || typedModuleKey === 'resume-fresher' ? 'cards' : 'table')
  }, [typedModuleKey])

  // Render the Word document using docx-preview when showPreview is active
  useEffect(() => {
    if ((typedModuleKey === 'resume-word-to-pdf' || typedModuleKey === 'resume-edit-word-pdf') && showPreview && previewRef.current && docBlob) {
      const renderDoc = async () => {
        try {
          const docx = (window as any).docx
          if (!docx) return

          previewRef.current!.innerHTML = ''

          await docx.renderAsync(docBlob, previewRef.current, null, {
            inWrapper: false,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true,
            useBase64URL: true
          })

          if (typedModuleKey === 'resume-edit-word-pdf') {
            const sections = previewRef.current!.querySelectorAll('section.docx')
            sections.forEach((sec: any) => {
              sec.contentEditable = 'true'
              sec.style.outline = '1px dashed rgba(99, 102, 241, 0.4)'
              sec.style.cursor = 'text'
            })
          }
        } catch (err) {
          console.error('docx-preview render error:', err)
        }
      }
      renderDoc()
    }
  }, [docBlob, showPreview, typedModuleKey])

  const updateFormData = (key: keyof ResumeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const updateEducationRow = (id: number, key: keyof Omit<EducationRow, 'id'>, value: string) => {
    setEducationRows(prev => prev.map(row => (row.id === id ? { ...row, [key]: value } : row)))
  }

  const updateExperienceRow = (id: number, key: keyof Omit<ExperienceRow, 'id'>, value: string) => {
    setExperienceRows(prev => prev.map(row => (row.id === id ? { ...row, [key]: value } : row)))
  }

  const addEducationRow = () => {
    setEducationRows(prev => [...prev, {
      id: Date.now(),
      qualification: '',
      institution: '',
      boardOrUniversity: '',
      year: '',
      score: ''
    }])
  }

  const addExperienceRow = () => {
    setExperienceRows(prev => [...prev, {
      id: Date.now(),
      company: '',
      designation: '',
      duration: '',
      responsibilities: ''
    }])
  }

  const removeEducationRow = (id: number) => {
    setEducationRows(prev => (prev.length > 1 ? prev.filter(row => row.id !== id) : prev))
  }

  const removeExperienceRow = (id: number) => {
    setExperienceRows(prev => (prev.length > 1 ? prev.filter(row => row.id !== id) : prev))
  }

  const toggleSection = (key: keyof SectionVisibility) => {
    setSectionVisibility(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const data = await toDataUrl(file)
    setPhotoData(data)
  }

  // Parse a .docx Word file using docx-preview (loaded from CDN)
  const parseWordFile = async (file: File) => {
    setIsParsingDoc(true)
    setParseError('')
    setDocBlob(null)
    try {
      await loadScript(JSZIP_CDN)
      await loadStylesheet(DOCX_PREVIEW_CSS)
      await loadScript(DOCX_PREVIEW_CDN)
      const docx = (window as any).docx
      if (!docx) throw new Error('docx-preview library not loaded')
      setDocBlob(file)
    } catch (_err) {
      setParseError('Failed to read Word file. Please check your internet connection or ensure it is a valid .docx file.')
    } finally {
      setIsParsingDoc(false)
    }
  }

  // Render all PDF pages to canvas images using pdf.js (loaded from CDN)
  const renderPdfPages = async (file: File) => {
    setIsParsingDoc(true)
    setParseError('')
    setPdfPages([])
    if (originalFileUrl) URL.revokeObjectURL(originalFileUrl)
    setOriginalFileUrl(URL.createObjectURL(file))
    try {
      await loadScript(PDFJS_CDN)
      const pdfjs = (window as any).pdfjsLib
      if (!pdfjs) throw new Error('PDF.js not loaded')
      pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise
      const pages: string[] = []
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport }).promise
        pages.push(canvas.toDataURL('image/png'))
      }
      setPdfPages(pages)
    } catch (_err) {
      setParseError('Failed to render PDF. The file may be corrupted or password-protected.')
    } finally {
      setIsParsingDoc(false)
    }
  }

  const handleDocumentUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadedFileName(file.name)
    setDocBlob(null)
    setPdfPages([])
    setParseError('')
    if (typedModuleKey === 'resume-word-to-pdf' || typedModuleKey === 'resume-edit-word-pdf') {
      parseWordFile(file)
    } else if (typedModuleKey === 'resume-edit-pdf') {
      renderPdfPages(file)
    }
  }

  const getPreviewHtmlDocument = () => {
    const content = previewRef.current?.outerHTML || ''
    const styles = `
      <style>
        body { margin: 0; font-family: Calibri, Arial, sans-serif; background: #f4f4f5; }
        .resume-a4-sheet { width: 210mm; min-height: 297mm; box-sizing: border-box; margin: 0 auto; background: #fff; color: #111; position: relative; }
        .resume-heading { text-transform: uppercase; letter-spacing: 0.08em; margin: 0; }
        .resume-section-title { font-weight: 700; text-transform: uppercase; border-bottom: 1px solid var(--resume-accent); margin: 12px 0 8px; padding-bottom: 3px; font-size: 12px; color: var(--resume-accent); }
        table { border-collapse: collapse; width: 100%; font-size: 11px; }
        table th, table td { border: 1px solid #b9b9b9; padding: 6px; text-align: left; vertical-align: top; }
      </style>
      <link rel="stylesheet" href="${DOCX_PREVIEW_CSS}" />
    `

    return `<!doctype html><html><head><meta charset="utf-8" />${styles}</head><body>${content}</body></html>`
  }

  const printPreview = () => {
    const html = getPreviewHtmlDocument()
    const printWindow = window.open('', '_blank', 'width=1000,height=900')
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to print.')
      return
    }

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const downloadPdf = async () => {
    if (typedModuleKey === 'resume-edit-pdf') {
      if (pdfPages.length === 0) return
      setIsPdfGenerating(true)
      try {
        const pdf = new jsPDF('p', 'mm', 'a4')
        for (let i = 0; i < pdfPages.length; i++) {
          const imgData = pdfPages[i]
          const pdfWidth = pdf.internal.pageSize.getWidth()
          const pdfHeight = pdf.internal.pageSize.getHeight()
          if (i > 0) {
            pdf.addPage()
          }
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, '', 'FAST')
        }
        pdf.save(`${uploadedFileName || 'document'}.pdf`)
      } catch (err) {
        console.error('Error generating PDF:', err)
        alert('Failed to generate PDF.')
      } finally {
        setIsPdfGenerating(false)
      }
      return
    }

    if (typedModuleKey === 'resume-word-to-pdf' || typedModuleKey === 'resume-edit-word-pdf') {
      if (!previewRef.current) return
      const sections = previewRef.current.querySelectorAll('section.docx')
      if (sections.length === 0) {
        alert('No document pages found to export.')
        return
      }
      setIsPdfGenerating(true)
      try {
        // Temporarily hide editable outlines
        sections.forEach((sec: any) => {
          sec.style.outline = 'none'
        })

        const pdf = new jsPDF('p', 'mm', 'a4')
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i] as HTMLElement
          const canvas = await html2canvas(section, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
          })
          const imgData = canvas.toDataURL('image/png')
          const pdfWidth = pdf.internal.pageSize.getWidth()
          const pdfHeight = pdf.internal.pageSize.getHeight()
          if (i > 0) {
            pdf.addPage()
          }
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, '', 'FAST')
        }

        // Restore outlines if editable
        if (typedModuleKey === 'resume-edit-word-pdf') {
          sections.forEach((sec: any) => {
            sec.style.outline = '1px dashed rgba(99, 102, 241, 0.4)'
          })
        }

        pdf.save(`${uploadedFileName || 'document'}.pdf`)
      } catch (err) {
        console.error('Error generating PDF:', err)
        alert('Failed to generate PDF.')
      } finally {
        setIsPdfGenerating(false)
      }
      return
    }

    // Default builder download logic
    if (!previewRef.current) return
    setIsPdfGenerating(true)
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imageHeight = (canvas.height * pdfWidth) / canvas.width

      let heightLeft = imageHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imageHeight, '', 'FAST')
      heightLeft -= pdfHeight

      while (heightLeft > 0) {
        position = heightLeft - imageHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imageHeight, '', 'FAST')
        heightLeft -= pdfHeight
      }

      pdf.save(`${moduleTitle.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error('Error generating PDF:', err)
    } finally {
      setIsPdfGenerating(false)
    }
  }

  const addCustomField = () => {
    setCustomFields(prev => [...prev, {
      id: Date.now(),
      label: 'Custom Field',
      value: '',
      type: 'text'
    }])
  }

  const updateCustomField = (id: number, key: keyof Omit<CustomField, 'id'>, value: string) => {
    setCustomFields(prev => prev.map(field => (field.id === id ? { ...field, [key]: value } : field)))
  }

  const removeCustomField = (id: number) => {
    setCustomFields(prev => prev.filter(field => field.id !== id))
  }

  return (
    <div className="resume-module-view">
      <button className="back-btn" onClick={onBack} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Back to Resume Ad Modules
      </button>

      <div className="tn-police-header" style={{ borderColor: 'rgba(14, 165, 164, 0.35)', marginBottom: '12px' }}>
        <div style={{ padding: '12px', background: 'rgba(14, 165, 164, 0.1)', borderRadius: '12px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 13h6" /><path d="M9 17h6" /><path d="M9 9h1" /></svg>
        </div>
        <div>
          <h3 style={{color: 'var(--text-main)', margin: 0 }}>{moduleTitle}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>
            Live A4 editor with section toggles, theme options, print and PDF export.
          </p>
        </div>
      </div>

      {serviceFee > 0 && (
        <div className="service-fee-pill">Service charge: Rs {serviceFee.toFixed(2)}</div>
      )}

      <div className="resume-builder-layout" style={{ display: 'block' }}>
        {!showPreview ? (
          <div className="resume-editor-pane glass-card" style={{ maxWidth: 'none', margin: '0 auto', maxHeight: 'none' }}>
            {isBuilderModule ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{margin: 0 }}>Profile Editor</h4>
                  <button className="btn-primary" onClick={() => setShowPreview(true)}>👁️ Preview & Download</button>
                </div>

              <div className="resume-two-col">
                <div className="form-group">
                  <label className="form-label">Theme</label>
                  <select className="input-field" value={theme} onChange={(e) => {
                    const next = e.target.value as ResumeTheme
                    setTheme(next)
                    setAccentColor(themePalette[next][0])
                  }}>
                    {Object.entries(themeLabel).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Accent Color</label>
                  <select className="input-field" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}>
                    {themePalette[theme].map((color) => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="resume-two-col">
                <div className="form-group">
                  <label className="form-label">Education Structure</label>
                  <select className="input-field" value={educationLayout} onChange={(e) => setEducationLayout(e.target.value as EducationLayout)}>
                    <option value="table">Table Layout</option>
                    <option value="cards">Card Layout</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Optional Photo</label>
                  <input type="file" accept="image/*" className="input-field" onChange={handlePhotoUpload} />
                </div>
              </div>

              <div className="resume-toggle-grid">
                {Object.entries(sectionVisibility).map(([key, value]) => (
                  <label key={key} className="resume-toggle-item">
                    <input type="checkbox" checked={value} onChange={() => toggleSection(key as keyof SectionVisibility)} />
                    <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</span>
                  </label>
                ))}
              </div>

              <div className="resume-two-col">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="input-field" value={formData.fullName} onChange={(e) => updateFormData('fullName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth (YYYY-MM-DD)</label>
                  <input type="date" className="input-field" value={formData.dob} max={new Date().toISOString().split('T')[0]} onChange={(e) => updateFormData('dob', e.target.value)} />
                </div>
              </div>

              <div className="resume-two-col">
                <div className="form-group">
                  <label className="form-label">Relation Type</label>
                  <select className="input-field" value={formData.relationType} onChange={(e) => updateFormData('relationType', e.target.value)}>
                    <option value="Father">Father</option>
                    <option value="Husband">Husband</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Father's Name / Husband's Name</label>
                  <input className="input-field" value={formData.relationName} onChange={(e) => updateFormData('relationName', e.target.value)} />
                </div>
              </div>

              <div className="resume-two-col">
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="input-field" value={formData.gender} onChange={(e) => updateFormData('gender', e.target.value)}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input className="input-field" maxLength={10} value={formData.mobile} onChange={(e) => updateFormData('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email ID</label>
                <input className="input-field" value={formData.email} onChange={(e) => updateFormData('email', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Permanent Address</label>
                <textarea className="input-field" rows={2} value={formData.permanentAddress} onChange={(e) => updateFormData('permanentAddress', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Current Address</label>
                <textarea className="input-field" rows={2} value={formData.currentAddress} onChange={(e) => updateFormData('currentAddress', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Career Objective / Summary</label>
                <textarea className="input-field" rows={3} value={formData.objective} onChange={(e) => updateFormData('objective', e.target.value)} />
              </div>

              <h4 style={{margin: '8px 0 0' }}>Education</h4>
              <p className="p" style={{ fontSize: '12px', marginTop: 0 }}>
                Year format: YYYY or YYYY-YYYY (example: 2024 or 2022-2024)
              </p>
              {educationRows.map((row) => (
                <div key={row.id} className="resume-row-card">
                  <div className="resume-two-col">
                    <div className="form-group">
                      <label className="form-label">Qualification</label>
                      <input className="input-field" value={row.qualification} onChange={(e) => updateEducationRow(row.id, 'qualification', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Institution Name</label>
                      <input className="input-field" value={row.institution} onChange={(e) => updateEducationRow(row.id, 'institution', e.target.value)} />
                    </div>
                  </div>
                  <div className="resume-three-col">

                    <div className="form-group">
                      <label className="form-label">Year</label>
                      <input className="input-field" placeholder="YYYY or YYYY-YYYY" value={row.year} onChange={(e) => updateEducationRow(row.id, 'year', normalizeYearRange(e.target.value))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CGPA / Percentage / Marks</label>
                      <input className="input-field" value={row.score} onChange={(e) => updateEducationRow(row.id, 'score', e.target.value)} />
                    </div>
                  </div>
                  <button className="btn-primary" style={{ background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)' }} onClick={() => removeEducationRow(row.id)}>
                    Remove Education Row
                  </button>
                </div>
              ))}
              <button className="btn-primary" onClick={addEducationRow}>Add Education Row</button>

              <div className="form-group">
                <label className="form-label">Skills (including computer skills)</label>
                <textarea className="input-field" rows={3} value={formData.skills} onChange={(e) => updateFormData('skills', e.target.value)} />
              </div>

              {showProjectsByType && (
                <div className="form-group">
                  <label className="form-label">Projects / Internship</label>
                  <textarea className="input-field" rows={3} value={formData.projects} onChange={(e) => updateFormData('projects', e.target.value)} />
                </div>
              )}

              <h4 style={{margin: '8px 0 0' }}>Experience</h4>
              {experienceRows.map((row) => (
                <div key={row.id} className="resume-row-card">
                  <div className="resume-three-col">
                    <div className="form-group">
                      <label className="form-label">Company Name</label>
                      <input className="input-field" value={row.company} onChange={(e) => updateExperienceRow(row.id, 'company', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Designation</label>
                      <input className="input-field" value={row.designation} onChange={(e) => updateExperienceRow(row.id, 'designation', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Duration (From-To)</label>
                      <input className="input-field" value={row.duration} onChange={(e) => updateExperienceRow(row.id, 'duration', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Key Responsibilities / Achievements</label>
                    <textarea className="input-field" rows={3} value={row.responsibilities} onChange={(e) => updateExperienceRow(row.id, 'responsibilities', e.target.value)} />
                  </div>
                  <button className="btn-primary" style={{ background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)' }} onClick={() => removeExperienceRow(row.id)}>
                    Remove Experience Row
                  </button>
                </div>
              ))}
              <button className="btn-primary" onClick={addExperienceRow}>Add Experience Row</button>

              <div className="form-group">
                <label className="form-label">Additional Information</label>
                <textarea className="input-field" rows={3} value={formData.additionalInfo} onChange={(e) => updateFormData('additionalInfo', e.target.value)} placeholder="Languages, hobbies, achievements, certifications, etc." />
              </div>

              <h4 style={{margin: '8px 0 0' }}>Custom Fields (Optional)</h4>
              {customFields.map((field) => (
                <div key={field.id} className="resume-row-card">
                  <div className="resume-two-col">
                    <div className="form-group">
                      <label className="form-label">Field Label</label>
                      <input className="input-field" placeholder="e.g., Certifications, Awards" value={field.label} onChange={(e) => updateCustomField(field.id, 'label', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Field Type</label>
                      <select className="input-field" value={field.type} onChange={(e) => updateCustomField(field.id, 'type', e.target.value as 'text' | 'textarea')}>
                        <option value="text">Single Line</option>
                        <option value="textarea">Multi-line</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Content</label>
                    {field.type === 'textarea' ? (
                      <textarea className="input-field" rows={3} value={field.value} onChange={(e) => updateCustomField(field.id, 'value', e.target.value)} placeholder="Enter field content..." />
                    ) : (
                      <input className="input-field" value={field.value} onChange={(e) => updateCustomField(field.id, 'value', e.target.value)} placeholder="Enter field content..." />
                    )}
                  </div>
                  <button className="btn-primary" style={{ background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)' }} onClick={() => removeCustomField(field.id)}>
                    Remove Custom Field
                  </button>
                </div>
              ))}
              <button className="btn-primary" onClick={addCustomField}>➕ Add Custom Field</button>

              <div className="resume-two-col">
                <div className="form-group">
                  <label className="form-label">Place</label>
                  <input className="input-field" value={formData.place} onChange={(e) => updateFormData('place', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="input-field" value={formData.date} onChange={(e) => updateFormData('date', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Signature Name</label>
                <input className="input-field" value={formData.signatureName} onChange={(e) => updateFormData('signatureName', e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{margin: 0 }}>Document Assistant</h4>
                <button
                  className="btn-primary"
                  onClick={() => setShowPreview(true)}
                  disabled={!uploadedFileName || isParsingDoc}
                  style={(!uploadedFileName || isParsingDoc) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  👁️ Preview &amp; Download
                </button>
              </div>
              <p className="p" style={{ margin: '0 0 14px', fontSize: '13px' }}>
                {typedModuleKey === 'resume-word-to-pdf' && 'Upload a Word (.docx) file — it will be parsed and rendered as a printable A4 PDF.'}
                {typedModuleKey === 'resume-edit-pdf' && 'Upload a PDF file — all pages will be rendered so you can view and download it.'}
                {typedModuleKey === 'resume-edit-word-pdf' && 'Upload a Word (.docx) file — content is extracted and made directly editable in the A4 preview.'}
              </p>
              <div className="form-group">
                <label className="form-label">
                  {typedModuleKey === 'resume-edit-pdf' ? 'Upload PDF file' : 'Upload Word (.docx) file'}
                </label>
                <input
                  type="file"
                  className="input-field"
                  accept={typedModuleKey === 'resume-word-to-pdf' || typedModuleKey === 'resume-edit-word-pdf' ? '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document' : '.pdf,application/pdf'}
                  onChange={handleDocumentUpload}
                />
              </div>

              {isParsingDoc && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', marginTop: '12px' }}>
                  <div style={{ width: '18px', height: '18px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    {typedModuleKey === 'resume-edit-pdf' ? 'Rendering PDF pages… this may take a moment for large files.' : 'Parsing Word document…'}
                  </span>
                </div>
              )}

              {parseError && (
                <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>
                  ⚠️ {parseError}
                </div>
              )}

              {!isParsingDoc && uploadedFileName && !parseError && (
                <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', color: '#10b981', fontSize: '13px', marginTop: '12px' }}>
                  ✅ <strong>{uploadedFileName}</strong> loaded successfully.
                  {typedModuleKey === 'resume-edit-pdf' && pdfPages.length > 0 && ` ${pdfPages.length} page(s) rendered.`}
                  {(typedModuleKey === 'resume-word-to-pdf' || typedModuleKey === 'resume-edit-word-pdf') && docBlob && ' Content extracted.'}
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px', fontSize: '12px' }}>
                    Click &quot;Preview &amp; Download&quot; above to continue.
                    {typedModuleKey === 'resume-edit-word-pdf' && ' You can edit the content directly in the preview panel.'}
                  </span>
                </div>
              )}
            </>
          )}
          </div>
        ) : (
          <div className="resume-preview-pane" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="resume-preview-toolbar" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <button className="btn-primary" onClick={() => setShowPreview(false)}>⬅️ Back to Editor</button>
              <button
                className="btn-primary"
                disabled={isPdfGenerating}
                onClick={downloadPdf}
              >
                {isPdfGenerating ? '⏳ Saving PDF...' : '📥 Download PDF'}
              </button>
              <button className="btn-primary" onClick={printPreview}>🖨️ Print</button>
            </div>

            <div className="resume-sheet-scroll">
              {/* External source file status metadata for the preview panel */}
              {docBlob && (
                <div style={{ maxWidth: '800px', margin: '0 auto 12px', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                    📄 Source: <strong>{uploadedFileName}</strong>
                  </span>
                  {typedModuleKey === 'resume-edit-word-pdf' && (
                    <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: '500' }}>
                      ✏️ Click any text on the pages below to edit
                    </span>
                  )}
                </div>
              )}

              <div
                className={`resume-a4-sheet resume-theme-${theme}`}
                ref={previewRef}
                style={{
                  '--resume-accent': accentColor,
                  // Allow auto height and transparent styling for PDF and Word viewers so they render their own pages correctly
                  ...((typedModuleKey === 'resume-edit-pdf' || typedModuleKey === 'resume-word-to-pdf' || typedModuleKey === 'resume-edit-word-pdf') ? { minHeight: 'auto', height: 'auto', background: 'transparent', padding: '0', boxShadow: 'none' } : {})
                } as CSSProperties}
              >
              {isBuilderModule && <div className="resume-watermark">{moduleTitle}</div>}
              {isBuilderModule ? (
                <>
                  <div className="resume-header">
                    <div>
                      <h1 className="resume-heading">{formData.fullName || 'Your Name'}</h1>
                    </div>
                    {sectionVisibility.photo && photoData ? (
                      <img src={photoData} alt="Profile" className="resume-photo" />
                    ) : null}
                  </div>

                  <div className="resume-section-title">Personal Details</div>
                  <div className="resume-detail-grid">
                    {sectionVisibility.relation && <p><strong>{formData.relationType} Name:</strong> {formData.relationName || '---'}</p>}
                    {sectionVisibility.dob && <p><strong>Date of Birth:</strong> {formatDateDDMMYYYY(formData.dob)}</p>}
                    {sectionVisibility.gender && <p><strong>Gender:</strong> {formData.gender || '---'}</p>}
                    {sectionVisibility.mobile && <p><strong>Mobile:</strong> {formData.mobile || '---'}</p>}
                    {sectionVisibility.email && <p><strong>Email:</strong> {formData.email || '---'}</p>}
                  </div>
                  {sectionVisibility.permanentAddress && <p><strong>Permanent Address:</strong> {formData.permanentAddress || '---'}</p>}
                  {sectionVisibility.currentAddress && <p><strong>Current Address:</strong> {formData.currentAddress || '---'}</p>}

                  {sectionVisibility.objective && (
                    <>
                      <div className="resume-section-title">Objective / Summary</div>
                      <p>{formData.objective || 'Add a short summary here.'}</p>
                    </>
                  )}

                  {sectionVisibility.education && (
                    <>
                      <div className="resume-section-title">Education</div>
                      {educationLayout === 'table' ? (
                        <table>
                          <thead>
                            <tr>
                              <th style={{ width: '6%' }}>S.No</th>
                              <th style={{ width: '17%' }}>Qualification</th>
                              <th style={{ width: '26%' }}>Institution Name</th>
                              <th style={{ width: '26%' }}>Year</th>
                              <th style={{ width: '25%' }}>CGPA / Percentage / Marks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {educationRows.map((row, index) => (
                              <tr key={row.id}>
                                <td>{index + 1}</td>
                                <td>{row.qualification || '-'}</td>
                                <td>{row.institution || '-'}</td>
                                <td>{row.year || '-'}</td>
                                <td>{row.score || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="resume-education-cards">
                          {educationRows.map((row, index) => (
                            <div key={row.id} className="resume-education-card">
                              <p><strong>{index + 1}. Qualification:</strong> {row.qualification || '-'}</p>
                              <p><strong>Institution:</strong> {row.institution || '-'}</p>

                              <p><strong>Year:</strong> {row.year || '-'}</p>
                              <p><strong>Marks:</strong> {row.score || '-'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {sectionVisibility.skills && (
                    <>
                      <div className="resume-section-title">Skills</div>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{formData.skills || 'Add skills here.'}</p>
                    </>
                  )}

                  {sectionVisibility.projects && showProjectsByType && (
                    <>
                      <div className="resume-section-title">Projects / Internship</div>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{formData.projects || 'Add project details and outcomes.'}</p>
                    </>
                  )}

                  {sectionVisibility.experience && (
                    <>
                      <div className="resume-section-title">Experience</div>
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: '22%' }}>Company Name</th>
                            <th style={{ width: '18%' }}>Designation</th>
                            <th style={{ width: '16%' }}>Duration</th>
                            <th style={{ width: '44%' }}>Responsibilities / Achievements</th>
                          </tr>
                        </thead>
                        <tbody>
                          {experienceRows.map((row) => (
                            <tr key={row.id}>
                              <td>{row.company || '-'}</td>
                              <td>{row.designation || '-'}</td>
                              <td>{row.duration || '-'}</td>
                              <td>{row.responsibilities || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}

                  {sectionVisibility.additionalInfo && (
                    <>
                      <div className="resume-section-title">Additional Information</div>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{formData.additionalInfo || 'Languages, hobbies, achievements, certifications, and other details.'}</p>
                    </>
                  )}

                  {customFields.length > 0 && (
                    <>
                      {customFields.map((field) => (
                        <div key={field.id}>
                          <div className="resume-section-title">{field.label}</div>
                          <p style={{ whiteSpace: 'pre-wrap' }}>{field.value || '---'}</p>
                        </div>
                      ))}
                    </>
                  )}

                  <div className="resume-footer-block">
                    <div>
                      <p><strong>Place:</strong> {formData.place || '___________'}</p>
                      <p><strong>Date:</strong> {formatDateDDMMYYYY(formData.date)}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p>Signature: ____________________</p>
                      <p><strong>{formData.signatureName || formData.fullName || 'Applicant Name'}</strong></p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {typedModuleKey === 'resume-edit-pdf' ? (
                    // PDF Viewer — renders all pages as images
                    pdfPages.length > 0 ? (
                      pdfPages.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt={`Page ${i + 1}`}
                          style={{ width: '100%', display: 'block', marginBottom: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}
                        />
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '52px', marginBottom: '12px' }}>📄</div>
                        <p style={{ margin: 0, fontSize: '13px' }}>No PDF loaded. Go back and upload a PDF file.</p>
                      </div>
                    )
                  ) : docBlob ? (
                    // Word document rendering container for docx-preview.
                    // docx-preview renders directly into previewRef.current.
                    null
                  ) : (
                    // Empty state before upload
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
                      <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
                      <p style={{ margin: 0, fontSize: '12px' }}>Upload a Word document to see its content here.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

export default ResumeServiceModule
