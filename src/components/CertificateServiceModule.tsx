import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

type CertificateTheme = 'classic' | 'formal' | 'academic'

type TemplateField = {
  key: string
  label: string
  type: 'text' | 'date' | 'email' | 'tel' | 'textarea' | 'year'
  required?: boolean
  placeholder?: string
  maxLength?: number
}

type CertificateTemplate = {
  title: string
  subtitle: string
  theme: CertificateTheme
  accent: string
  purpose: string
  fields: TemplateField[]
  previewLines: string[]
}

type CertificateServiceModuleProps = {
  moduleKey: string
  onBack: () => void
}

const currentYear = new Date().getFullYear()
const today = new Date().toISOString().split('T')[0]

const moduleLabels: Record<string, string> = {
  'certificate-bonafide': 'Bonafide Certificate',
  'certificate-course-completion': 'Course Completion Certificate',
  'certificate-provisional': 'Provisional Certificate',
  'certificate-transfer': 'Transfer Certificate (TC)',
  'certificate-migration': 'Migration Certificate',
  'certificate-marksheet': 'Consolidated Marksheet',
  'certificate-rank': 'Rank Certificate',
  'certificate-medium-instruction': 'Medium of Instruction Certificate',
  'certificate-medical-fitness': 'Medical Fitness Certificate',
  'certificate-medical-leave': 'Medical Leave Certificate',
  'certificate-disability': 'Disability Certificate',
  'certificate-vaccination': 'Vaccination Certificate',
  'certificate-internship': 'Internship Certificate',
  'certificate-work-experience': 'Work Experience Certificate',
  'certificate-project-completion': 'Project Completion Certificate',
  'certificate-industrial-visit': 'Industrial Visit Certificate',
  'certificate-training': 'Training Certificate',
  'certificate-character': 'Character Certificate',
  'certificate-residence': 'Residence Certificate',
  'certificate-income': 'Income Certificate',
  'certificate-community': 'Community / Caste Certificate',
  'certificate-id-card': 'ID Card Request / Renewal Certificate',
  'certificate-scholarship-eligibility': 'Scholarship Eligibility Certificate',
  'certificate-fee-concession': 'Fee Concession Certificate',
  'certificate-education-loan': 'Education Loan Support Certificate',
  'certificate-no-dues': 'No Dues Certificate',
  'certificate-recommendation': 'Recommendation Letter Request',
  'certificate-event-participation': 'Event Participation Certificate',
  'certificate-sports': 'Sports Participation Certificate',
  'certificate-ncc-nss': 'NCC / NSS Certificate',
  'certificate-attendance': 'Attendance Certificate',
  'certificate-gap': 'Gap Certificate',
  'certificate-duplicate': 'Duplicate Certificate Request'
}

const templateConfig: Record<string, CertificateTemplate> = {
  'certificate-bonafide': {
    title: 'Bonafide Certificate',
    subtitle: 'Academic proof of current enrollment',
    theme: 'academic',
    accent: '#0ea5e9',
    purpose: 'Scholarship, bank, travel concession, or course verification',
    fields: [
      { key: 'studentName', label: 'Student Name', type: 'text', required: true },
      { key: 'fatherName', label: 'Father / Guardian Name', type: 'text', required: true },
      { key: 'courseName', label: 'Course / Program Name', type: 'text', required: true },
      { key: 'collegeName', label: 'Institution Name', type: 'text', required: true },
      { key: 'academicYear', label: 'Academic Year', type: 'year', required: true },
      { key: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
      { key: 'mobile', label: 'Mobile Number', type: 'tel', required: true, maxLength: 10 },
      { key: 'purpose', label: 'Purpose', type: 'textarea', required: true, placeholder: 'Why do you need this certificate?' }
    ],
    previewLines: ['This is to certify that {studentName} is a bonafide student of {collegeName}.', 'He / She is studying {courseName} during the academic year {academicYear}.']
  },
  'certificate-income': {
    title: 'Income Certificate',
    subtitle: 'Proof of family or individual income',
    theme: 'formal',
    accent: '#f59e0b',
    purpose: 'Scholarship, fee concession, or financial support',
    fields: [
      { key: 'applicantName', label: 'Applicant Name', type: 'text', required: true },
      { key: 'fatherName', label: 'Father / Husband Name', type: 'text', required: true },
      { key: 'dob', label: 'Date of Birth', type: 'date', required: true },
      { key: 'annualIncome', label: 'Annual Income', type: 'text', required: true, placeholder: 'e.g., 120000' },
      { key: 'financialYear', label: 'Financial Year', type: 'year', required: true },
      { key: 'address', label: 'Address', type: 'textarea', required: true },
      { key: 'purpose', label: 'Purpose', type: 'textarea', required: true }
    ],
    previewLines: ['Income Certificate for {applicantName}.', 'Declared annual income: {annualIncome} for financial year {financialYear}.']
  },
  'certificate-internship': {
    title: 'Internship Certificate',
    subtitle: 'Completion proof for internship programs',
    theme: 'academic',
    accent: '#7c3aed',
    purpose: 'College records, placements, and portfolio use',
    fields: [
      { key: 'internName', label: 'Intern Name', type: 'text', required: true },
      { key: 'companyName', label: 'Company / Organization', type: 'text', required: true },
      { key: 'role', label: 'Role / Domain', type: 'text', required: true },
      { key: 'startDate', label: 'Start Date', type: 'date', required: true },
      { key: 'endDate', label: 'End Date', type: 'date', required: true },
      { key: 'mentor', label: 'Mentor / Supervisor', type: 'text', required: true },
      { key: 'remarks', label: 'Remarks', type: 'textarea', required: false }
    ],
    previewLines: ['This certificate is issued to {internName} for successfully completing the internship at {companyName}.', 'Duration: {startDate} to {endDate}.']
  },
  'certificate-no-dues': {
    title: 'No Dues Certificate',
    subtitle: 'Clearance for final submission or transfer',
    theme: 'classic',
    accent: '#10b981',
    purpose: 'Result release, transfer, or settlement proof',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'department', label: 'Department / Class', type: 'text', required: true },
      { key: 'institution', label: 'Institution Name', type: 'text', required: true },
      { key: 'clearanceDate', label: 'Clearance Date', type: 'date', required: true },
      { key: 'pendingItems', label: 'Pending Items', type: 'textarea', required: false },
      { key: 'purpose', label: 'Purpose', type: 'textarea', required: true }
    ],
    previewLines: ['No dues certificate issued to {name} from {institution}.', 'Department / Class: {department}.']
  }
}

const defaultTemplate: CertificateTemplate = {
  title: 'Certificate Request',
  subtitle: 'General purpose certificate request',
  theme: 'formal',
  accent: '#0f766e',
  purpose: 'General certificate purpose',
  fields: [
    { key: 'fullName', label: 'Full Name', type: 'text', required: true },
    { key: 'fatherName', label: 'Father / Husband Name', type: 'text', required: true },
    { key: 'dob', label: 'Date of Birth', type: 'date', required: true },
    { key: 'mobile', label: 'Mobile Number', type: 'tel', required: true, maxLength: 10 },
    { key: 'email', label: 'Email Address', type: 'email', required: false },
    { key: 'address', label: 'Address', type: 'textarea', required: true },
    { key: 'purpose', label: 'Purpose', type: 'textarea', required: true }
  ],
  previewLines: ['This certificate request has been prepared for {fullName}.', 'Purpose: {purpose}.']
}

const resolveTemplate = (moduleKey: string) => templateConfig[moduleKey] || defaultTemplate

const createInitialValues = (fields: TemplateField[]) => fields.reduce<Record<string, string>>((accumulator, field) => {
  accumulator[field.key] = ''
  return accumulator
}, {})

const sanitizeYear = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (!digits) return ''
  const year = Number(digits)
  if (year > currentYear) return String(currentYear)
  if (year < 1900) return '1900'
  return String(year)
}

const formatDate = (value: string) => {
  if (!value) return '---'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}-${month}-${year}`
}

const CertificateServiceModule = ({ moduleKey, onBack }: CertificateServiceModuleProps) => {
  const previewRef = useRef<HTMLDivElement | null>(null)
  const template = useMemo(() => resolveTemplate(moduleKey), [moduleKey])
  const [values, setValues] = useState<Record<string, string>>(() => createInitialValues(template.fields))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    setValues(createInitialValues(template.fields))
    setErrors({})
  }, [template])

  const updateValue = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}

    template.fields.forEach((field) => {
      const value = values[field.key]?.trim() || ''
      if (field.required && !value) {
        nextErrors[field.key] = 'This field is required.'
        return
      }

      if (!value) return

      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        nextErrors[field.key] = 'Enter a valid email address.'
      }

      if (field.type === 'tel' && value.replace(/\D/g, '').length !== 10) {
        nextErrors[field.key] = 'Enter a valid 10-digit mobile number.'
      }

      if (field.type === 'year') {
        const year = Number(sanitizeYear(value))
        if (!year || year > currentYear) {
          nextErrors[field.key] = `Enter a year not beyond ${currentYear}.`
        }
      }

      if (field.type === 'date') {
        const parsed = new Date(value)
        if (Number.isNaN(parsed.getTime())) {
          nextErrors[field.key] = 'Enter a valid date.'
        }
      }
    })

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const exportDocument = async () => {
    if (!validate() || !previewRef.current) return
    setIsExporting(true)

    try {
      const canvas = await html2canvas(previewRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const imageHeight = (canvas.height * pdfWidth) / canvas.width
      const image = canvas.toDataURL('image/png')

      pdf.addImage(image, 'PNG', 0, 0, pdfWidth, imageHeight)
      pdf.save(`${template.title.replace(/\s+/g, '_')}.pdf`)
    } finally {
      setIsExporting(false)
    }
  }

  const printPreview = () => {
    if (!validate() || !previewRef.current) return
    const html = previewRef.current.outerHTML
    const printWindow = window.open('', '_blank', 'width=1000,height=900')
    if (!printWindow) return

    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8" /><style>body{margin:0;font-family:Calibri,Arial,sans-serif;background:#f4f4f5}.certificate-sheet{width:210mm;min-height:297mm;margin:0 auto;background:#fff;color:#111827;box-sizing:border-box;padding:14mm;position:relative}.certificate-title{font-size:22px;text-transform:uppercase;letter-spacing:.08em;margin:0}.certificate-accent{border-color:${template.accent};color:${template.accent}}.certificate-section{margin-top:12px}.certificate-section h4{margin:0 0 8px;font-size:12px;text-transform:uppercase;color:${template.accent}}.certificate-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 14px;font-size:11px}.certificate-footer{margin-top:18px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.certificate-watermark{position:absolute;top:48%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);font-size:38px;font-weight:800;color:rgba(15,23,42,.08);pointer-events:none;text-transform:uppercase;}</style></head><body>${html}</body></html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const exportWord = () => {
    if (!validate() || !previewRef.current) return
    const html = previewRef.current.outerHTML
    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${template.title.replace(/\s+/g, '_')}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="resume-module-view">
      <button className="back-btn" onClick={onBack} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Back to Certificates
      </button>

      <div className="tn-police-header" style={{ borderColor: `${template.accent}55`, marginBottom: '12px' }}>
        <div style={{ padding: '12px', background: `${template.accent}15`, borderRadius: '12px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={template.accent} strokeWidth="2"><path d="M12 2l2.6 6.6L21 10l-5 4.3L17.2 21 12 17.8 6.8 21 8 14.3 3 10l6.4-1.4z" /></svg>
        </div>
        <div>
          <h3 style={{color: 'var(--text-main)', margin: 0 }}>{template.title}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>{template.subtitle}</p>
        </div>
      </div>

      <div className="resume-builder-layout">
        <div className="resume-editor-pane glass-card" style={{ maxWidth: 'none' }}>
          <h4 style={{margin: 0 }}>Certificate Form</h4>
          <p className="p" style={{ margin: 0, fontSize: '13px' }}>Validation is enforced for required fields, dates, year ranges, email, and phone numbers before export.</p>

          <div className="resume-two-col">
            {template.fields.map((field) => (
              <div className="form-group" key={field.key}>
                <label className="form-label">{field.label}{field.required ? ' *' : ''}</label>
                {field.type === 'textarea' ? (
                  <textarea className="input-field" rows={3} placeholder={field.placeholder || ''} value={values[field.key] || ''} onChange={(event) => updateValue(field.key, event.target.value)} />
                ) : field.type === 'date' ? (
                  <input type="date" className="input-field" max={today} value={values[field.key] || ''} onChange={(event) => updateValue(field.key, event.target.value)} />
                ) : field.type === 'email' ? (
                  <input type="email" className="input-field" placeholder={field.placeholder || 'name@example.com'} value={values[field.key] || ''} onChange={(event) => updateValue(field.key, event.target.value)} />
                ) : field.type === 'tel' ? (
                  <input type="tel" className="input-field" maxLength={field.maxLength || 10} inputMode="numeric" placeholder={field.placeholder || '10-digit mobile'} value={values[field.key] || ''} onChange={(event) => updateValue(field.key, event.target.value.replace(/\D/g, '').slice(0, field.maxLength || 10))} />
                ) : field.type === 'year' ? (
                  <input type="text" className="input-field" placeholder={field.placeholder || String(currentYear)} value={values[field.key] || ''} onChange={(event) => updateValue(field.key, sanitizeYear(event.target.value))} />
                ) : (
                  <input type="text" className="input-field" placeholder={field.placeholder || ''} value={values[field.key] || ''} onChange={(event) => updateValue(field.key, event.target.value)} />
                )}
                {errors[field.key] ? <span style={{ color: '#fca5a5', fontSize: '12px' }}>{errors[field.key]}</span> : null}
              </div>
            ))}
          </div>

          <div className="service-report-section">
            <h4>Validation Notes</h4>
            <div className="service-report-kv-grid">
              <div className="service-report-kv-item"><span>Dates</span><strong>Use calendar input, max today</strong></div>
              <div className="service-report-kv-item"><span>Years</span><strong>Cannot exceed {currentYear}</strong></div>
              <div className="service-report-kv-item"><span>Phone</span><strong>Exactly 10 digits</strong></div>
              <div className="service-report-kv-item"><span>Email</span><strong>Must be valid if entered</strong></div>
            </div>
          </div>
        </div>

        <div className="resume-preview-pane">
          <div className="resume-preview-toolbar">
            <button className="btn-primary" onClick={exportWord}>Save as Word</button>
            <button className="btn-primary" onClick={exportDocument} disabled={isExporting}>{isExporting ? 'Saving PDF...' : 'Save as PDF'}</button>
            <button className="btn-primary" onClick={printPreview}>Print</button>
          </div>

          <div className="resume-sheet-scroll">
            <div className={`certificate-sheet resume-a4-sheet resume-theme-classic`} ref={previewRef} style={{ '--resume-accent': template.accent } as CSSProperties}>
              <div className="certificate-watermark">{template.title}</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="resume-header">
                  <div>
                    <h1 className="certificate-title">{template.title}</h1>
                    <p className="resume-subtitle">{moduleLabels[moduleKey] || template.subtitle}</p>
                  </div>
                  <div className="resume-card-badge" style={{ background: template.accent }}>{template.purpose}</div>
                </div>

                <div className="resume-section-title">Applicant Details</div>
                <div className="certificate-grid">
                  {template.fields.map((field) => (
                    <p key={field.key}><strong>{field.label}:</strong> {field.type === 'date' ? formatDate(values[field.key]) : values[field.key] || '---'}</p>
                  ))}
                </div>

                <div className="certificate-section">
                  <h4>Certificate Text</h4>
                  {template.previewLines.map((line) => (
                    <p key={line} style={{ whiteSpace: 'pre-wrap' }}>{line.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, token) => values[token] || '---')}</p>
                  ))}
                </div>

                <div className="certificate-section">
                  <h4>Purpose</h4>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{values.purpose || template.purpose}</p>
                </div>

                <div className="certificate-footer">
                  <div>
                    <p><strong>Issue Date:</strong> {formatDate(today)}</p>
                    <p><strong>Reference:</strong> {moduleKey.replace(/certificate-/g, '').toUpperCase()}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p>Authorized Signature: ____________________</p>
                    <p><strong>Applicant Signature</strong></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CertificateServiceModule