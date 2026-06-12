import { useState, useEffect } from 'react'
import emailjs from '@emailjs/browser'
import './index.css'
import OptimizedFileUpload from './components/OptimizedFileUpload'
import CertificateServiceModule from './components/CertificateServiceModule'
import ResumeServiceModule from './components/ResumeServiceModule'
import PhotoStudioServiceModule from './components/PhotoStudioServiceModule'
import { useFileOptimizer, type ProcessedFile } from './hooks/useFileOptimizer'
import { ErrorBoundary } from './components/ErrorBoundary'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const normalizePhoneInput = (value: string, maxDigits = 10) => value.replace(/\D/g, '').slice(0, maxDigits)
const isValidTenDigitPhone = (value: string) => normalizePhoneInput(value).length === 10
const isValidEmailAddress = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onloadend = () => resolve(String(reader.result || ''))
  reader.onerror = reject
  reader.readAsDataURL(blob)
})

type ApprovalRole = 'user' | 'employee' | 'distributor'
type ServiceAccessKey = string

const SERVICE_ACCESS_OPTIONS: Array<{ key: ServiceAccessKey; label: string; description: string }> = [
  { key: 'police', label: 'Tamil Nadu Police', description: 'Complaint, FIR, CSR and Vehicle status' },
  { key: 'birthDeath', label: 'Birth & Death', description: 'Birth and death certificate services' },
  { key: 'tnEDistrict', label: 'TN eDistrict', description: 'Certificate verification services' },
  { key: 'certificateService', label: 'Forms', description: 'Academic, medical, career and identity forms' },
  { key: 'photoStudio', label: 'Passport / Stamp', description: 'Photo printing, editing, and card generation' },
  { key: 'ebService', label: 'EB Service', description: 'Name transfer, new connection and load services' },
  { key: 'resumeService', label: 'Resume', description: 'Resume builder, editing and PDF conversion' },
  { key: 'addMoney', label: 'Add Money', description: 'Wallet funding access' }
]

const createDefaultServiceAccess = (): Record<ServiceAccessKey, boolean> => ({
  police: true,
  birthDeath: true,
  tnEDistrict: true,
  certificateService: true,
  photoStudio: true,
  ebService: true,
  resumeService: true,
  addMoney: true
})

const CERTIFICATE_SECTIONS = [
  {
    id: 'essential-forms',
    title: 'Essential Forms',
    subtitle: 'Frequently requested certificates and forms',
    color: '#0ea5e9',
    modules: [
      { key: 'certificate-bonafide', title: 'Bonafide Certificate', icon: '🎓', description: 'Proof of current study or enrollment.', detail: 'Useful for bank applications, transport concessions, and scholarship verification.' },
      { key: 'certificate-medical-fitness', title: 'Medical Fitness Certificate', icon: '🩺', description: 'Proof that the applicant is medically fit.', detail: 'Common for jobs, sports, and activity clearance.' },
      { key: 'certificate-internship', title: 'Internship Certificate', icon: '💼', description: 'Issued after internship completion.', detail: 'Essential for placements, portfolios, and career records.' },
      { key: 'certificate-training', title: 'Training Certificate', icon: '🛠️', description: 'Proof of attending a training program.', detail: 'Useful for skill development and employer proof.' }
    ]
  }
] as const

const ALL_DISTRIBUTORS = '__all_distributors__'
const ALL_EMPLOYEES = '__all_employees__'
const ALL_USERS = '__all_users__'

const createDefaultApprovalConfig = () => ({
  accountRole: 'user' as ApprovalRole,
  usernameMode: 'tree' as 'tree' | 'phone' | 'email',
  serviceAccess: createDefaultServiceAccess()
})

function App() {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })
  const [step, setStep] = useState(1) // 1: Landing, 2: Login Form
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { optimizeFile, isOptimizing: isProfileOptimizing } = useFileOptimizer();
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaValue, setCaptchaValue] = useState('')
  const [error, setError] = useState('')

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('portal_theme')
    return (saved as 'dark' | 'light') || 'dark'
  })

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('portal_sidebar_collapsed') === 'true')
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = Number(localStorage.getItem('portal_sidebar_width') || '232')
    return Number.isFinite(saved) ? Math.min(420, Math.max(180, saved)) : 232
  })
  const [isSidebarResizing, setIsSidebarResizing] = useState(false)

  // Auth State (Persistent)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('portal_isLoggedIn') === 'true'
  })
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(() => {
    const saved = localStorage.getItem('portal_userRole')
    return (saved && saved !== '') ? (saved as any) : null
  })

  useEffect(() => {
    localStorage.setItem('portal_isLoggedIn', isLoggedIn.toString())
    localStorage.setItem('portal_userRole', userRole || '')
  }, [isLoggedIn, userRole])

  // Theme Effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('portal_theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('portal_sidebar_collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  useEffect(() => {
    localStorage.setItem('portal_sidebar_width', String(sidebarWidth))
  }, [sidebarWidth])

  useEffect(() => {
    if (!isSidebarResizing) return

    const onMouseMove = (event: MouseEvent) => {
      if (window.innerWidth < 768) return
      const nextWidth = Math.min(420, Math.max(180, event.clientX))
      setSidebarWidth(nextWidth)
      if (sidebarCollapsed) setSidebarCollapsed(false)
    }

    const onMouseUp = () => setIsSidebarResizing(false)

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isSidebarResizing, sidebarCollapsed])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    const saved = localStorage.getItem('portal_current_user')
    return saved ? JSON.parse(saved) : null
  })

  const [activeTab, setActiveTab] = useState(() => {
    const savedRole = localStorage.getItem('portal_userRole')
    return savedRole === 'user' ? 'Profile' : 'Overview'
  })

  const [serviceCatalog, setServiceCatalog] = useState<Array<{ key: string; label: string; description: string }>>(() => {
    const saved = localStorage.getItem('portal_service_catalog')
    return saved ? JSON.parse(saved) : SERVICE_ACCESS_OPTIONS
  })
  const [userControlSelectedServiceKey, setUserControlSelectedServiceKey] = useState<string>(SERVICE_ACCESS_OPTIONS[0].key)
  const [userControlRoleTarget, setUserControlRoleTarget] = useState<'admin' | ApprovalRole>('user')
  const [userControlUserIdTarget, setUserControlUserIdTarget] = useState('')

  const [serviceFinanceRows, setServiceFinanceRows] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem('portal_service_finance_rows')
    return saved ? JSON.parse(saved) : {}
  })
  const [gstPopupServiceKey, setGstPopupServiceKey] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<any>(null)

  // Services State
  const [activeServiceCategory, setActiveServiceCategory] = useState<string | null>(null)
  const [activeServiceSubTab, setActiveServiceSubTab] = useState<string | null>(null)
  const [addLoadFilter, setAddLoadFilter] = useState('')
  const [activePoliceSubTab, setActivePoliceSubTab] = useState<string>('Complaint Status')
  const [activeBirthDeathSubTab, setActiveBirthDeathSubTab] = useState<string>('Birth Certificate')
  const [activeEDistrictSubTab, setActiveEDistrictSubTab] = useState<string>('OBC Certificate')
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [isApiLoading, setIsApiLoading] = useState(false)

  // CIBIL Score State
  const [cibilForm, setCibilForm] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    pan: '',
    dob: '',
    pincode: '',
    address: ''
  })
  const [cibilResult, setCibilResult] = useState<any>(null)
  const [cibilLoading, setCibilLoading] = useState(false)
  const [cibilStep, setCibilStep] = useState(0)
  const [cibilHistory, setCibilHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('portal_cibil_history')
    return saved ? JSON.parse(saved) : []
  })
  const [activeCibilSubView, setActiveCibilSubView] = useState<'form' | 'history' | 'report'>('form')
  const [showCibilFilter, setShowCibilFilter] = useState(false)
  const [cibilFilters, setCibilFilters] = useState({
    search: '',
    fromDate: '',
    toDate: '',
    status: 'All'
  })

  const filteredCibilHistory = cibilHistory.filter(h => {
    const matchesSearch = !cibilFilters.search ||
      h.personal.fullName.toLowerCase().includes(cibilFilters.search.toLowerCase()) ||
      h.personal.pan.toLowerCase().includes(cibilFilters.search.toLowerCase()) ||
      h.referenceId.toLowerCase().includes(cibilFilters.search.toLowerCase());

    const matchesStatus = cibilFilters.status === 'All' || h.status === cibilFilters.status;

    // Date filtering
    let matchesDate = true;
    if (cibilFilters.fromDate || cibilFilters.toDate) {
      const reportDate = new Date(h.created_at);
      if (cibilFilters.fromDate) {
        const from = new Date(cibilFilters.fromDate);
        from.setHours(0, 0, 0, 0);
        if (reportDate < from) matchesDate = false;
      }
      if (cibilFilters.toDate) {
        const to = new Date(cibilFilters.toDate);
        to.setHours(23, 59, 59, 999);
        if (reportDate > to) matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  useEffect(() => {
    localStorage.setItem('portal_cibil_history', JSON.stringify(cibilHistory))
  }, [cibilHistory])

  const [serviceForms, setServiceForms] = useState<any[]>(() => {
    const saved = localStorage.getItem('portal_service_forms')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('portal_service_forms', JSON.stringify(serviceForms))
  }, [serviceForms])

  const [serviceReportSearch, setServiceReportSearch] = useState('')
  const [serviceReportStatus, setServiceReportStatus] = useState<'All' | 'Pending' | 'Completed'>('All')
  const [expandedServiceReportId, setExpandedServiceReportId] = useState<string | null>(null)

  const myServiceReports = serviceForms.filter((form: any) => form.userId === currentUser?.id)
  const filteredServiceReports = myServiceReports.filter((form: any) => {
    const q = serviceReportSearch.trim().toLowerCase()
    const matchesSearch =
      q.length === 0 ||
      String(form.formNo || '').toLowerCase().includes(q) ||
      String(form.serviceName || '').toLowerCase().includes(q) ||
      String(form.referenceNo || '').toLowerCase().includes(q)

    const matchesStatus = serviceReportStatus === 'All' || form.status === serviceReportStatus
    return matchesSearch && matchesStatus
  })

  const completedReportsCount = myServiceReports.filter((form: any) => form.status === 'Completed').length
  const pendingReportsCount = myServiceReports.filter((form: any) => form.status !== 'Completed').length
  const todayIsoDate = new Date().toISOString().split('T')[0]
  const todayReportsCount = myServiceReports.filter((form: any) => {
    const formDate = new Date(form.appliedDate).toISOString().split('T')[0]
    return formDate === todayIsoDate
  }).length

  useEffect(() => {
    if (activeTab !== 'Service Reports') return
    if (!filteredServiceReports.length) {
      setExpandedServiceReportId(null)
      return
    }

    const hasExpanded = filteredServiceReports.some((form: any) => String(form.id) === expandedServiceReportId)
    if (!hasExpanded) {
      setExpandedServiceReportId(String(filteredServiceReports[0].id))
    }
  }, [activeTab, filteredServiceReports, expandedServiceReportId])

  // Persistent States
  const [users, setUsers] = useState<any[]>(() => {
    const saved = localStorage.getItem('portal_users')
    if (saved) return JSON.parse(saved)
    return [
      { id: 1, name: 'Admin User', email: 'admin@portal.com', phone: '0000000000', district: 'Tamilnadu', role: 'admin', accountRole: 'admin', serviceAccess: createDefaultServiceAccess(), allocatedCredit: 0, status: 'Approved', username: 'Admin', shopName: 'Admin Hub', walletBalance: 0, transactions: [] },
      {
        id: 2, name: 'Sample Retailer', email: 'sample@retail.com', phone: '9876543210', district: 'Chennai', role: 'user', accountRole: 'user', serviceAccess: createDefaultServiceAccess(), allocatedCredit: 0, status: 'Approved', shopName: 'Sample Shop', fatherSpouseName: 'John Doe', address: '123 Main St, Anna Nagar', pincode: '600040', state: 'Tamilnadu', username: 'Sample', password: 'Welcome@123', walletBalance: 500.00, transactions: [
          { id: 1, type: 'Credit', amount: 500.00, date: '2026-03-20', status: 'Success', description: 'Opening Balance' }
        ]
      }
    ]
  })

  const [treeCounter, setTreeCounter] = useState(() => {
    const saved = localStorage.getItem('portal_tree_counter')
    return saved ? parseInt(saved) : 1
  })

  useEffect(() => {
    localStorage.setItem('portal_users', JSON.stringify(users))
  }, [users])

  useEffect(() => {
    localStorage.setItem('portal_tree_counter', treeCounter.toString())
  }, [treeCounter])

  useEffect(() => {
    localStorage.setItem('portal_service_catalog', JSON.stringify(serviceCatalog))
  }, [serviceCatalog])

  useEffect(() => {
    setServiceCatalog(prev => {
      const existing = new Set(prev.map(service => service.key))
      const missing = SERVICE_ACCESS_OPTIONS.filter(service => !existing.has(service.key))
      if (!missing.length) return prev
      return [...prev, ...missing]
    })
  }, [])

  useEffect(() => {
    localStorage.setItem('portal_service_finance_rows', JSON.stringify(serviceFinanceRows))
  }, [serviceFinanceRows])

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUserForApproval, setSelectedUserForApproval] = useState<any | null>(null)
  const [selectedUserForServiceAccess, setSelectedUserForServiceAccess] = useState<any | null>(null)
  const [viewingUser, setViewingUser] = useState<any | null>(null)
  const [notificationSteps, setNotificationSteps] = useState<string[]>([])

  const createDefaultFinanceRow = () => ({
    payoutAmount: '',
    gstMode: 'exclude' as 'include' | 'exclude',
    gstRate: '18',
    tdsRate: '2',
    distributorId: '',
    distributorAmount: '',
    employeeId: '',
    employeeAmount: '',
    userId: '',
    userAmount: '',
    incomeAmount: ''
  })

  const getServiceAccessTemplate = () => {
    const template: Record<string, boolean> = {}
    serviceCatalog.forEach(service => {
      template[service.key] = true
    })
    return template
  }

  const mergeServiceAccess = (existingAccess: any) => ({
    ...getServiceAccessTemplate(),
    ...(existingAccess || {})
  })

  const getFinanceRow = (serviceKey: string) => ({
    ...createDefaultFinanceRow(),
    ...(serviceFinanceRows[serviceKey] || {})
  })

  const syncCurrentUserFromUsers = (updatedUsers: any[]) => {
    if (!currentUser) return
    const matched = updatedUsers.find(u => u.id === currentUser.id)
    if (!matched) return
    setCurrentUser(matched)
    localStorage.setItem('portal_current_user', JSON.stringify(matched))
  }

  const normalizeServiceKey = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

  const toAmount = (value: any) => Math.max(0, parseFloat(String(value || '0')) || 0)

  const getGstBreakup = (row: any) => {
    const payout = toAmount(row.payoutAmount)
    const gstRate = toAmount(row.gstRate)
    const gstFactor = gstRate / 100

    if (row.gstMode === 'include') {
      const baseAmount = gstFactor > 0 ? payout / (1 + gstFactor) : payout
      const gstAmount = payout - baseAmount
      return { baseAmount, gstAmount, totalAmount: payout }
    }

    const baseAmount = payout
    const gstAmount = baseAmount * gstFactor
    return { baseAmount, gstAmount, totalAmount: baseAmount + gstAmount }
  }

  const updateServiceFinanceRow = (serviceKey: string, patch: Record<string, any>) => {
    setServiceFinanceRows(prev => ({
      ...prev,
      [serviceKey]: {
        ...createDefaultFinanceRow(),
        ...(prev[serviceKey] || {}),
        ...patch
      }
    }))
  }

  const calculateServiceProfit = (row: any) => {
    const gst = getGstBreakup(row)
    const distributor = toAmount(row.distributorAmount)
    const employee = toAmount(row.employeeAmount)
    const user = toAmount(row.userAmount)
    return user - gst.totalAmount - distributor - employee
  }

  const resolveServiceFinanceKeyForSubmission = (submission: any): string | null => {
    const explicitKey = String(submission?.serviceKey || '').trim()
    if (explicitKey && serviceFinanceRows[explicitKey]) return explicitKey

    const serviceName = String(submission?.serviceName || '').trim()
    if (!serviceName) return null

    const normalized = normalizeServiceKey(serviceName)
    if (serviceFinanceRows[normalized]) return normalized

    const lowerName = serviceName.toLowerCase()
    if (lowerName.includes('eb service') && serviceFinanceRows.ebService) return 'ebService'
    if (lowerName.includes('resume') && serviceFinanceRows.resumeService) return 'resumeService'
    if (lowerName.includes('police') && serviceFinanceRows.police) return 'police'
    if ((lowerName.includes('birth') || lowerName.includes('death')) && serviceFinanceRows.birthDeath) return 'birthDeath'
    if ((lowerName.includes('edistrict') || lowerName.includes('e district')) && serviceFinanceRows.tnEDistrict) return 'tnEDistrict'

    const catalogMatch = serviceCatalog.find(service => {
      const label = String(service.label || '').toLowerCase()
      return label && (lowerName.includes(label) || label.includes(lowerName))
    })

    if (catalogMatch && serviceFinanceRows[catalogMatch.key]) return catalogMatch.key
    return null
  }

  const getSubmissionChargeAmount = (submission: any): number => {
    if (!currentUser) return 0
    const financeKey = resolveServiceFinanceKeyForSubmission(submission)
    if (!financeKey) return 0

    const row = getFinanceRow(financeKey)
    const appliesToCurrentUser = !row.userId || row.userId === ALL_USERS || String(row.userId) === String(currentUser.id)
    if (!appliesToCurrentUser) return 0

    return toAmount(row.userAmount)
  }

  const applyServiceFinanceOnSubmission = (submission: any): boolean => {
    if (!currentUser) return true

    const financeKey = resolveServiceFinanceKeyForSubmission(submission)
    if (!financeKey) return true

    const row = getFinanceRow(financeKey)
    const userAmount = toAmount(row.userAmount)
    const distributorAmount = toAmount(row.distributorAmount)
    const employeeAmount = toAmount(row.employeeAmount)

    const appliesToCurrentUser = !row.userId || row.userId === ALL_USERS || String(row.userId) === String(currentUser.id)
    if (!appliesToCurrentUser) return true

    setUsers(prev => {
      const userMap = new Map(prev.map(u => [u.id, { ...u, transactions: [...(u.transactions || [])] }]))
      const submittingUser = userMap.get(currentUser.id)
      const adminUser = prev.find(u => (u.accountRole || u.role) === 'admin')
      const admin = adminUser ? userMap.get(adminUser.id) : null

      if (!submittingUser) return prev

      const approvedDistributors = prev.filter(u => (u.accountRole || u.role) === 'distributor' && u.status === 'Approved')
      const approvedEmployees = prev.filter(u => (u.accountRole || u.role) === 'employee' && u.status === 'Approved')

      const distributorTargets = row.distributorId === ALL_DISTRIBUTORS
        ? approvedDistributors.map(d => userMap.get(d.id)).filter(Boolean) as any[]
        : (row.distributorId ? [userMap.get(Number(row.distributorId))].filter(Boolean) as any[] : [])

      const employeeTargets = row.employeeId === ALL_EMPLOYEES
        ? approvedEmployees.map(e => userMap.get(e.id)).filter(Boolean) as any[]
        : (row.employeeId ? [userMap.get(Number(row.employeeId))].filter(Boolean) as any[] : [])

      if (distributorAmount > 0 && distributorTargets.length === 0) {
        alert(`No distributor configured for ${submission.serviceName}.`)
        return prev
      }
      if (employeeAmount > 0 && employeeTargets.length === 0) {
        alert(`No employee configured for ${submission.serviceName}.`)
        return prev
      }

      const today = new Date().toISOString().split('T')[0]

      // Legacy blocks still deduct a fixed service fee before this function runs.
      // Reverse that debit first, then apply the configured Service Finance user charge.
      let refundedLegacyFee = 0
      const latestDebit = (submittingUser.transactions || []).find((t: any) =>
        t?.type === 'Debit' &&
        String(t?.description || '').includes('Fee (Form:')
      )
      if (latestDebit) {
        refundedLegacyFee = toAmount(latestDebit.amount)
        if (refundedLegacyFee > 0) {
          submittingUser.walletBalance = (submittingUser.walletBalance || 0) + refundedLegacyFee
          submittingUser.transactions.unshift({
            id: Date.now() + 0,
            type: 'Credit',
            amount: refundedLegacyFee,
            date: today,
            status: 'Success',
            description: `Legacy fee reversal for ${submission.serviceName}`
          })
        }
      }

      const availableAfterReversal = submittingUser.walletBalance || 0
      if (userAmount > 0 && availableAfterReversal < userAmount) {
        alert(`Wallet balance is low. Required ₹${userAmount.toFixed(2)} for ${submission.serviceName}.`)
        return prev
      }

      if (userAmount > 0) {
        submittingUser.walletBalance = (submittingUser.walletBalance || 0) - userAmount
        submittingUser.transactions.unshift({
          id: Date.now() + 1,
          type: 'Debit',
          amount: userAmount,
          date: today,
          status: 'Success',
          description: `Service charge for ${submission.serviceName}`
        })

        if (admin) {
          admin.walletBalance = (admin.walletBalance || 0) + userAmount
          admin.transactions.unshift({
            id: Date.now() + 2,
            type: 'Credit',
            amount: userAmount,
            date: today,
            status: 'Success',
            description: `Received from user for ${submission.serviceName}`
          })
        }
      }

      const distributorTotal = distributorAmount * distributorTargets.length
      const employeeTotal = employeeAmount * employeeTargets.length

      distributorTargets.forEach((distributor, index) => {
        distributor.walletBalance = (distributor.walletBalance || 0) + distributorAmount
        distributor.transactions.unshift({
          id: Date.now() + 100 + index,
          type: 'Credit',
          amount: distributorAmount,
          date: today,
          status: 'Success',
          description: `Distributor share for ${submission.serviceName}`
        })
      })

      employeeTargets.forEach((employee, index) => {
        employee.walletBalance = (employee.walletBalance || 0) + employeeAmount
        employee.transactions.unshift({
          id: Date.now() + 200 + index,
          type: 'Credit',
          amount: employeeAmount,
          date: today,
          status: 'Success',
          description: `Employee share for ${submission.serviceName}`
        })
      })

      if (admin && (distributorTotal > 0 || employeeTotal > 0)) {
        const totalShare = distributorTotal + employeeTotal
        admin.walletBalance = (admin.walletBalance || 0) - totalShare
        admin.transactions.unshift({
          id: Date.now() + 3,
          type: 'Debit',
          amount: totalShare,
          date: today,
          status: 'Success',
          description: `Distributed share for ${submission.serviceName}`
        })
      }

      const updatedUsers = prev.map(u => userMap.get(u.id) || u)
      syncCurrentUserFromUsers(updatedUsers)
      return updatedUsers
    })

    return true
  }

  const settleServiceFinance = (serviceKey: string, serviceLabel: string) => {
    const row = getFinanceRow(serviceKey)
    const distributorAmount = toAmount(row.distributorAmount)
    const employeeAmount = toAmount(row.employeeAmount)
    const userAmount = toAmount(row.userAmount)

    if (distributorAmount > 0 && !row.distributorId) {
      alert('Select distributor target (single or all) before saving rules.')
      return
    }
    if (employeeAmount > 0 && !row.employeeId) {
      alert('Select employee target (single or all) before saving rules.')
      return
    }
    if (userAmount > 0 && !row.userId) {
      alert('Select user target (single or all) before saving rules.')
      return
    }

    alert(`Service pricing rules saved for ${serviceLabel}. Charges/shares will apply on each submission.`)
  }

  useEffect(() => {
    if (!serviceCatalog.length) return
    setServiceFinanceRows(prev => {
      const next: Record<string, any> = { ...prev }
      let changed = false

      serviceCatalog.forEach(service => {
        if (!next[service.key]) {
          next[service.key] = createDefaultFinanceRow()
          changed = true
        }
      })

      return changed ? next : prev
    })
  }, [serviceCatalog])

  const applyServiceAccessForAllUsers = (serviceKey: string, isEnabled: boolean) => {
    setUsers(prev => {
      const updated = prev.map(u => ({
        ...u,
        serviceAccess: {
          ...mergeServiceAccess(u.serviceAccess),
          [serviceKey]: isEnabled
        }
      }))
      syncCurrentUserFromUsers(updated)
      return updated
    })
    alert(`Service access ${isEnabled ? 'enabled' : 'disabled'} for all users.`)
  }

  const applyServiceAccessByRole = (serviceKey: string, targetRole: 'admin' | ApprovalRole, isEnabled: boolean) => {
    setUsers(prev => {
      const updated = prev.map(u => {
        const role = (u.accountRole || u.role || 'user') as 'admin' | ApprovalRole
        if (role !== targetRole) return u
        return {
          ...u,
          serviceAccess: {
            ...mergeServiceAccess(u.serviceAccess),
            [serviceKey]: isEnabled
          }
        }
      })
      syncCurrentUserFromUsers(updated)
      return updated
    })
    alert(`Service access ${isEnabled ? 'enabled' : 'disabled'} for role: ${targetRole}.`)
  }

  const applyServiceAccessByUserId = (serviceKey: string, targetUserId: string, isEnabled: boolean) => {
    const parsedId = Number(targetUserId)
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      alert('Enter a valid User ID.')
      return
    }

    let userFound = false
    setUsers(prev => {
      const updated = prev.map(u => {
        if (u.id !== parsedId) return u
        userFound = true
        return {
          ...u,
          serviceAccess: {
            ...mergeServiceAccess(u.serviceAccess),
            [serviceKey]: isEnabled
          }
        }
      })
      syncCurrentUserFromUsers(updated)
      return updated
    })

    if (!userFound) {
      alert(`No user found with ID ${parsedId}.`)
      return
    }

    alert(`Service access ${isEnabled ? 'enabled' : 'disabled'} for user ID: ${parsedId}.`)
  }

  // Signup States
  const [signupData, setSignupData] = useState({
    name: '',
    fatherSpouseName: '',
    phone: '',
    email: '',
    shopName: '',
    address: '',
    pincode: '',
    state: 'Tamilnadu',
    district: ''
  })
  const [isSearchingDistrict, setIsSearchingDistrict] = useState(false)

  // Wallet Funding States
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false)
  const [addFundsAmount, setAddFundsAmount] = useState('500')
  // const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'upi' | 'netbanking' | 'card' | null>(null)
  const [paymentStep, setPaymentStep] = useState(1) // 1: Amount, 2: Selection/Process, 3: Success
  // const [pgSubStep, setPgSubStep] = useState<string>('methods')
  // const [vpaInput, setVpaInput] = useState('')
  // const [selectedBank, setSelectedBank] = useState('')
  // const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', name: '' })
  // const [timer, setTimer] = useState(60)
  // const [paymentDetails] = useState<any>({})

  // Name Transfer Form States
  const [nameTransferForm, setNameTransferForm] = useState({
    ebServiceNo: '',
    mobileNo: '',
    aadharNo: '',
    photo: null as any,
    signature: null as any,
    subCategory: 'Domestic',
    phase: 'Single',
    load: 'Single Phase 2 KW (Rs 5086)',
    documents: null as any
  })

  const [newServiceConnectionDomesticForm, setNewServiceConnectionDomesticForm] = useState({
    nearestEbServiceNo: '',
    mobileNo: '',
    aadharNo: '',
    tariff: 'Domestic',
    phase: 'Single',
    load: 'Single Phase 2 KW (Rs 5086)',
    photo: null as any,
    signature: null as any,
    documents: null as any
  })

  const [newServiceConnectionAgriForm, setNewServiceConnectionAgriForm] = useState({
    nearestEbServiceNo: '',
    mobileNo: '',
    aadharNo: '',
    tariff: 'Domestic',
    phase: 'Single',
    load: 'Single Phase 2 KW (Rs 5086)',
    photo: null as any,
    signature: null as any,
    documents: null as any
  })

  const [newServiceConnectionCommercialForm, setNewServiceConnectionCommercialForm] = useState({
    nearestEbServiceNo: '',
    mobileNo: '',
    tariff: 'Commercial',
    phase: 'Single',
    load: 'Single Phase 1 KW (Rs 4286)',
    photo: null as any,
    signature: null as any,
    documents: null as any,
    completionCertificate: null as any
  })

  const [newServiceConnectionIndustrialForm, setNewServiceConnectionIndustrialForm] = useState({
    nearestEbServiceNo: '',
    mobileNo: '',
    tariff: 'Industrial',
    phase: 'Single',
    load: 'Single Phase 1 KW (Rs 4886)',
    photo: null as any,
    signature: null as any,
    documents: null as any,
    udyamLtAgreement: null as any
  })

  const [tariffChangeForm, setTariffChangeForm] = useState({
    ebServiceNo: '',
    mobileNo: '',
    aadharNo: '',
    currentTariff: 'Domestic',
    requestedTariff: 'Commercial',
    phase: 'Single',
    load: 'Single Phase 2 KW (Rs 5086)',
    reason: '',
    photo: null as any,
    signature: null as any,
    documents: null as any
  })

  const [loadReductionForm, setLoadReductionForm] = useState({
    ebServiceNo: '',
    mobileNo: '',
    existingLoad: 'Single Phase 2 KW (Rs 5086)',
    reducedLoad: 'Single Phase 1 KW',
    documents: null as any
  })

  const [addlLoadDomesticForm, setAddlLoadDomesticForm] = useState({
    ebServiceNo: '',
    mobileNo: '',
    tariff: 'Domestic',
    phase: 'Single',
    requiredAdditionalLoad: '',
    photo: null as any,
    signature: null as any,
    documents: null as any
  })

  const [addlLoadTemporaryForm, setAddlLoadTemporaryForm] = useState({
    ebServiceNo: '',
    mobileNo: '',
    tariff: 'Temporary',
    phase: 'Single',
    requiredAdditionalLoad: '',
    photo: null as any,
    signature: null as any,
    documents: null as any
  })

  const [addlLoadCommercialForm, setAddlLoadCommercialForm] = useState({
    ebServiceNo: '',
    mobileNo: '',
    tariff: 'Commercial',
    phase: 'Single',
    requiredAdditionalLoad: '',
    photo: null as any,
    signature: null as any,
    documents: null as any,
    completionCertificate: null as any
  })

  const [addlLoadIndustrialForm, setAddlLoadIndustrialForm] = useState({
    ebServiceNo: '',
    mobileNo: '',
    tariff: 'Industrial',
    phase: 'Single',
    requiredAdditionalLoad: '',
    photo: null as any,
    signature: null as any,
    documents: null as any,
    udyamLtAgreement: null as any
  })

  // Admin Service Processing States
  const [selectedServiceApp, setSelectedServiceApp] = useState<any | null>(null)
  const [processingData, setProcessingData] = useState({
    referenceNo: '',
    demandPrint: '',
    demandPrintDataUrl: '',
    serviceUserId: '',
    servicePassword: ''
  })
  const [approvalConfig, setApprovalConfig] = useState(createDefaultApprovalConfig)

  const openApprovalModal = (user: any) => {
    setApprovalConfig({
      accountRole: user.accountRole || user.role || 'user',
      usernameMode: 'tree',
      serviceAccess: mergeServiceAccess(user.serviceAccess)
    })
    setSelectedUserForApproval(user)
  }

  const hasServiceAccess = (key: ServiceAccessKey) => {
    if (!currentUser) return true
    const access = mergeServiceAccess(currentUser.serviceAccess)
    return access[key] !== false
  }

  const openServiceAccessModal = (user: any) => {
    setSelectedUserForServiceAccess({
      ...user,
      serviceAccess: mergeServiceAccess(user.serviceAccess)
    })
  }

  const updateUserServiceAccess = (userId: number, serviceKey: ServiceAccessKey, isEnabled: boolean) => {
    setUsers(prev => prev.map(u =>
      u.id === userId
        ? {
          ...u,
          serviceAccess: {
            ...mergeServiceAccess(u.serviceAccess),
            [serviceKey]: isEnabled
          }
        }
        : u
    ))

    if (selectedUserForServiceAccess && selectedUserForServiceAccess.id === userId) {
      setSelectedUserForServiceAccess({
        ...selectedUserForServiceAccess,
        serviceAccess: {
          ...mergeServiceAccess(selectedUserForServiceAccess.serviceAccess),
          [serviceKey]: isEnabled
        }
      })
    }

    if (currentUser && currentUser.id === userId) {
      const updatedCurrentUser = {
        ...currentUser,
        serviceAccess: {
          ...mergeServiceAccess(currentUser.serviceAccess),
          [serviceKey]: isEnabled
        }
      }
      setCurrentUser(updatedCurrentUser)
      localStorage.setItem('portal_current_user', JSON.stringify(updatedCurrentUser))
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100
      const y = (e.clientY / window.innerHeight) * 100
      setMousePos({ x, y })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    if (step === 2) {
      generateCaptcha()
    }
  }, [step])

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCaptchaValue(result)
  }

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pincode = e.target.value.replace(/\D/g, '').slice(0, 6)
    setSignupData(prev => ({ ...prev, pincode }))

    if (pincode.length === 6) {
      setIsSearchingDistrict(true)
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
        const data = await response.json()
        if (data[0].Status === 'Success') {
          const district = data[0].PostOffice[0].District
          setSignupData(prev => ({ ...prev, district }))
        } else {
          setSignupData(prev => ({ ...prev, district: 'Not Found' }))
        }
      } catch (err) {
        console.error('Error fetching district:', err)
      } finally {
        setIsSearchingDistrict(false)
      }
    }
  }

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidTenDigitPhone(signupData.phone)) {
      alert('Phone Number must be exactly 10 digits')
      return
    }
    if (!isValidEmailAddress(signupData.email)) {
      alert('Please enter a valid email address')
      return
    }
    const newUser = {
      id: Date.now(),
      ...signupData,
      role: 'user',
      status: 'Pending'
    }
    setUsers([...users, newUser])
    alert('Signup Successful! Your account has been created.')
    setSignupData({
      name: '',
      fatherSpouseName: '',
      phone: '',
      email: '',
      shopName: '',
      address: '',
      pincode: '',
      state: 'Tamilnadu',
      district: ''
    })
    setStep(2) // Back to Login
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const deleteUser = (id: number) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(u => u.id !== id))
    }
  }


  const handleEnterPortal = () => {
    setStep(2)
  }

  const handleApprove = async (userId: number) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    let finalUsername = ''
    if (approvalConfig.usernameMode === 'tree') {
      finalUsername = `Tree${String(treeCounter).padStart(5, '0')}`
      setTreeCounter(prev => prev + 1)
    } else if (approvalConfig.usernameMode === 'phone') {
      finalUsername = user.phone
    } else {
      finalUsername = user.email
    }

    // Update User
    setUsers(prev => prev.map(u =>
      u.id === userId
        ? {
          ...u,
          status: 'Approved',
          username: finalUsername,
          password: 'Welcome@123',
          role: approvalConfig.accountRole,
          accountRole: approvalConfig.accountRole,
          serviceAccess: approvalConfig.serviceAccess,
          allocatedCredit: u.allocatedCredit || 0
        }
        : u
    ))

    setSelectedUserForApproval(null)

    // --- Real Notification Logic ---
    setNotificationSteps(['Initializing secure connection...'])

    try {
      // 1. Generate Username Step
      await new Promise(resolve => setTimeout(resolve, 800))
      setNotificationSteps(prev => [...prev, `Username Created: ${finalUsername}`])

      // 2. Email Notification via EmailJS
      setNotificationSteps(prev => [...prev, 'Sending email notification...'])
      try {
        await emailjs.send(
          import.meta.env.VITE_EMAILJS_SERVICE_ID,
          import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
          {
            to_name: user.name,
            to_email: user.email,
            username: finalUsername,
            password: 'Welcome@123',
            shop_name: user.shopName
          },
          import.meta.env.VITE_EMAILJS_PUBLIC_KEY
        )
        setNotificationSteps(prev => [...prev, 'Email notification sent successfully!'])
      } catch (emailErr) {
        console.error('EmailJS Error:', emailErr)
        setNotificationSteps(prev => [...prev, '❌ Email failed (check API keys)'])
      }

      // 3. SMS Notification via Twilio
      setNotificationSteps(prev => [...prev, 'Sending SMS to mobile number...'])
      try {
        const smsMsg = `Welcome ${user.name}! Your account for ${user.shopName} has been approved. Username: ${finalUsername}, Password: Welcome@123`
        const twilioAuth = btoa(`${import.meta.env.VITE_TWILIO_ACCOUNT_SID}:${import.meta.env.VITE_TWILIO_AUTH_TOKEN}`)

        const smsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${import.meta.env.VITE_TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${twilioAuth}`
          },
          body: new URLSearchParams({
            To: user.phone,
            From: import.meta.env.VITE_TWILIO_PHONE_NUMBER,
            Body: smsMsg
          })
        })

        if (smsRes.ok) {
          setNotificationSteps(prev => [...prev, 'SMS sent to mobile number via Twilio.'])
        } else {
          throw new Error('Twilio SMS Failed')
        }
      } catch (smsErr) {
        console.error('Twilio SMS Error:', smsErr)
        setNotificationSteps(prev => [...prev, '❌ SMS failed (check Twilio config)'])
      }

      // 4. WhatsApp Notification via Twilio
      setNotificationSteps(prev => [...prev, 'Sending WhatsApp confirmation...'])
      try {
        const waAuth = btoa(`${import.meta.env.VITE_TWILIO_ACCOUNT_SID}:${import.meta.env.VITE_TWILIO_AUTH_TOKEN}`)

        const waRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${import.meta.env.VITE_TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${waAuth}`
          },
          body: new URLSearchParams({
            To: `whatsapp:${user.phone}`,
            From: `whatsapp:${import.meta.env.VITE_TWILIO_PHONE_NUMBER}`,
            Body: `Welcome ${user.name}! Your account is ready. Username: ${finalUsername}, Password: Welcome@123`
          })
        })

        if (waRes.ok) {
          setNotificationSteps(prev => [...prev, 'WhatsApp confirmation delivered.'])
        } else {
          throw new Error('Twilio WhatsApp Failed')
        }
      } catch (waErr) {
        console.error('Twilio WhatsApp Error:', waErr)
        setNotificationSteps(prev => [...prev, '❌ WhatsApp failed (check config)'])
      }

      setNotificationSteps(prev => [...prev, '✅ Notification process completed.'])
    } catch (err) {
      console.error('Notification Error:', err)
      setNotificationSteps(prev => [...prev, '❌ Error: System processing failed.'])
    }

    setTimeout(() => setNotificationSteps([]), 5000)
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const loginId = username.trim()
    const loginPassword = password
    const normalizedLoginPhone = normalizePhoneInput(loginId)

    // 1. Admin Login Check
    if (loginId.toLowerCase() === 'admin' && loginPassword === 'Rasool@' && captchaInput.toUpperCase() === captchaValue) {
      alert('Login Successful! Welcome to the Admin Portal.')
      setIsLoggedIn(true)
      setUserRole('admin')
      return;
    }

    // 2. Captcha Check (for all users)
    if (captchaInput.toUpperCase() !== captchaValue) {
      setError('Invalid captcha. Please try again.')
      generateCaptcha()
      setCaptchaInput('')
      return;
    }

    // 3. User Login Check (for approved users)
    const foundUser = users.find(u =>
      u.status === 'Approved' &&
      u.password === loginPassword &&
      (
        (u.username || '').toLowerCase() === loginId.toLowerCase() ||
        (u.email || '').toLowerCase() === loginId.toLowerCase() ||
        normalizePhoneInput(u.phone || '') === normalizedLoginPhone
      )
    );

    if (foundUser) {
      alert(`Login Successful! Welcome ${foundUser.name}.`);
      setIsLoggedIn(true);
      setUserRole('user');
      setCurrentUser(foundUser);
      setActiveTab('Profile');
      localStorage.setItem('portal_current_user', JSON.stringify(foundUser));
    } else {
      setError('Invalid credentials or account pending approval.');
    }
  }

  const handleAddFunds = () => {
    setIsAddFundsModalOpen(true);
    setPaymentStep(1);
    setAddFundsAmount('500');
  };

  const handleRazorpayPayment = async () => {
    const amount = parseFloat(addFundsAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // 1. Fetch Order ID from backend
    let order_id = '';
    try {
      const resp = await fetch(`${API_BASE}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error);
      order_id = data.order_id;
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend. Make sure the Node server is running on port 5000.');
      return;
    }

    // Helper to record transaction and update user state
    const finalizePayment = async (simulatedOrderId: string) => {
      try {
        const verifyResp = await fetch(`${API_BASE}/api/verify-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: simulatedOrderId,
            razorpay_payment_id: 'pay_sim_' + Date.now(),
            razorpay_signature: 'sim_signature'
          })
        });
        const verifyData = await verifyResp.json();
        if (!verifyData.success) throw new Error(verifyData.error);

        const newTransaction = {
          id: Date.now(),
          type: 'Credit',
          amount: amount,
          date: new Date().toISOString().split('T')[0],
          status: 'Success',
          description: `Add Money via Razorpay (Ref: ${simulatedOrderId.slice(-10)})`
        };

        const updatedBalance = (currentUser.walletBalance || 0) + amount;
        const updatedUser = {
          ...currentUser,
          walletBalance: updatedBalance,
          transactions: [newTransaction, ...(currentUser.transactions || [])]
        };

        setCurrentUser(updatedUser);
        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
        localStorage.setItem('portal_current_user', JSON.stringify(updatedUser));
        setPaymentStep(4);
      } catch (err: any) {
        alert('Verification Failed: ' + err.message);
      }
    };

    // 2. DEMO MODE — bypasses Razorpay modal (fake key won't authenticate with live servers)
    if (order_id.startsWith('order_sim_')) {
      setPaymentStep(2); // show processing state briefly
      setTimeout(() => finalizePayment(order_id), 1800);
      return;
    }

    // 3. LIVE MODE — Load Razorpay SDK and open checkout modal
    const sdkLoaded = await new Promise((resolve) => {
      if ((window as any).Razorpay) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

    if (!sdkLoaded) {
      alert('Razorpay SDK failed to load. Are you online?');
      return;
    }

    const options: any = {
      key: 'rzp_test_TYxxQkZzzXzzZZ',
      amount: (amount * 100).toString(),
      currency: 'INR',
      name: 'Skytree Admin Portal',
      description: 'Wallet Recharge',
      order_id: order_id,
      theme: { color: '#3b82f6' },
      handler: async function (response: any) {
        try {
          const verifyResp = await fetch(`${API_BASE}/api/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response)
          });
          const verifyData = await verifyResp.json();
          if (!verifyData.success) throw new Error(verifyData.error);

          const newTransaction = {
            id: Date.now(),
            type: 'Credit',
            amount: amount,
            date: new Date().toISOString().split('T')[0],
            status: 'Success',
            description: `Add Money via Razorpay (Order: ${order_id})`
          };

          const updatedBalance = (currentUser.walletBalance || 0) + amount;
          const updatedUser = {
            ...currentUser,
            walletBalance: updatedBalance,
            transactions: [newTransaction, ...(currentUser.transactions || [])]
          };

          setCurrentUser(updatedUser);
          setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
          localStorage.setItem('portal_current_user', JSON.stringify(updatedUser));
          setPaymentStep(4);
        } catch (err: any) {
          alert('Verification Failed: ' + err.message);
        }
      },
      prefill: {
        name: currentUser?.name || 'User',
        email: currentUser?.email || 'user@email.com',
        contact: currentUser?.phone || '9999999999',
      },
    };

    const paymentObject = new (window as any).Razorpay(options);
    paymentObject.on('payment.failed', function (response: any) {
      alert(`Payment failed! Reason: ${response.error.description}`);
    });
    paymentObject.open();
  };

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUserRole(null)
    setCurrentUser(null)
    setStep(1)
    setUsername('')
    setPassword('')
    setCaptchaInput('')
    setError('')
    localStorage.removeItem('portal_current_user')
  }

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    if (!isValidTenDigitPhone(editData?.phone || '')) {
      alert('Phone Number must be exactly 10 digits')
      return
    }

    // Update main users list
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...editData } : u))

    // Update current user session
    const updatedUser = { ...currentUser, ...editData }
    setCurrentUser(updatedUser)
    localStorage.setItem('portal_current_user', JSON.stringify(updatedUser))

    setIsEditing(false)
    alert('Profile updated successfully!')
  }

  const handlePhotoUpload = (processed: ProcessedFile) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      setEditData((prev: any) => ({ ...prev, photo: reader.result as string }))
    }
    reader.readAsDataURL(processed.compressedFile as Blob)
  }

  const startEditing = () => {
    setEditData({ ...currentUser })
    setIsEditing(true)
  }

  const callUmangAPI = async (endpoint: string, data: any, customHeaders: any = {}) => {
    setIsApiLoading(true)
    setApiResponse(null)
    const apiKey = import.meta.env.VITE_UMANG_X_API_KEY
    if (!apiKey || apiKey.includes('xxxxxxxx')) {
      setApiResponse({ error: 'Umang API key not configured. Add a valid VITE_UMANG_X_API_KEY to your .env file.' })
      setIsApiLoading(false)
      return
    }
    try {
      const flatData: Record<string, string> = {}
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined && v !== null) flatData[k] = String(v)
      }
      const srvid = customHeaders.srvid || '1117'
      const basePath = endpoint.startsWith('/') ? endpoint : '/' + endpoint
      const url = import.meta.env.DEV
        ? `/umang${basePath}`
        : `https://apigw.umangapp.in${basePath}`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'deptid': '185',
          'srvid': srvid,
          'subsid': '0',
          'subsid2': '0',
          'formtrkr': '0',
          'x-api-key': apiKey,
          ...customHeaders
        },
        body: new URLSearchParams(flatData)
      })
      const text = await response.text()
      if (!response.ok) {
        setApiResponse({ error: `Request failed (${response.status})`, errorDescription: text.slice(0, 200) })
        setIsApiLoading(false)
        return
      }
      let result: any
      try {
        result = text ? JSON.parse(text) : {}
      } catch {
        setApiResponse({ error: 'Invalid JSON response', errorDescription: text.slice(0, 200) })
        setIsApiLoading(false)
        return
      }
      setApiResponse(result)
    } catch (err: any) {
      const msg = err?.message || 'Failed to connect to Umang API'
      const isCors = msg.toLowerCase().includes('cors') || msg.toLowerCase().includes('network')
      setApiResponse({
        error: isCors
          ? 'Connection blocked (CORS). Umang may require server-side requests. See browser console.'
          : msg
      })
      console.error('Umang API Error:', err)
    } finally {
      setIsApiLoading(false)
    }
  }

  const callSetuAPI = async (endpointOrUrl: string, payload: any) => {
    setIsApiLoading(true)
    setApiResponse(null)
    const apiKey = import.meta.env.VITE_API_SETU_KEY
    if (!apiKey || apiKey === 'your_api_setu_key_here') {
      setApiResponse({ error: 'API Setu key not configured. Add VITE_API_SETU_KEY to your .env file. Get keys at https://partners.apisetu.gov.in' })
      setIsApiLoading(false)
      return
    }
    try {
      let url = ''

      if (endpointOrUrl.startsWith('http')) {
        // Full URL passed (used for TN eDistrict in production)
        if (import.meta.env.DEV && endpointOrUrl.startsWith('https://apisetu.gov.in')) {
          const afterHost = endpointOrUrl.replace('https://apisetu.gov.in', '')
          if (afterHost.startsWith('/certificate/v3/edistricttn')) {
            const rest = afterHost.replace('/certificate/v3/edistricttn', '')
            url = `/apisetu-edistricttn${rest || ''}`
          } else if (afterHost.startsWith('/certificate/v3/crstn')) {
            const rest = afterHost.replace('/certificate/v3/crstn', '')
            url = `/apisetu-crstn${rest || ''}`
          } else {
            url = endpointOrUrl
          }
        } else {
          url = endpointOrUrl
        }
      } else {
        const path = endpointOrUrl.startsWith('/') ? endpointOrUrl : '/' + endpointOrUrl
        if (import.meta.env.DEV) {
          url = `/apisetu-crstn${path}`
        } else {
          url = `https://apisetu.gov.in/certificate/v3/crstn${path}`
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-APISETU-APIKEY': apiKey,
          'X-APISETU-CLIENTID': import.meta.env.VITE_API_SETU_CLIENT_ID || 'in.gov.apisetu'
        },
        body: JSON.stringify(payload)
      })

      const contentType = response.headers.get('Content-Type') || ''
      if (contentType.includes('application/pdf')) {
        const blob = await response.blob()
        const blobUrl = window.URL.createObjectURL(blob)
        setApiResponse({ success: true, pdfUrl: blobUrl, rd: 'Certificate Generated Successfully' })
      } else if (!response.ok) {
        let errMsg = `Request failed (${response.status})`
        try {
          const errBody = await response.json()
          errMsg = errBody.errorDescription || errBody.message || errBody.rd || errMsg
        } catch {
          try {
            errMsg = await response.text() || errMsg
          } catch { /* ignore */ }
        }
        setApiResponse({ error: errMsg, errorDescription: errMsg })
      } else {
        const result = await response.json()
        setApiResponse(result)
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to connect to API Setu'
      const isCors = msg.toLowerCase().includes('cors') || msg.toLowerCase().includes('network')
      setApiResponse({
        error: isCors
          ? 'Connection blocked (CORS). These APIs may require a backend proxy. See browser console for details.'
          : msg
      })
      console.error('API Setu Error:', err)
    } finally {
      setIsApiLoading(false)
    }
  }

  const handleCibilCheck = async () => {
    const { firstName, lastName, mobile, pan, dob, pincode, address } = cibilForm;
    if (!firstName.trim() || !lastName.trim() || !mobile.trim() || !pan.trim() || !dob || !pincode.trim() || !address.trim()) {
      alert('Please fill in all fields (Name, DOB, Mobile, PAN, Pincode, and Address).');
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      alert('Invalid PAN format. Expected: ABCDE1234F');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      alert('Invalid mobile number.');
      return;
    }

    // Wallet Check
    const serviceFee = 50.00;
    if ((currentUser?.walletBalance || 0) < serviceFee) {
      alert(`Insufficient Wallet Balance! This service requires ₹${serviceFee.toFixed(2)}.`);
      return;
    }

    // Non-refundable Confirmation
    const confirmMsg = `IMPORTANT NOTE:\n\nOnce you submit information to the Bureau, refunds won't be possible.\n\n₹${serviceFee.toFixed(2)} will be debited from your wallet.\n\nDo you want to continue?`;
    if (!window.confirm(confirmMsg)) return;

    setCibilResult(null);
    setCibilLoading(true);
    setCibilStep(1);

    // Sequence Simulation
    await new Promise(r => setTimeout(r, 1200));
    setCibilStep(2);
    await new Promise(r => setTimeout(r, 1000));
    setCibilStep(3);
    await new Promise(r => setTimeout(r, 800));

    // Deep Mock Data Factory
    const panHash = pan.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const score = 580 + (panHash % 320);

    const getCategory = (s: number) => {
      if (s >= 750) return { label: 'Excellent', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' };
      if (s >= 700) return { label: 'Good', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' };
      if (s >= 650) return { label: 'Fair', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' };
      return { label: 'Poor', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' };
    };
    const cat = getCategory(score);

    const newReport = {
      id: `CIB-${Date.now()}`,
      referenceId: `REF${Math.floor(Math.random() * 900000 + 100000)}`,
      status: 'Completed',
      created_at: new Date().toISOString(),
      reportDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      score,
      ...cat,
      personal: {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        dob,
        mobile,
        pan,
        pincode,
        address,
        gender: panHash % 2 === 0 ? 'Male' : 'Female',
        age: 2026 - parseInt(dob.split('-')[0]),
        occupation: panHash % 3 === 0 ? 'Salaried' : 'Self-Employed'
      },
      employment: {
        occupationCode: panHash % 3 === 0 ? '01' : '02',
        income: `₹ ${((panHash % 100) * 1000 + 25000).toLocaleString('en-IN')}`,
        netIncome: `₹ ${((panHash % 100) * 800 + 20000).toLocaleString('en-IN')}`,
        monthlyIncome: `₹ ${((panHash % 100) * 800 + 20000).toLocaleString('en-IN')}`
      },
      summary: {
        noOfAccounts: Math.min(12, 2 + (panHash % 10)),
        noOfActiveAccounts: Math.min(8, 1 + (panHash % 6)),
        noOfZeroBalanceAccounts: panHash % 3,
        noOfWriteOffs: score < 600 ? 1 : 0,
        totalPastDue: score < 650 ? `₹ ${(panHash % 50 * 500 + 5000).toLocaleString('en-IN')}` : '₹ 0',
        totalBalanceAmount: `₹ ${((panHash % 50) * 12000 + 40000).toLocaleString('en-IN')}`,
        totalSanctionAmount: `₹ ${((panHash % 50) * 18000 + 120000).toLocaleString('en-IN')}`,
        recentAccount: '14-Jan-2026',
        oldestAccount: '05-May-2018',
        mostSevereStatusWithIn24Months: score < 600 ? '90+ DPD' : score < 700 ? '30+ DPD' : 'STANDARD'
      },
      accounts: [
        { institution: 'HDFC BANK LTD', type: 'PERSONAL LOAN', balance: '₹ 45,000', status: 'ACTIVE', opened: '10-Jun-2023', pastDues: score < 650 ? '₹ 5,000' : '' },
        { institution: 'ICICI BANK', type: 'CREDIT CARD', balance: '₹ 12,500', status: 'ACTIVE', opened: '22-Nov-2021', pastDues: '' },
        { institution: 'SBI CARDS', type: 'CREDIT CARD', balance: '₹ 0', status: 'CLOSED', opened: '15-Mar-2019', pastDues: '' },
      ],
      history48: Array.from({ length: 48 }, (_, i) => ({
        month: new Date(2026, 3 - i, 1).toLocaleString('default', { month: 'short', year: '2-digit' }),
        status: i > 6 && score < 680 && (i % 8 === 0 || i % 9 === 0) ? '030' : '000',
        legal: '*',
        asset: 'STD'
      })).reverse(),
      enquirySummary: {
        totalEnquiries: Math.min(15, 3 + (panHash % 7)),
        enquiriesPast30Days: panHash % 2,
        enquiriesPast12Months: Math.min(8, 1 + (panHash % 5))
      },
      enquiries: [
        { institution: 'SBI CARDS', date: '01-Mar-2026', purpose: 'CREDIT CARD', amount: '₹ 50,000' },
        { institution: 'AXIS BANK', date: '15-Dec-2025', purpose: 'PERSONAL LOAN', amount: '₹ 2,00,000' },
        { institution: 'BAJAJ FINANCE', date: '10-Oct-2025', purpose: 'CONSUMER LOAN', amount: '₹ 35,000' }
      ]
    };

    // Deduct Funds & Record Transaction
    const newTransaction = {
      id: Date.now(),
      type: 'Debit',
      amount: serviceFee,
      date: new Date().toISOString().split('T')[0],
      status: 'Success',
      description: `CIBIL Report Fee (Ref: ${newReport.referenceId})`
    };

    const updatedUser = {
      ...currentUser,
      walletBalance: currentUser.walletBalance - serviceFee,
      transactions: [newTransaction, ...(currentUser.transactions || [])]
    };

    // Update States
    setCurrentUser(updatedUser);
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    setCibilHistory([newReport, ...cibilHistory]);
    setCibilResult(newReport);
    setCibilLoading(false);
    setCibilStep(0);
    setActiveCibilSubView('report');
  };

  const adminWalletBalance = users.find(u => (u.accountRole || u.role) === 'admin')?.walletBalance || 0

  return (
    <>
      <div className="bg-mesh" />
      <div
        className="bg-animate"
        style={{
          '--mouse-x': `${mousePos.x}%`,
          '--mouse-y': `${mousePos.y}%`
        } as React.CSSProperties}
      />

      {isLoggedIn && (
        <nav className="navbar">
          <div className="nav-container">
            <div className="nav-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
              </svg>
              <span>ADMIN PORTAL</span>
              <span className="role-indicator">({userRole})</span>
            </div>
            {userRole === 'admin' && (
              <button className="wallet-btn" title="Admin Wallet" onClick={() => setActiveTab('Service Finance')}>
                <div className="wallet-icon-wrapper">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                    <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                    <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
                  </svg>
                </div>
                <div className="wallet-info-mini">
                  <span className="wallet-label">Admin Wallet</span>
                  <span className="wallet-amount">₹ {adminWalletBalance.toFixed(2)}</span>
                </div>
              </button>
            )}
            {userRole === 'user' && (
              <button className="wallet-btn" title="Add Money" onClick={() => setActiveTab('Add Money')}>
                <div className="wallet-icon-wrapper">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                    <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                    <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
                  </svg>
                </div>
                <div className="wallet-info-mini">
                  <span className="wallet-label">Add Money</span>
                  <span className="wallet-amount">₹ {(currentUser?.walletBalance || 0).toFixed(2)}</span>
                </div>
              </button>
            )}
            <div className="nav-controls">
              <button
                className="theme-toggle-btn"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
              <button
                className="sidebar-toggle-btn responsive-only"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title="Toggle sidebar"
                aria-label="Toggle sidebar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <button className="logout-btn" onClick={handleLogout}>
                <span>Logout</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </div>
          </div>
        </nav>
      )}

      {isLoggedIn && userRole === 'user' && (
        <div className="services-ticker">
          <div className="ticker-content">
            {[
              "State Government Services",
              "Bank Services",
              "PAN Services",
              "Bill Payments Services",
              "Recharge Services",
              "Fast Tag Services"
            ].map((service, i) => (
              <span key={i} className="ticker-item">
                <span className="ticker-dot">•</span>
                {service}
              </span>
            ))}
            {/* Duplicate for seamless loop */}
            {[
              "State Government Services",
              "Bank Services",
              "PAN Services",
              "Bill Payments Services",
              "Recharge Services",
              "Fast Tag Services"
            ].map((service, i) => (
              <span key={`dup-${i}`} className="ticker-item">
                <span className="ticker-dot">•</span>
                {service}
              </span>
            ))}
          </div>
        </div>
      )}

      <main
        className={`${isLoggedIn ? "dashboard-container" : "auth-container"} ${isLoggedIn && userRole === 'user' ? 'with-ticker' : ''}`}
        style={isLoggedIn ? ({ '--sidebar-width': `${sidebarCollapsed ? 72 : sidebarWidth}px` } as React.CSSProperties) : undefined}
      >
        {isLoggedIn ? (
          <>
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
              <button
                className="sidebar-collapse-btn"
                onClick={() => setSidebarCollapsed(prev => !prev)}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                )}
                <span>{sidebarCollapsed ? 'Expand' : 'Collapse'}</span>
              </button>
              <div className="sidebar-items">
                {userRole === 'admin' ? (
                  <>
                    <button
                      className={`sidebar-item ${activeTab === 'Overview' ? 'active' : ''}`}
                      onClick={() => setActiveTab('Overview')}
                    >
                      <span className="sidebar-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                      </span>
                      <span>Overview</span>
                    </button>
                    <button
                      className={`sidebar-item ${activeTab === 'Users Data' ? 'active' : ''}`}
                      onClick={() => setActiveTab('Users Data')}
                    >
                      <span className="sidebar-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      </span>
                      <span>Users Data</span>
                    </button>
                    <button
                      className={`sidebar-item ${activeTab === 'Service Applications' ? 'active' : ''}`}
                      onClick={() => setActiveTab('Service Applications')}
                    >
                      <span className="sidebar-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                      </span>
                      <span>Service Apps</span>
                    </button>
                    <button
                      className={`sidebar-item ${activeTab === 'User Control' ? 'active' : ''}`}
                      onClick={() => setActiveTab('User Control')}
                    >
                      <span className="sidebar-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 10.5 3.1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 20.91 10H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                      </span>
                      <span>User Control</span>
                    </button>
                    <button
                      className={`sidebar-item ${activeTab === 'Service Finance' ? 'active' : ''}`}
                      onClick={() => setActiveTab('Service Finance')}
                    >
                      <span className="sidebar-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                      </span>
                      <span>Service Finance</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={`sidebar-item ${activeTab === 'Profile' ? 'active' : ''}`}
                      onClick={() => setActiveTab('Profile')}
                    >
                      <span className="sidebar-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      </span>
                      <span>Profile</span>
                    </button>
                    <button
                      className={`sidebar-item ${activeTab === 'Services' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab('Services')
                        setActiveServiceCategory(null)
                        setActiveServiceSubTab(null)
                      }}
                    >
                      <span className="sidebar-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                      </span>
                      <span>Services</span>
                    </button>
                    <button
                      className={`sidebar-item ${activeTab === 'Service Reports' ? 'active' : ''}`}
                      onClick={() => setActiveTab('Service Reports')}
                    >
                      <span className="sidebar-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                      </span>
                      <span>Service Reports</span>
                    </button>
                    <button
                      className={`sidebar-item ${activeTab === 'Add Money' ? 'active' : ''}`}
                      onClick={() => {
                        if (!hasServiceAccess('addMoney')) return alert('You do not have access to Add Money.')
                        setActiveTab('Add Money')
                      }}
                    >
                      <span className="sidebar-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                          <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                          <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
                        </svg>
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>Add Money</span>
                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>₹ {(currentUser?.walletBalance || 0).toFixed(2)}</span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </aside>

            <div
              className="sidebar-resizer"
              onMouseDown={() => {
                if (window.innerWidth < 768) return
                setIsSidebarResizing(true)
              }}
              title="Resize sidebar"
              aria-label="Resize sidebar"
            />

            <div className="content-area">
              <div className={`glass-card dashboard-card ${activeTab === 'Service Finance' ? 'service-finance-full-view' : ''}`}>
                {activeTab !== 'Services' && (
                  <header className="auth-header" style={{ textAlign: 'left', marginBottom: '12px' }}>
                    <h1 className="h1">{activeTab}</h1>
                    <p className="p">Manage system parameters and user activities.</p>
                  </header>
                )}

                {activeTab === 'Overview' && (
                  <div className="dashboard-content">
                    <div className="stats-grid">
                      {[
                        { label: 'Total Users', value: users.length.toString(), trend: '+12%', icon: '👥' },
                        { label: 'Pending Approvals', value: users.filter(u => u.status === 'Pending').length.toString(), trend: 'Action Req', icon: '⏳' },
                        { label: 'Server Status', value: '99.9%', trend: 'Stable', icon: '⚡' },
                        { label: 'Active Sessions', value: '24', trend: '+3', icon: '🛡️' }
                      ].map((stat, i) => (
                        <div key={i} className="stat-card">
                          <div className="stat-icon">{stat.icon}</div>
                          <div className="stat-info">
                            <span className="stat-label">{stat.label}</span>
                            <span className="stat-value">{stat.value}</span>
                          </div>
                          <span className={`stat-trend ${stat.trend.includes('+') ? 'up' : ''}`}>
                            {stat.trend}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="table-container">
                      <h3 style={{margin: '24px 0 16px', color: 'var(--text-main)' }}>Recent System Activity</h3>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Module</th>
                            <th>Action</th>
                            <th>Time</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { module: 'Auth', action: 'New Registration', time: '2 mins ago', status: 'Pending' },
                            { module: 'System', action: 'Cache Cleared', time: '15 mins ago', status: 'Completed' },
                            { module: 'Users', action: 'Role Updated', time: '1 hr ago', status: 'Completed' },
                            { module: 'Security', action: 'Audit Log Export', time: '3 hrs ago', status: 'Completed' }
                          ].map((row, i) => (
                            <tr key={i}>
                              <td>{row.module}</td>
                              <td>{row.action}</td>
                              <td>{row.time}</td>
                              <td>
                                <span className={`status-badge ${row.status.toLowerCase()}`}>
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'Users Data' && (
                  userRole === 'admin' ? (
                    <div className="dashboard-content">
                      <div className="search-bar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input
                          type="text"
                          placeholder="Search users by name or email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="search-input"
                        />
                      </div>
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Shop Name</th>
                              <th>Email</th>
                              <th>Phone</th>
                              <th>District</th>
                              <th>Username</th>
                              <th>Password</th>
                              <th>Role</th>
                              <th>Status</th>
                              <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.length > 0 ? (
                              filteredUsers.map((u) => (
                                <tr key={u.id}>
                                  <td>{u.name}</td>
                                  <td>{u.shopName || 'N/A'}</td>
                                  <td>{u.email}</td>
                                  <td>{u.phone}</td>
                                  <td>{u.district}</td>
                                  <td>
                                    <code style={{ background: 'var(--glass-highlight)', padding: '2px 4px', borderRadius: '4px', fontSize: '12px' }}>
                                      {u.username || '---'}
                                    </code>
                                  </td>
                                  <td>
                                    <span style={{ fontSize: '12px', opacity: 0.8 }}>
                                      {u.password || '---'}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`role-badge ${u.role}`}>
                                      {u.role}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`status-badge ${u.status === 'Approved' ? 'approved' : 'pending'}`}>
                                      {u.status || 'Pending'}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button
                                      className="action-btn view"
                                      onClick={() => setViewingUser(u)}
                                      title="View Details"
                                    >
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    </button>
                                    {u.status !== 'Approved' && u.role !== 'admin' && (
                                      <button
                                        className="action-btn approve"
                                        onClick={() => openApprovalModal(u)}
                                        title="Approve User"
                                      >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                      </button>
                                    )}
                                    <button
                                      className="action-btn"
                                      onClick={() => openServiceAccessModal(u)}
                                      title="Manage Service Access"
                                    >
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 10.5 3.1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 20.91 10H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                    </button>
                                    <button
                                      className="action-btn delete"
                                      onClick={() => deleteUser(u.id)}
                                      title="Delete User"
                                      disabled={u.role === 'admin'}
                                    >
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={10} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                                  No users found matching your search.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="placeholder-view">
                      <div className="pulse-circle" style={{ background: '#ef4444' }}></div>
                      <h2 className="h1" style={{ fontSize: '24px', color: 'var(--text-main)' }}>Access Denied</h2>
                      <p style={{ color: 'var(--text-muted)' }}>You do not have administrative privileges to view this section.</p>
                    </div>
                  )
                )}

                {activeTab === 'User Control' && userRole === 'admin' && (
                  <div className="dashboard-content" style={{ display: 'grid', gap: '16px' }}>
                    <div className="glass-card" style={{ padding: '20px' }}>
                      <h3 style={{marginTop: 0, marginBottom: '12px', color: 'var(--text-main)' }}>Assign Service Access</h3>
                      <div className="profile-grid">
                        <div className="profile-field profile-full-width">
                          <span className="profile-label">Select Service</span>
                          <select className="input-field" value={userControlSelectedServiceKey} onChange={(e) => setUserControlSelectedServiceKey(e.target.value)}>
                            {serviceCatalog.map(service => (
                              <option key={service.key} value={service.key}>{service.label} ({service.key})</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                        <button className="btn-primary" onClick={() => applyServiceAccessForAllUsers(userControlSelectedServiceKey, true)}>Enable For All Users</button>
                        <button className="btn-primary" style={{ background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)' }} onClick={() => applyServiceAccessForAllUsers(userControlSelectedServiceKey, false)}>Disable For All Users</button>
                      </div>

                      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
                        <div className="profile-grid">
                          <div className="profile-field">
                            <span className="profile-label">Target Role</span>
                            <select className="input-field" value={userControlRoleTarget} onChange={(e) => setUserControlRoleTarget(e.target.value as 'admin' | ApprovalRole)}>
                              <option value="user">User</option>
                              <option value="employee">Employee</option>
                              <option value="distributor">Distributor</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                          <button className="btn-primary" onClick={() => applyServiceAccessByRole(userControlSelectedServiceKey, userControlRoleTarget, true)}>Enable For Role</button>
                          <button className="btn-primary" style={{ background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)' }} onClick={() => applyServiceAccessByRole(userControlSelectedServiceKey, userControlRoleTarget, false)}>Disable For Role</button>
                        </div>
                      </div>

                      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
                        <div className="profile-grid">
                          <div className="profile-field">
                            <span className="profile-label">Target User ID</span>
                            <input
                              className="input-field"
                              type="number"
                              min="1"
                              value={userControlUserIdTarget}
                              onChange={(e) => setUserControlUserIdTarget(e.target.value)}
                              placeholder="Enter user ID"
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                          <button className="btn-primary" onClick={() => applyServiceAccessByUserId(userControlSelectedServiceKey, userControlUserIdTarget, true)}>Enable For User ID</button>
                          <button className="btn-primary" style={{ background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)' }} onClick={() => applyServiceAccessByUserId(userControlSelectedServiceKey, userControlUserIdTarget, false)}>Disable For User ID</button>
                        </div>
                      </div>

                      <div style={{ marginTop: '16px', padding: '12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.08)', fontSize: '12px', color: 'var(--text-muted)' }}>
                        You can assign by all users, role, or a specific user ID from this page.
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Service Finance' && userRole === 'admin' && (
                  <div className="dashboard-content" style={{ display: 'grid', gap: '16px' }}>
                    <div className="glass-card service-finance-panel" style={{ padding: '20px' }}>
                      <h3 style={{marginTop: 0, marginBottom: '12px', color: 'var(--text-main)' }}>Service Payout and Profit Matrix</h3>
                      <p style={{ margin: '0 0 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        Profit = User Charge - Payout (with GST) - Distributor - Employee
                      </p>

                      <div className="table-container service-finance-table-container">
                        <table className="data-table service-finance-table">
                          <thead>
                            <tr>
                              <th>Service</th>
                              <th>Amount Payout</th>
                              <th>Distributor</th>
                              <th>Employee</th>
                              <th>User</th>
                              <th>Profit</th>
                              <th>TDS</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {serviceCatalog.map((service) => {
                              const row = getFinanceRow(service.key)
                              const gst = getGstBreakup(row)
                              const tdsAmount = gst.baseAmount * (toAmount(row.tdsRate) / 100)
                              const profit = calculateServiceProfit(row)
                              const distributors = users.filter(u => (u.accountRole || u.role) === 'distributor' && u.status === 'Approved')
                              const employees = users.filter(u => (u.accountRole || u.role) === 'employee' && u.status === 'Approved')
                              const serviceUsers = users.filter(u => (u.accountRole || u.role) === 'user' && u.status === 'Approved')

                              return (
                                <tr key={service.key}>
                                  <td>
                                    <div style={{ fontWeight: 700 }}>{service.label}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{service.key}</div>
                                  </td>

                                  <td style={{ minWidth: '180px' }}>
                                    <input
                                      className="input-field"
                                      type="number"
                                      min="0"
                                      placeholder="Payout"
                                      value={row.payoutAmount}
                                      onChange={(e) => updateServiceFinanceRow(service.key, { payoutAmount: e.target.value })}
                                    />
                                    <button
                                      className="btn-primary"
                                      style={{ marginTop: '6px', padding: '6px 10px', fontSize: '12px' }}
                                      onClick={() => setGstPopupServiceKey(service.key)}
                                    >
                                      GST Calculator
                                    </button>
                                    <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                      Total: ₹{gst.totalAmount.toFixed(2)}
                                    </div>
                                  </td>

                                  <td style={{ minWidth: '220px' }}>
                                    <select
                                      className="input-field"
                                      value={row.distributorId}
                                      onChange={(e) => updateServiceFinanceRow(service.key, { distributorId: e.target.value })}
                                    >
                                      <option value="">Select distributor</option>
                                      <option value={ALL_DISTRIBUTORS}>All Distributors</option>
                                      {distributors.map(d => <option key={d.id} value={d.id}>{d.name} (ID {d.id})</option>)}
                                    </select>
                                    <input
                                      className="input-field"
                                      type="number"
                                      min="0"
                                      style={{ marginTop: '6px' }}
                                      placeholder="Distributor amount"
                                      value={row.distributorAmount}
                                      onChange={(e) => updateServiceFinanceRow(service.key, { distributorAmount: e.target.value })}
                                    />
                                  </td>

                                  <td style={{ minWidth: '220px' }}>
                                    <select
                                      className="input-field"
                                      value={row.employeeId}
                                      onChange={(e) => updateServiceFinanceRow(service.key, { employeeId: e.target.value })}
                                    >
                                      <option value="">Select employee</option>
                                      <option value={ALL_EMPLOYEES}>All Employees</option>
                                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} (ID {emp.id})</option>)}
                                    </select>
                                    <input
                                      className="input-field"
                                      type="number"
                                      min="0"
                                      style={{ marginTop: '6px' }}
                                      placeholder="Employee amount"
                                      value={row.employeeAmount}
                                      onChange={(e) => updateServiceFinanceRow(service.key, { employeeAmount: e.target.value })}
                                    />
                                  </td>

                                  <td style={{ minWidth: '220px' }}>
                                    <select
                                      className="input-field"
                                      value={row.userId}
                                      onChange={(e) => updateServiceFinanceRow(service.key, { userId: e.target.value })}
                                    >
                                      <option value="">Select user</option>
                                      <option value={ALL_USERS}>All Users</option>
                                      {serviceUsers.map(usr => <option key={usr.id} value={usr.id}>{usr.name} (ID {usr.id})</option>)}
                                    </select>
                                    <input
                                      className="input-field"
                                      type="number"
                                      min="0"
                                      style={{ marginTop: '6px' }}
                                      placeholder="User charge"
                                      value={row.userAmount}
                                      onChange={(e) => updateServiceFinanceRow(service.key, { userAmount: e.target.value })}
                                    />
                                  </td>

                                  <td style={{ minWidth: '170px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      User ₹{toAmount(row.userAmount).toFixed(2)} - Payout ₹{gst.totalAmount.toFixed(2)} - Dist ₹{toAmount(row.distributorAmount).toFixed(2)} - Emp ₹{toAmount(row.employeeAmount).toFixed(2)}
                                    </div>
                                    <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: 700, color: profit >= 0 ? '#10b981' : '#ef4444' }}>
                                      ₹{profit.toFixed(2)}
                                    </div>
                                  </td>

                                  <td style={{ minWidth: '180px' }}>
                                    <input
                                      className="input-field"
                                      type="number"
                                      min="0"
                                      placeholder="TDS %"
                                      value={row.tdsRate}
                                      onChange={(e) => updateServiceFinanceRow(service.key, { tdsRate: e.target.value })}
                                    />
                                    <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                      TDS ₹{tdsAmount.toFixed(2)}
                                    </div>
                                  </td>

                                  <td>
                                    <button
                                      className="btn-primary"
                                      style={{ padding: '8px 12px', fontSize: '12px' }}
                                      onClick={() => settleServiceFinance(service.key, service.label)}
                                    >
                                      Settle
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {gstPopupServiceKey && (
                  <div className="modal-overlay">
                    <div className="glass-card modal-content" style={{ maxWidth: '420px' }}>
                      <h2 className="h1" style={{ fontSize: '24px' }}>GST Calculator</h2>
                      {(() => {
                        const row = getFinanceRow(gstPopupServiceKey)
                        const service = serviceCatalog.find(s => s.key === gstPopupServiceKey)
                        const gst = getGstBreakup(row)
                        return (
                          <>
                            <p className="p" style={{ marginBottom: '12px', fontSize: '13px' }}>
                              {service?.label || gstPopupServiceKey}
                            </p>

                            <div className="form-group">
                              <label className="form-label">Payout Amount</label>
                              <input
                                className="input-field"
                                type="number"
                                min="0"
                                value={row.payoutAmount}
                                onChange={(e) => updateServiceFinanceRow(gstPopupServiceKey, { payoutAmount: e.target.value })}
                              />
                            </div>

                            <div className="form-group" style={{ marginTop: '10px' }}>
                              <label className="form-label">GST Mode</label>
                              <select
                                className="input-field"
                                value={row.gstMode}
                                onChange={(e) => updateServiceFinanceRow(gstPopupServiceKey, { gstMode: e.target.value as 'include' | 'exclude' })}
                              >
                                <option value="exclude">GST Exclude</option>
                                <option value="include">GST Include</option>
                              </select>
                            </div>

                            <div className="form-group" style={{ marginTop: '10px' }}>
                              <label className="form-label">GST %</label>
                              <input
                                className="input-field"
                                type="number"
                                min="0"
                                value={row.gstRate}
                                onChange={(e) => updateServiceFinanceRow(gstPopupServiceKey, { gstRate: e.target.value })}
                              />
                            </div>

                            <div style={{ marginTop: '14px', padding: '12px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Base Amount</div>
                              <div style={{fontWeight: 700, color: 'var(--text-main)' }}>₹{gst.baseAmount.toFixed(2)}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>GST Amount</div>
                              <div style={{fontWeight: 700, color: 'var(--text-main)' }}>₹{gst.gstAmount.toFixed(2)}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Total Payout</div>
                              <div style={{ fontWeight: 700, color: '#10b981' }}>₹{gst.totalAmount.toFixed(2)}</div>
                            </div>

                            <button
                              className="btn-primary"
                              style={{ marginTop: '16px', width: '100%', background: 'var(--glass)', color: 'var(--text-main)' }}
                              onClick={() => setGstPopupServiceKey(null)}
                            >
                              Close
                            </button>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}

                {viewingUser && (
                  <div className="modal-overlay">
                    <div className="glass-card modal-content" style={{ maxWidth: '500px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 className="h1" style={{ fontSize: '24px', margin: 0 }}>User Profile</h2>
                        <button className="action-btn" onClick={() => setViewingUser(null)} style={{ padding: '8px' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                        </button>
                      </div>

                      <div className="profile-grid">
                        <div className="profile-field profile-full-width" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                          <div className="profile-avatar" style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', overflow: 'hidden', border: '2px solid var(--glass-border)' }}>
                            {viewingUser.photo ? (
                              <img src={viewingUser.photo} alt="Profile" style={{ width: '100px', height: '100px', objectFit: 'cover' }} />
                            ) : (
                              viewingUser.name.charAt(0)
                            )}
                          </div>
                        </div>
                        <div className="profile-field">
                          <span className="profile-label">Full Name</span>
                          <span className="profile-value">{viewingUser.name}</span>
                        </div>
                        <div className="profile-field">
                          <span className="profile-label">Shop Name</span>
                          <span className="profile-value">{viewingUser.shopName || 'N/A'}</span>
                        </div>
                        <div className="profile-field">
                          <span className="profile-label">Father/Spouse Name</span>
                          <span className="profile-value">{viewingUser.fatherSpouseName || 'N/A'}</span>
                        </div>
                        <div className="profile-field">
                          <span className="profile-label">Phone Number</span>
                          <span className="profile-value">{viewingUser.phone}</span>
                        </div>
                        <div className="profile-field profile-full-width">
                          <span className="profile-label">Email Address</span>
                          <span className="profile-value">{viewingUser.email}</span>
                        </div>

                        <div className="profile-divider"></div>

                        <div className="profile-field profile-full-width">
                          <span className="profile-label">Residential Address</span>
                          <span className="profile-value">{viewingUser.address}</span>
                        </div>
                        <div className="profile-field">
                          <span className="profile-label">Pincode</span>
                          <span className="profile-value">{viewingUser.pincode}</span>
                        </div>
                        <div className="profile-field">
                          <span className="profile-label">District</span>
                          <span className="profile-value">{viewingUser.district}</span>
                        </div>
                        <div className="profile-field">
                          <span className="profile-label">State</span>
                          <span className="profile-value">{viewingUser.state}</span>
                        </div>
                        <div className="profile-field">
                          <span className="profile-label">Role</span>
                          <span className="profile-value" style={{ textTransform: 'capitalize' }}>{viewingUser.accountRole || viewingUser.role}</span>
                        </div>
                      </div>

                      <div style={{ marginTop: '30px', display: 'flex', gap: '12px' }}>
                        {viewingUser.status !== 'Approved' && viewingUser.role !== 'admin' && (
                          <button
                            className="btn-primary"
                            onClick={() => {
                              openApprovalModal(viewingUser)
                              setViewingUser(null)
                            }}
                          >
                            Proceed to Approval
                          </button>
                        )}
                        <button
                          className="btn-primary"
                          style={{ background: 'var(--glass)', color: 'var(--text-main)' }}
                          onClick={() => setViewingUser(null)}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedUserForServiceAccess && (
                  <div className="modal-overlay">
                    <div className="glass-card modal-content" style={{ maxWidth: '520px' }}>
                      <h2 className="h1" style={{ fontSize: '24px' }}>Manage Service Access</h2>
                      <div className="verification-summary" style={{ background: 'var(--glass)', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--glass-border)' }}>
                        <p className="p" style={{ fontSize: '13px', margin: 0 }}>User ID: {selectedUserForServiceAccess.id}</p>
                        <h4 style={{margin: '4px 0', color: 'var(--text-main)' }}>{selectedUserForServiceAccess.name}</h4>
                        <p className="p" style={{ fontSize: '12px', margin: 0, opacity: 0.7 }}>
                          Role: {selectedUserForServiceAccess.accountRole || selectedUserForServiceAccess.role} | Username: {selectedUserForServiceAccess.username || '---'}
                        </p>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Enable / Disable Services</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          {serviceCatalog.map((service) => (
                            <label key={service.key} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
                              <input
                                type="checkbox"
                                checked={selectedUserForServiceAccess.serviceAccess?.[service.key] !== false}
                                onChange={(e) => updateUserServiceAccess(selectedUserForServiceAccess.id, service.key, e.target.checked)}
                                style={{ marginTop: '3px' }}
                              />
                              <span>
                                <strong style={{display: 'block', color: 'var(--text-main)', fontSize: '13px' }}>{service.label}</strong>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{service.description}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: '16px', padding: '12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.08)', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Changes are saved immediately for this user ID, regardless of role.
                      </div>

                      <button
                        className="btn-primary"
                        style={{ marginTop: '18px', width: '100%', background: 'var(--glass)', color: 'var(--text-main)' }}
                        onClick={() => setSelectedUserForServiceAccess(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {selectedUserForApproval && (
                  <div className="modal-overlay">
                    <div className="glass-card modal-content" style={{ maxWidth: '400px' }}>
                      <h2 className="h1" style={{ fontSize: '24px' }}>Approve User</h2>
                      <div className="verification-summary" style={{ background: 'var(--glass)', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--glass-border)' }}>
                        <p className="p" style={{ fontSize: '13px', margin: 0 }}>Verifying Account for:</p>
                        <h4 style={{margin: '4px 0', color: 'var(--text-main)' }}>{selectedUserForApproval.name}</h4>
                        <p className="p" style={{ fontSize: '12px', margin: 0, opacity: 0.7 }}>{selectedUserForApproval.shopName} | {selectedUserForApproval.phone}</p>
                      </div>

                      <div className="form-group" style={{ marginBottom: '14px' }}>
                        <label className="form-label">Assign Role</label>
                        <select
                          className="input-field"
                          value={approvalConfig.accountRole}
                          onChange={(e) => setApprovalConfig(prev => ({ ...prev, accountRole: e.target.value as ApprovalRole }))}
                        >
                          <option value="user">User</option>
                          <option value="employee">Employee</option>
                          <option value="distributor">Distributor</option>
                        </select>
                      </div>

                      <p className="p" style={{ marginBottom: '12px', fontSize: '14px' }}>Assign a username to continue:</p>

                      <div className="approval-options">
                        <button type="button" className={`btn-primary option-btn ${approvalConfig.usernameMode === 'tree' ? 'active' : ''}`} onClick={() => setApprovalConfig(prev => ({ ...prev, usernameMode: 'tree' }))}>
                          <span>Option 1: Tree{String(treeCounter).padStart(5, '0')}</span>
                        </button>
                        <button type="button" className={`btn-primary option-btn ${approvalConfig.usernameMode === 'phone' ? 'active' : ''}`} onClick={() => setApprovalConfig(prev => ({ ...prev, usernameMode: 'phone' }))}>
                          <span>Option 2: {selectedUserForApproval.phone}</span>
                        </button>
                        <button type="button" className={`btn-primary option-btn ${approvalConfig.usernameMode === 'email' ? 'active' : ''}`} onClick={() => setApprovalConfig(prev => ({ ...prev, usernameMode: 'email' }))}>
                          <span>Option 3: {selectedUserForApproval.email}</span>
                        </button>
                      </div>

                      <div style={{ marginTop: '16px' }}>
                        <div className="form-group" style={{ marginTop: '12px' }}>
                          <label className="form-label">Service Access</label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {serviceCatalog.map((service) => (
                              <label key={service.key} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--glass)' }}>
                                <input
                                  type="checkbox"
                                  checked={approvalConfig.serviceAccess[service.key]}
                                  onChange={(e) => setApprovalConfig(prev => ({
                                    ...prev,
                                    serviceAccess: { ...prev.serviceAccess, [service.key]: e.target.checked }
                                  }))}
                                  style={{ marginTop: '3px' }}
                                />
                                <span>
                                  <strong style={{display: 'block', color: 'var(--text-main)', fontSize: '13px' }}>{service.label}</strong>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{service.description}</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '16px', padding: '12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.08)', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Save the role, selected username option, and service access in one step.
                      </div>

                      <button
                        className="btn-primary"
                        style={{ marginTop: '18px', width: '100%' }}
                        onClick={() => handleApprove(selectedUserForApproval.id)}
                      >
                        Approve & Save
                      </button>

                      <button
                        className="btn-primary"
                        style={{ marginTop: '20px', background: 'var(--glass)', color: 'var(--text-main)' }}
                        onClick={() => setSelectedUserForApproval(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {notificationSteps.length > 0 && (
                  <div className="notification-toast">
                    <div className="glass-card toast-content">
                      <div className="toast-header">
                        <div className="pulse-circle small"></div>
                        <span>Processing Notifications</span>
                      </div>
                      <div className="toast-body">
                        {notificationSteps.map((step, i) => (
                          <div key={i} className="noti-step animate-fade-in">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Service Applications' && userRole === 'admin' && (
                  <div className="dashboard-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                      <h2 className="h1" style={{ margin: 0 }}>Service Applications</h2>
                      <div className="stat-badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)' }}>
                        Total Forms: {serviceForms.length}
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', maxWidth: '100%' }}>
                      <table className="data-table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th>Form No</th>
                            <th>Applicant</th>
                            <th>Service</th>
                            <th>Date applied</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {serviceForms.length > 0 ? (
                            serviceForms.map((app: any) => (
                              <tr key={app.id}>
                                <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{app.formNo}</td>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{app.userName}</div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {app.userId}</div>
                                </td>
                                <td>{app.serviceName}</td>
                                <td>{new Date(app.appliedDate).toLocaleDateString()}</td>
                                <td>
                                  <span className={`status-badge ${app.status === 'Completed' ? 'approved' : 'pending'}`}>
                                    {app.status}
                                  </span>
                                </td>
                                <td>
                                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => {
                                    setSelectedServiceApp(app);
                                    setProcessingData({
                                      referenceNo: app.referenceNo || '',
                                      demandPrint: app.demandPrint || '',
                                      demandPrintDataUrl: app.demandPrintDataUrl || '',
                                      serviceUserId: app.serviceUserId || '',
                                      servicePassword: app.servicePassword || ''
                                    });
                                  }}>
                                    {app.status === 'Completed' ? 'View Details' : 'Process'}
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No service applications found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {selectedServiceApp && (
                      <div className="modal-overlay">
                        <div className="glass-card modal-content" style={{ maxWidth: '500px' }}>
                          <h2 className="h1" style={{ fontSize: '24px', marginBottom: '16px' }}>Process Application</h2>

                          <div style={{ background: 'var(--glass)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--glass-border)' }}>
                            <h4 style={{margin: '0 0 12px 0', color: 'var(--primary)' }}>{selectedServiceApp.serviceName}</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                              <div style={{ color: 'var(--text-muted)' }}>Form No: <strong style={{color: 'var(--text-main)' }}>{selectedServiceApp.formNo}</strong></div>
                              <div style={{ color: 'var(--text-muted)' }}>Applicant: <strong style={{color: 'var(--text-main)' }}>{selectedServiceApp.userName}</strong></div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '12px 0' }} />

                            <h5 style={{margin: '0 0 8px 0', color: 'var(--text-main)' }}>User Submitted Data:</h5>
                            <ul style={{ fontSize: '13px', paddingLeft: '20px', color: '#a5b4fc', margin: 0 }}>
                              {Object.entries(selectedServiceApp.formData || {}).map(([key, val]: any) => (
                                <li key={key}><strong style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').trim()}:</strong> {val}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Reference No</label>
                            <input type="text" className="input-field" value={processingData.referenceNo} onChange={(e) => setProcessingData({ ...processingData, referenceNo: e.target.value })} disabled={selectedServiceApp.status === 'Completed'} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Demand Print (Upload Document)</label>
                            {selectedServiceApp.status === 'Completed' ? (
                              <div style={{ padding: '10px', background: 'var(--glass)', borderRadius: '8px', color: '#10b981', fontSize: '14px' }}>
                                📄 {selectedServiceApp.demandPrint || 'No file uploaded'}
                              </div>
                            ) : (
                              <OptimizedFileUpload
                                label=""
                                accept=".pdf,image/*"
                                onFileChange={async (processed) => {
                                  const dataUrl = await blobToDataUrl(processed.compressedFile as Blob)
                                  setProcessingData(prev => ({
                                    ...prev,
                                    demandPrint: processed.name,
                                    demandPrintDataUrl: dataUrl
                                  }))
                                }}
                              />
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group">
                              <label className="form-label">User ID (Generated)</label>
                              <input type="text" className="input-field" value={processingData.serviceUserId} onChange={(e) => setProcessingData({ ...processingData, serviceUserId: e.target.value })} disabled={selectedServiceApp.status === 'Completed'} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Password</label>
                              <input type="text" className="input-field" value={processingData.servicePassword} onChange={(e) => setProcessingData({ ...processingData, servicePassword: e.target.value })} disabled={selectedServiceApp.status === 'Completed'} />
                            </div>
                          </div>

                          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                            {selectedServiceApp.status !== 'Completed' && (
                              <button className="btn-primary" style={{ flex: 1 }} onClick={() => {
                                const updatedForms = serviceForms.map(f => {
                                  if (f.id === selectedServiceApp.id) {
                                    return {
                                      ...f,
                                      status: 'Completed',
                                      ...processingData
                                    }
                                  }
                                  return f;
                                });
                                setServiceForms(updatedForms);
                                setSelectedServiceApp(null);
                                alert(`Form ${selectedServiceApp.formNo} marked as Completed!`);
                              }}>
                                Mark as Completed
                              </button>
                            )}
                            <button className="btn-primary" style={{ background: 'var(--glass)', color: 'var(--text-main)', flex: selectedServiceApp.status === 'Completed' ? 1 : undefined }} onClick={() => setSelectedServiceApp(null)}>
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'Profile' && currentUser && (
                  <div className="dashboard-content">
                    <div style={{ padding: '0 10px' }}>
                      <form onSubmit={handleUpdateProfile}>
                        <div className="profile-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div className="profile-avatar-container" style={{ position: 'relative' }}>
                              <div className="profile-avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', overflow: 'hidden', border: '2px solid var(--glass-border)' }}>
                                {(isEditing ? editData.photo : currentUser.photo) ? (
                                  <img src={isEditing ? editData.photo : currentUser.photo} alt="Profile" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                                ) : (
                                  currentUser.name.charAt(0)
                                )}
                              </div>
                              {isEditing && (
                                <div style={{ position: 'absolute', bottom: '0', right: '0', zIndex: 15 }}>
                                  <label className="photo-upload-label" style={{
                                    background: isProfileOptimizing ? 'rgba(59, 130, 246, 0.5)' : '#3b82f6',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: isProfileOptimizing ? 'wait' : 'pointer',
                                    border: '2px solid white',
                                    overflow: 'hidden',
                                    position: 'relative'
                                  }}>
                                    {isProfileOptimizing ? (
                                      <div className="pulse-circle small" style={{ width: '16px', height: '16px' }}></div>
                                    ) : (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      disabled={isProfileOptimizing}
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const result = await optimizeFile(file);
                                          handlePhotoUpload(result);
                                        }
                                      }}
                                      style={{ display: 'none' }}
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                            <div>
                              <h2 className="h1" style={{ fontSize: '28px', margin: 0 }}>{currentUser.name}</h2>
                              <p className="p" style={{ margin: '4px 0' }}>{currentUser.shopName || 'Retail Partner'}</p>
                              <span className={`status-badge approved`} style={{ fontSize: '12px' }}>Account {currentUser.status}</span>
                            </div>
                          </div>
                          {!isEditing ? (
                            <button type="button" className="action-btn view with-text" onClick={startEditing}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                              Edit Profile
                            </button>
                          ) : (
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                              <button type="submit" className="btn-primary" style={{ padding: '8px 24px' }}>Save Changes</button>
                            </div>
                          )}
                        </div>

                        <div className="profile-grid">
                          <div className="profile-field">
                            <span className="profile-label">Full Name</span>
                            <span className="profile-value" style={{ opacity: 0.7 }}>{currentUser.name}</span>
                          </div>
                          <div className="profile-field">
                            <span className="profile-label">Shop Name</span>
                            <span className="profile-value" style={{ opacity: 0.7 }}>{currentUser.shopName || 'N/A'}</span>
                          </div>
                          <div className="profile-field">
                            <span className="profile-label">Phone Number</span>
                            {isEditing ? (
                              <input type="tel" className="input-field" style={{ marginTop: '4px' }} maxLength={10} inputMode="numeric" value={editData.phone} onChange={e => setEditData({ ...editData, phone: normalizePhoneInput(e.target.value) })} required />
                            ) : (
                              <span className="profile-value">{currentUser.phone}</span>
                            )}
                          </div>
                          <div className="profile-field">
                            <span className="profile-label">Email Address</span>
                            <span className="profile-value" style={{ opacity: 0.7 }}>{currentUser.email}</span>
                          </div>
                          <div className="profile-field">
                            <span className="profile-label">Username</span>
                            <span className="profile-value"><code style={{ background: 'var(--glass-highlight)', padding: '2px 6px', borderRadius: '4px' }}>{currentUser.username}</code></span>
                          </div>
                          <div className="profile-field">
                            <span className="profile-label">District</span>
                            <span className="profile-value">{currentUser.district}</span>
                          </div>
                          <div className="profile-field profile-full-width">
                            <span className="profile-label">Address</span>
                            {isEditing ? (
                              <textarea className="input-field" style={{ marginTop: '4px', minHeight: '80px', resize: 'vertical' }} value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} required />
                            ) : (
                              <span className="profile-value">{currentUser.address}</span>
                            )}
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {activeTab === 'Services' && (
                  <div className="services-portal">
                    {!activeServiceCategory && (
                      <div className="services-nav-header">
                        <h2 style={{color: 'var(--text-main)', marginBottom: '8px' }}>Services Portal</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Access state and national digital services.</p>
                      </div>
                    )}

                    {activeServiceCategory && (
                      <button
                        className="back-btn"
                        onClick={() => {
                          setActiveServiceCategory(null)
                          setActiveServiceSubTab(null)
                          setApiResponse(null)
                        }}
                        style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                        Back to Categories
                      </button>
                    )}


                    {!activeServiceCategory ? (
                      <div className="services-grid">
                        {[
                          { id: 'state', name: 'State Government Services', icon: '🏛️', count: '12 Services' },
                          { id: 'certificates', name: 'Forms', icon: '🏆', count: '30+ Modules' },
                          { id: 'photo', name: 'Photo Studio', icon: '📸', count: 'Print Tools' },
                          { id: 'resume', name: 'Resume', icon: '📄', count: '8 Modules' },
                          { id: 'bank', name: 'Bank Services', icon: '💰', count: '8 Services' },
                          { id: 'pan', name: 'PAN Services', icon: '🆔', count: '4 Services' },
                          { id: 'utility', name: 'Bill Payments', icon: '🧾', count: '20+ Utils' },
                          { id: 'recharge', name: 'Recharge Services', icon: '📱', count: 'All Ops' },
                          { id: 'travel', name: 'Fast Tag & Travel', icon: '🚗', count: 'Active' }
                        ].map((cat) => (
                          <div key={cat.id} className="service-category-card" onClick={() => setActiveServiceCategory(cat.id)}>
                            <div className="cat-icon">{cat.icon}</div>
                            <div className="cat-info">
                              <span className="cat-name">{cat.name}</span>
                              <span className="cat-count">{cat.count}</span>
                            </div>
                            <div className="cat-arrow">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : activeServiceCategory === 'state' && !activeServiceSubTab ? (
                      <div className="services-list">
                        <div className="service-list-item" onClick={() => {
                          if (!hasServiceAccess('police')) return alert('You do not have access to Tamil Nadu Police services.')
                          setActiveServiceSubTab('tn-police')
                        }}>
                          <div className="service-logo" style={{ background: '#0055a4' }}>
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Seal_of_Tamil_Nadu.svg/1200px-Seal_of_Tamil_Nadu.svg.png" alt="TN Seal" style={{ width: '30px' }} />
                          </div>
                          <div className="service-details">
                            <h3>Tamil Nadu Police</h3>
                            <p>Verify Complaint, FIR, and CSR status.</p>
                          </div>
                          <div className="status-indicator">Active</div>
                        </div>

                        <div className="service-list-item" onClick={() => {
                          if (!hasServiceAccess('birthDeath')) return alert('You do not have access to Birth & Death services.')
                          setActiveServiceSubTab('birth-death')
                        }}>
                          <div className="service-logo" style={{ background: '#10b981' }}>
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Seal_of_Tamil_Nadu.svg/1200px-Seal_of_Tamil_Nadu.svg.png" alt="TN Seal" style={{ width: '30px' }} />
                          </div>
                          <div className="service-details">
                            <h3>Birth & Death Certificates</h3>
                            <p>Verify and download certificates (2018 onwards).</p>
                          </div>
                          <div className="status-indicator">Active</div>
                        </div>
                        <div className="service-list-item" onClick={() => {
                          if (!hasServiceAccess('tnEDistrict')) return alert('You do not have access to TN eDistrict services.')
                          setActiveServiceSubTab('tn-edistrict')
                        }}>
                          <div className="service-logo" style={{ background: '#f59e0b' }}>
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Seal_of_Tamil_Nadu.svg/1200px-Seal_of_Tamil_Nadu.svg.png" alt="TN Seal" style={{ width: '30px' }} />
                          </div>
                          <div className="service-details">
                            <h3>TN eDistrict</h3>
                            <p>Verify Income, Caste, OBC Certificates etc.</p>
                          </div>
                          <div className="status-indicator">Active</div>
                        </div>
                        <div className="service-list-item" onClick={() => {
                          if (!hasServiceAccess('ebService')) return alert('You do not have access to EB Service.')
                          setActiveServiceSubTab('eb-bill-services')
                        }}>
                          <div className="service-logo" style={{ background: '#8b5cf6' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                          </div>
                          <div className="service-details">
                            <h3>EB Service</h3>
                            <p>Name Transfer and other EB bill forms.</p>
                          </div>
                          <div className="status-indicator" style={{ background: 'var(--primary)', color: 'white', border: 'none' }}>New</div>
                        </div>
                        {/* More state services can be added here */}
                      </div>
                    ) : activeServiceCategory === 'photo' ? (
                      <PhotoStudioServiceModule moduleKey="photo-studio" onBack={() => setActiveServiceCategory(null)} />
                    ) : activeServiceCategory === 'resume' && !activeServiceSubTab ? (
                      <div className="name-transfer-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(14, 165, 164, 0.35)' }}>
                          <div style={{ padding: '12px', background: 'rgba(14, 165, 164, 0.1)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 13h6" /><path d="M9 17h6" /><path d="M9 9h1" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>Resume</h3>
                          </div>
                        </div>

                        <div className="resume-modules-grid" style={{ marginTop: '20px' }}>
                          {[
                            { key: 'resume-fresher', title: 'College Student', icon: '🚀', desc: 'Focus on education, projects & internships.', color: '#06b6d4', cat: 'Builder' },
                            { key: 'resume-word-to-pdf', title: 'Word → PDF', icon: '📤', desc: 'Convert Word document to PDF format.', color: '#059669', cat: 'Converter' },
                            { key: 'resume-edit-pdf', title: 'Edit PDF', icon: '✏️', desc: 'Upload and edit existing PDF resume.', color: '#c2410c', cat: 'Editor' },
                            { key: 'resume-edit-word-pdf', title: 'Word → Edit → PDF', icon: '🔄', desc: 'Edit Word and convert to PDF.', color: '#7c3aed', cat: 'Editor' }
                          ].map((item) => (
                            <div key={item.key} className="resume-module-premium-card" style={{ '--module-color': item.color } as any} onClick={() => {
                              if (!hasServiceAccess('resumeService')) return alert('You do not have access to Resume.')
                              setActiveServiceSubTab(item.key)
                            }}>
                              <div className="resume-card-header">
                                <div className="resume-card-icon" style={{ background: item.color }}>{item.icon}</div>
                                <div className="resume-card-badge" style={{ background: item.color }}>{item.cat}</div>
                              </div>
                              <h4 className="resume-card-title">{item.title}</h4>
                              <p className="resume-card-desc">{item.desc}</p>
                              <div className="resume-card-footer">
                                <span className="resume-card-status">Active</span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : activeServiceCategory === 'certificates' ? (
                      <div className="name-transfer-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(245, 158, 11, 0.35)' }}>
                          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 2l2.6 6.6L21 10l-5 4.3L17.2 21 12 17.8 6.8 21 8 14.3 3 10l6.4-1.4z" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>Forms</h3>
                          </div>
                        </div>

                        {!activeServiceSubTab ? (
                          <div className="certificate-sections">
                            {CERTIFICATE_SECTIONS.map((section) => (
                              <section key={section.id} className="certificate-section-block">
                                <div className="resume-modules-grid">
                                  {section.modules.map((item) => (
                                    <div
                                      key={item.key}
                                      className="resume-module-premium-card"
                                      style={{ '--module-color': section.color } as any}
                                      onClick={() => {
                                        if (!hasServiceAccess('certificateService')) return alert('You do not have access to Forms.')
                                        setActiveServiceSubTab(item.key)
                                      }}
                                    >
                                      <div className="resume-card-header">
                                        <div className="resume-card-icon" style={{ background: section.color }}>{item.icon}</div>
                                        <div className="resume-card-badge" style={{ background: section.color }}>Form</div>
                                      </div>
                                      <h4 className="resume-card-title">{item.title}</h4>
                                      <p className="resume-card-desc">{item.description}</p>
                                      <div className="resume-card-footer">
                                        <span className="resume-card-status">Ready</span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            ))}
                          </div>
                        ) : (
                          <ErrorBoundary>
                            <CertificateServiceModule
                              moduleKey={activeServiceSubTab}
                              onBack={() => setActiveServiceSubTab(null)}
                            />
                          </ErrorBoundary>
                        )}
                      </div>
                    ) : activeServiceSubTab === 'photo-studio' ? (
                      <ErrorBoundary>
                        <PhotoStudioServiceModule moduleKey={activeServiceSubTab} onBack={() => setActiveServiceSubTab(null)} />
                      </ErrorBoundary>
                    ) : activeServiceSubTab === 'tn-police' ? (
                      <div className="police-services-view">
                        <div className="tn-police-header">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Seal_of_Tamil_Nadu.svg/1200px-Seal_of_Tamil_Nadu.svg.png" alt="TN Seal" style={{ width: '60px' }} />
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>Tamil Nadu Police</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Law Enforcement Services Integration</p>
                          </div>
                        </div>

                        <div className="service-tabs">
                          {['Complaint Status', 'FIR Status', 'CSR Status', 'Vehicle Status', 'Police Station', 'District List', 'Subject Details', 'Gender Details', 'Registration'].map(tab => (
                            <button
                              key={tab}
                              className={`service-tab ${activePoliceSubTab === tab ? 'active' : ''}`}
                              onClick={() => {
                                setActivePoliceSubTab(tab)
                                setApiResponse(null)
                              }}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>

                        <div className="service-form-container">
                          {/* Render forms based on sub-tab */}
                          <div className="glass-card form-inner" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                            <h4 style={{color: 'var(--text-main)', marginBottom: '16px' }}>{activePoliceSubTab}</h4>
                            <div className="form-group">
                              <label className="form-label">Service ID / Number</label>
                              <input type="text" className="input-field" placeholder="Enter ID" id="service_id_input" />
                            </div>
                            <button
                              className="btn-primary"
                              style={{ marginTop: '20px', width: '100%' }}
                              onClick={() => {
                                const inputEl = document.getElementById('service_id_input') as HTMLInputElement;
                                const num = inputEl ? inputEl.value : '';
                                let endpoint = '';
                                let payload: any = {
                                  active_status: '1',
                                  pltfrm: 'web',
                                  imei_number: '',
                                  imsi_number: '',
                                  latitude: 0,
                                  longitude: 0,
                                  mob_ip_address: 0,
                                  updatedon: new Date().toISOString(),
                                  tkn: '',
                                  trkr: '',
                                  lang: 'en',
                                  usrid: '',
                                  srvid: '1117',
                                  mode: 'web',
                                  did: '',
                                  deptid: '185',
                                  subsid: '0',
                                  subsid2: '0',
                                  formtrkr: '0'
                                };

                                if (activePoliceSubTab === 'Complaint Status') {
                                  endpoint = '/umang/apisetu/dept/tnapi/ws1/complaintStatus';
                                  payload.complaint_number = num;

                                  // Fetch values from explicitly unhidden input fields
                                  const getVal = (id: string, def = '') => {
                                    const el = document.getElementById(id) as HTMLInputElement;
                                    return el ? el.value : def;
                                  };

                                  payload.active_status = getVal('complaint_active_status', '1');
                                  payload.imei_number = getVal('complaint_imei', '');
                                  payload.imsi_number = getVal('complaint_imsi', '');
                                  payload.latitude = Number(getVal('complaint_lat', '0'));
                                  payload.longitude = Number(getVal('complaint_lng', '0'));
                                  payload.mob_ip_address = Number(getVal('complaint_mob_ip', '0'));
                                  payload.tkn = getVal('complaint_tkn', '');
                                  payload.trkr = getVal('complaint_trkr', '');
                                  payload.lang = getVal('complaint_lang', 'en');
                                  payload.usrid = getVal('complaint_usrid', '');
                                  payload.mode = getVal('complaint_mode', 'web');
                                  payload.pltfrm = getVal('complaint_pltfrm', 'web');
                                  payload.did = getVal('complaint_did', '');
                                  payload.deptid = getVal('complaint_deptid', '185');
                                  payload.subsid = getVal('complaint_subsid', '0');
                                  payload.subsid2 = getVal('complaint_subsid2', '0');
                                  payload.formtrkr = getVal('complaint_formtrkr', '0');

                                } else if (activePoliceSubTab === 'FIR Status') {
                                  endpoint = '/umang/apisetu/dept/tnapi/ws1/firStatus';

                                  const getVal = (id: string, def = '') => {
                                    const el = document.getElementById(id) as HTMLInputElement;
                                    return el ? el.value : def;
                                  };

                                  payload.fir_no = getVal('fir_no', num);
                                  payload.district_code = getVal('fir_district_code', '');
                                  payload.ps_code = getVal('fir_ps_code', '');
                                  payload.reg_date = getVal('fir_reg_date', '');
                                  payload.reg_time = Number(getVal('fir_reg_time', '0'));
                                  payload.active_status = getVal('fir_active_status', '1');
                                  payload.imsi_number = parseInt(getVal('fir_imsi', '0')) || 0;
                                  payload.latitude = Number(getVal('fir_lat', '0'));
                                  payload.longitude = Number(getVal('fir_lng', '0'));
                                  payload.mob_ip_address = Number(getVal('fir_mob_ip', '0'));
                                  payload.updatedon = parseInt(getVal('fir_updatedon', '0')) || 0;
                                  payload.imei_number = parseInt(getVal('fir_imei', '0')) || 0;
                                  payload.trkr = getVal('fir_trkr', '');
                                  payload.lang = getVal('fir_lang', 'en');
                                  payload.usrid = getVal('fir_usrid', '');
                                  payload.mode = getVal('fir_mode', 'web');
                                  payload.pltfrm = getVal('fir_pltfrm', 'web');
                                  payload.did = getVal('fir_did', '');
                                  payload.deptid = getVal('fir_deptid', '185');
                                  payload.subsid = getVal('fir_subsid', '0');
                                  payload.subsid2 = getVal('fir_subsid2', '0');
                                  payload.formtrkr = getVal('fir_formtrkr', '0');
                                  payload.srvid = '1119'; // As requested in headers

                                } else if (activePoliceSubTab === 'CSR Status') {
                                  endpoint = '/umang/apisetu/dept/tnapi/ws1/csrStatus';

                                  const getVal = (id: string, def = '') => {
                                    const el = document.getElementById(id) as HTMLInputElement;
                                    return el ? el.value : def;
                                  };

                                  payload.csr_no = getVal('csr_no', num);
                                  payload.district_code = getVal('csr_district_code', '');
                                  payload.ps_code = getVal('csr_ps_code', '');
                                  payload.reg_date = getVal('csr_reg_date', '');
                                  payload.reg_time = getVal('csr_reg_time', '');
                                  payload.active_status = getVal('csr_active_status', '1');
                                  payload.imei_number = parseInt(getVal('csr_imei', '0')) || 0; // Integer
                                  payload.imsi_number = getVal('csr_imsi', ''); // String
                                  payload.latitude = Number(getVal('csr_lat', '0'));
                                  payload.longitude = Number(getVal('csr_lng', '0'));
                                  payload.mob_ip_address = Number(getVal('csr_mob_ip', '0')); // Number
                                  payload.tkn = getVal('csr_tkn', '');
                                  payload.trkr = getVal('csr_trkr', '');
                                  payload.lang = getVal('csr_lang', 'en');
                                  payload.usrid = getVal('csr_usrid', '');
                                  payload.mode = getVal('csr_mode', 'web');
                                  payload.pltfrm = getVal('csr_pltfrm', 'web');
                                  payload.did = parseInt(getVal('csr_did', '0')) || 0; // Integer
                                  payload.deptid = getVal('csr_deptid', '185');
                                  payload.subsid = getVal('csr_subsid', '0');
                                  payload.subsid2 = getVal('csr_subsid2', '0');
                                  payload.formtrkr = getVal('csr_formtrkr', '0');
                                  payload.srvid = '1119'; // Overwritten or explicit
                                } else if (activePoliceSubTab === 'Police Station') {
                                  endpoint = '/umang/apisetu/dept/tnapi/ws1/policeStation';

                                  const getVal = (id: string, def = '') => {
                                    const el = document.getElementById(id) as HTMLInputElement;
                                    return el ? el.value : def;
                                  };

                                  payload.district_code = getVal('ps_district_code', num); // Use main prompt input if element empty
                                  payload.tkn = getVal('ps_tkn', '');
                                  payload.trkr = getVal('ps_trkr', '');
                                  payload.lang = getVal('ps_lang', 'en');
                                  payload.usrid = getVal('ps_usrid', '');
                                  payload.mode = getVal('ps_mode', 'web');
                                  payload.pltfrm = getVal('ps_pltfrm', 'web');
                                  payload.did = getVal('ps_did', '');
                                  payload.deptid = getVal('ps_deptid', '185');
                                  payload.subsid = getVal('ps_subsid', '0');
                                  payload.subsid2 = getVal('ps_subsid2', '0');
                                  payload.formtrkr = getVal('ps_formtrkr', '0');
                                  payload.srvid = '1118';
                                } else if (activePoliceSubTab === 'District List') {
                                  endpoint = '/umang/apisetu/dept/tnapi/ws1/district';

                                  const getVal = (id: string, def = '') => {
                                    const el = document.getElementById(id) as HTMLInputElement;
                                    return el ? el.value : def;
                                  };

                                  payload.tkn = getVal('dist_tkn', '');
                                  payload.trkr = getVal('dist_trkr', '');
                                  payload.lang = getVal('dist_lang', 'en');
                                  payload.usrid = getVal('dist_usrid', '');
                                  payload.mode = getVal('dist_mode', 'web');
                                  payload.pltfrm = getVal('dist_pltfrm', 'web');
                                  payload.did = getVal('dist_did', '');
                                  payload.deptid = getVal('dist_deptid', '185');
                                  payload.subsid = getVal('dist_subsid', '0');
                                  payload.subsid2 = getVal('dist_subsid2', '0');
                                  payload.formtrkr = getVal('dist_formtrkr', '0');
                                  payload.district_code = getVal('dist_district_code', '');
                                  payload.srvid = '1118';

                                } else if (activePoliceSubTab === 'Subject Details') {
                                  endpoint = '/umang/apisetu/dept/tnapi/ws1/subject';

                                  const getVal = (id: string, def = '') => {
                                    const el = document.getElementById(id) as HTMLInputElement;
                                    return el ? el.value : def;
                                  };

                                  payload.tkn = getVal('sub_tkn', '');
                                  payload.trkr = getVal('sub_trkr', '');
                                  payload.lang = getVal('sub_lang', 'en');
                                  payload.usrid = getVal('sub_usrid', '');
                                  payload.mode = getVal('sub_mode', 'web');
                                  payload.pltfrm = getVal('sub_pltfrm', 'web');
                                  payload.did = getVal('sub_did', '');
                                  payload.deptid = getVal('sub_deptid', '185');
                                  payload.subsid = getVal('sub_subsid', '0');
                                  payload.subsid2 = getVal('sub_subsid2', '0');
                                  payload.formtrkr = getVal('sub_formtrkr', '0');
                                  payload.srvid = '1118';

                                } else if (activePoliceSubTab === 'Gender Details') {
                                  endpoint = '/umang/apisetu/dept/tnapi/ws1/gender';

                                  const getVal = (id: string, def = '') => {
                                    const el = document.getElementById(id) as HTMLInputElement;
                                    return el ? el.value : def;
                                  };

                                  payload.tkn = getVal('gen_tkn', '');
                                  payload.trkr = getVal('gen_trkr', '');
                                  payload.lang = getVal('gen_lang', 'en');
                                  payload.usrid = getVal('gen_usrid', '');
                                  payload.mode = getVal('gen_mode', 'web');
                                  payload.pltfrm = getVal('gen_pltfrm', 'web');
                                  payload.did = getVal('gen_did', '');
                                  payload.deptid = getVal('gen_deptid', '185');
                                  payload.subsid = getVal('gen_subsid', '0');
                                  payload.subsid2 = getVal('gen_subsid2', '0');
                                  payload.formtrkr = getVal('gen_formtrkr', '0');
                                  payload.srvid = '1118';

                                } else if (activePoliceSubTab === 'Registration') {
                                  endpoint = '/umang/apisetu/dept/tnapi/ws1/registration';

                                  const getVal = (id: string, def = '') => {
                                    const el = document.getElementById(id) as HTMLInputElement;
                                    return el ? el.value : def;
                                  };

                                  payload.district_code = getVal('reg_district_code', '');
                                  payload.compl_name = getVal('reg_compl_name', '');
                                  payload.compl_dob = getVal('reg_compl_dob', '');
                                  payload.address = getVal('reg_address', '');
                                  const regEmailAddress = getVal('reg_email_address', '');
                                  if (regEmailAddress && !isValidEmailAddress(regEmailAddress)) return alert('Please enter a valid email address');
                                  payload.email_address = regEmailAddress;
                                  payload.subject_code = getVal('reg_subject_code', '');
                                  payload.compl_description = getVal('reg_compl_description', '');
                                  payload.occurrence_date = parseInt(getVal('reg_occurrence_date', '0')) || 0;
                                  payload.occurrence_place = getVal('reg_occurrence_place', '');
                                  payload.image = getVal('reg_image', '');
                                  payload.image_code = getVal('reg_image_code', '');
                                  payload.active_status = getVal('reg_active_status', '1');
                                  payload.imei_number = parseInt(getVal('reg_imei_number', '0')) || 0;
                                  payload.imsi_number = parseInt(getVal('reg_imsi_number', '0')) || 0;
                                  payload.latitude = Number(getVal('reg_latitude', '0'));
                                  payload.longitude = Number(getVal('reg_longitude', '0'));
                                  payload.mob_ip_address = Number(getVal('reg_mob_ip_address', '0'));
                                  payload.updatedon = getVal('reg_updatedon', new Date().toISOString());
                                  payload.tkn = getVal('reg_tkn', '');
                                  payload.trkr = getVal('reg_trkr', '');
                                  payload.lang = getVal('reg_lang', 'en');
                                  payload.usrid = getVal('reg_usrid', '');
                                  payload.mode = getVal('reg_mode', 'web');
                                  payload.pltfrm = getVal('reg_pltfrm', 'web');
                                  payload.did = getVal('reg_did', '');
                                  payload.deptid = getVal('reg_deptid', '185');
                                  payload.subsid = getVal('reg_subsid', '0');
                                  payload.subsid2 = getVal('reg_subsid2', '0');
                                  payload.formtrkr = getVal('reg_formtrkr', '0');
                                  payload.srvid = '1118';
                                } else {
                                  endpoint = '/umang/apisetu/dept/tnapi/ws1/vehicleStatus';

                                  const getVal = (id: string, def = '') => {
                                    const el = document.getElementById(id) as HTMLInputElement;
                                    return el ? el.value : def;
                                  };

                                  // Only populate from fields if we actually have fields (i.e., we are on the Vehicle Status tab)
                                  if (activePoliceSubTab === 'Vehicle Status') {
                                    payload.vehicleRegNo = getVal('vehicle_reg_no', num);
                                    payload.vehicleChasisNo = getVal('vehicle_chassis_no', '');
                                    payload.vehicleEngineNo = getVal('vehicle_engine_no', '');
                                    payload.active_status = getVal('vehicle_active_status', '1');
                                    payload.imei_number = parseInt(getVal('vehicle_imei', '0')) || 0; // Integer
                                    payload.imsi_number = parseInt(getVal('vehicle_imsi', '0')) || 0; // Integer
                                    payload.latitude = Number(getVal('vehicle_lat', '0'));
                                    payload.longitude = Number(getVal('vehicle_lng', '0'));
                                    payload.mob_ip_address = getVal('vehicle_mob_ip', '0'); // String
                                    payload.tkn = getVal('vehicle_tkn', '');
                                    payload.trkr = getVal('vehicle_trkr', '');
                                    payload.lang = getVal('vehicle_lang', 'en');
                                    payload.mode = getVal('vehicle_mode', 'web');
                                    payload.pltfrm = getVal('vehicle_pltfrm', 'web');
                                    payload.did = getVal('vehicle_did', '');
                                    payload.deptid = getVal('vehicle_deptid', '185');
                                    payload.subsid = getVal('vehicle_subsid', '0');
                                    payload.subsid2 = getVal('vehicle_subsid2', '0');
                                    payload.formtrkr = getVal('vehicle_formtrkr', '0');
                                  } else {
                                    payload.vehicleRegNo = num;
                                    payload.vehicleChasisNo = '';
                                    payload.vehicleEngineNo = '';
                                    payload.imei_number = 0;
                                    payload.imsi_number = 0;
                                    payload.mob_ip_address = '';
                                  }
                                }

                                let customHeaders: any = {};
                                if (activePoliceSubTab === 'CSR Status') {
                                  customHeaders = { 'srvid': '1119' };
                                } else if (activePoliceSubTab === 'Police Station' || activePoliceSubTab === 'District List' || activePoliceSubTab === 'Subject Details' || activePoliceSubTab === 'Gender Details' || activePoliceSubTab === 'Registration') {
                                  customHeaders = { 'srvid': '1118' };
                                }

                                callUmangAPI(endpoint, payload, customHeaders)
                              }}
                              disabled={isApiLoading}
                            >
                              {isApiLoading ? 'Processing...' : (activePoliceSubTab.includes('List') || activePoliceSubTab.includes('Details')) ? 'Fetch Details' : 'Verify Status'}
                            </button>

                            {apiResponse && (
                              <div className="response-card-refined" style={{ marginTop: '24px' }}>
                                <div className={`status-banner ${apiResponse.error ? 'error' : apiResponse.rc === '200' ? 'success' : 'warning'}`}>
                                  <span className="status-icon">
                                    {apiResponse.error ? '❌' : apiResponse.rc === '200' ? '✔️' : '⚠️'}
                                  </span>
                                  <span className="status-text">
                                    {apiResponse.error ? 'Connection Error' : apiResponse.rd || 'Service Response'}
                                  </span>
                                </div>

                                <div className="response-details" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                  {(apiResponse.pd?.tnpolice?.response || apiResponse.pd?.response || apiResponse.pd?.district_list || apiResponse.pd?.subject_list || apiResponse.pd?.gender_list) ? (
                                    <div className="result-data">
                                      {(apiResponse.pd?.tnpolice?.response || apiResponse.pd?.response || apiResponse.pd?.district_list || apiResponse.pd?.subject_list || apiResponse.pd?.gender_list || []).map((item: any, i: number) => (
                                        <div key={i} className="detail-row">
                                          <span className="detail-label">{item.name || item.district_name || item.subject_name || item.gender_name || `Item ${i + 1}`}</span>
                                          <span className="detail-value">{item.value || item.district_id || item.subject_id || item.gender_id || ''}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : !apiResponse.error && (
                                    <div className="error-msg">
                                      No records found for the provided information.
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="info-alert" style={{ marginTop: '24px', padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', gap: '12px' }}>
                          <span style={{ fontSize: '20px' }}>ℹ️</span>
                          <p style={{ fontSize: '13px', color: '#93c5fd', margin: 0 }}>
                            Tamil Nadu Police is the primary law enforcement agency. User can avail services viz Complaint Status, FIR status, CSR Status and Vehicle Status.
                          </p>
                        </div>
                      </div>
                    ) : activeServiceSubTab === 'birth-death' ? (
                      <div className="birth-death-services-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>Birth & Death Certificates</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Chief Registrar of Births and Deaths, Tamil Nadu</p>
                          </div>
                        </div>

                        <div className="service-tabs">
                          {['Birth Certificate', 'Death Certificate'].map(tab => (
                            <button
                              key={tab}
                              className={`service-tab ${activeBirthDeathSubTab === tab ? 'active' : ''}`}
                              onClick={() => {
                                setActiveBirthDeathSubTab(tab)
                                setApiResponse(null)
                              }}
                              style={{ flex: 1 }}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>

                        <div className="service-form-container">
                          <div key={activeBirthDeathSubTab} className="glass-card form-inner" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                            <h4 style={{color: 'var(--text-main)', marginBottom: '16px' }}>{activeBirthDeathSubTab} Verification</h4>

                            <div className="form-group">
                              <label className="form-label">Registration Number</label>
                              <input type="text" className="input-field" placeholder="e.g., 2023/01/0001/000123" id="cert_reg_no" />
                            </div>

                            {activeBirthDeathSubTab === 'Death Certificate' && (
                              <>
                                <div className="form-group" style={{ marginTop: '16px' }}>
                                  <label className="form-label">Date of Death (DD-MM-YYYY)</label>
                                  <input type="text" className="input-field" placeholder="e.g., 15-08-2023" id="death_date" />
                                </div>
                                <div className="form-group" style={{ marginTop: '16px' }}>
                                  <label className="form-label">Gender</label>
                                  <select className="input-field" id="death_gender" style={{ paddingLeft: '16px' }}>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Transgender">Transgender</option>
                                  </select>
                                </div>
                              </>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                              <div className="form-group"><label className="form-label">Transaction ID</label><input type="text" className="input-field" id="bd_txnId" placeholder="f7f1469c..." /></div>
                              <div className="form-group"><label className="form-label">Format</label><input type="text" className="input-field" id="bd_format" defaultValue="pdf" /></div>
                              <div className="form-group"><label className="form-label">Consent ID</label><input type="text" className="input-field" id="bd_consentId" placeholder="ea9c43aa..." /></div>
                              <div className="form-group"><label className="form-label">Timestamp</label><input type="text" className="input-field" id="bd_timestamp" placeholder="2026-02-28..." /></div>
                              <div className="form-group"><label className="form-label">Data Consumer ID</label><input type="text" className="input-field" id="bd_dataConsumer_id" defaultValue="in.gov.portal" /></div>
                              <div className="form-group"><label className="form-label">Data Provider ID</label><input type="text" className="input-field" id="bd_dataProvider_id" defaultValue="tn.gov.crstn" /></div>
                              <div className="form-group"><label className="form-label">Purpose Description</label><input type="text" className="input-field" id="bd_purpose" defaultValue="Certificate Verification" /></div>

                              <div className="form-group"><label className="form-label">User ID Type</label><input type="text" className="input-field" id="bd_user_idType" defaultValue="AADHAAR" /></div>
                              <div className="form-group"><label className="form-label">User ID Number</label><input type="text" className="input-field" id="bd_user_idNumber" defaultValue="XXXXXXXXXXXX" /></div>
                              <div className="form-group"><label className="form-label">User Mobile</label><input type="text" className="input-field" id="bd_user_mobile" defaultValue="XXXXXXXXXX" /></div>
                              <div className="form-group"><label className="form-label">User Email</label><input type="email" className="input-field" id="bd_user_email" defaultValue="user@example.com" placeholder="name@example.com" required maxLength={254} minLength={5} pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$" onBlur={(e) => { if (e.target.value && !isValidEmailAddress(e.target.value)) alert('Please enter a valid email address') }} /></div>

                              <div className="form-group"><label className="form-label">Data ID</label><input type="text" className="input-field" id="bd_data_id" defaultValue="string" /></div>

                              <div className="form-group"><label className="form-label">Access</label><input type="text" className="input-field" id="bd_access" defaultValue="VIEW" /></div>
                              <div className="form-group"><label className="form-label">Date Range From</label><input type="text" className="input-field" id="bd_date_from" /></div>
                              <div className="form-group"><label className="form-label">Date Range To</label><input type="text" className="input-field" id="bd_date_to" /></div>

                              <div className="form-group"><label className="form-label">Freq Unit</label><input type="text" className="input-field" id="bd_freq_unit" defaultValue="ONCE" /></div>
                              <div className="form-group"><label className="form-label">Freq Value (int)</label><input type="number" className="input-field" id="bd_freq_value" defaultValue="0" /></div>
                              <div className="form-group"><label className="form-label">Freq Repeats (int)</label><input type="number" className="input-field" id="bd_freq_repeats" defaultValue="0" /></div>

                              <div className="form-group"><label className="form-label">Signature</label><input type="text" className="input-field" id="bd_signature" defaultValue="NA" /></div>
                            </div>

                            <button
                              className="btn-primary"
                              style={{ marginTop: '24px', width: '100%' }}
                              onClick={() => {
                                const regNo = (document.getElementById('cert_reg_no') as HTMLInputElement).value;
                                if (!regNo) return alert('Please enter Registration Number');

                                const getVal = (id: string, def = '') => {
                                  const el = document.getElementById(id) as HTMLInputElement;
                                  return el && el.value ? el.value : def;
                                };

                                const defaultTxnId = Math.random().toString(36).substring(7);
                                const defaultTimestamp = new Date().toISOString();

                                const txnId = getVal('bd_txnId', defaultTxnId);
                                const timestamp = getVal('bd_timestamp', defaultTimestamp);
                                const bdUserEmail = getVal('bd_user_email', 'user@example.com');
                                if (!isValidEmailAddress(bdUserEmail)) return alert('Please enter a valid email address');

                                let endpoint = activeBirthDeathSubTab === 'Birth Certificate' ? '/btcer' : '/dtcer';
                                let certificateParameters: any = { RegNo: regNo };

                                if (activeBirthDeathSubTab === 'Death Certificate') {
                                  const dod = (document.getElementById('death_date') as HTMLInputElement).value;
                                  const gender = (document.getElementById('death_gender') as HTMLSelectElement).value;
                                  if (!dod) return alert('Please enter Date of Death');
                                  certificateParameters.DOD = dod;
                                  certificateParameters.GENDER = gender;
                                }

                                const payload = {
                                  txnId,
                                  format: getVal('bd_format', 'pdf'),
                                  certificateParameters,
                                  consentArtifact: {
                                    consent: {
                                      consentId: getVal('bd_consentId', txnId),
                                      timestamp,
                                      dataConsumer: { id: getVal('bd_dataConsumer_id', "in.gov.portal") },
                                      dataProvider: { id: getVal('bd_dataProvider_id', "tn.gov.crstn") },
                                      purpose: { description: getVal('bd_purpose', "Certificate Verification") },
                                      user: {
                                        idType: getVal('bd_user_idType', "AADHAAR"),
                                        idNumber: getVal('bd_user_idNumber', "XXXXXXXXXXXX"),
                                        mobile: getVal('bd_user_mobile', "XXXXXXXXXX"),
                                        email: bdUserEmail
                                      },
                                      data: { id: getVal('bd_data_id', "string") },
                                      permission: {
                                        access: getVal('bd_access', "VIEW"),
                                        dateRange: {
                                          from: getVal('bd_date_from', timestamp),
                                          to: getVal('bd_date_to', timestamp)
                                        },
                                        frequency: {
                                          unit: getVal('bd_freq_unit', "ONCE"),
                                          value: parseInt(getVal('bd_freq_value', "0")) || 0,
                                          repeats: parseInt(getVal('bd_freq_repeats', "0")) || 0
                                        }
                                      }
                                    },
                                    signature: { signature: getVal('bd_signature', "NA") }
                                  }
                                };

                                callSetuAPI(endpoint, payload);
                              }}
                              disabled={isApiLoading}
                            >
                              {isApiLoading ? 'Processing...' : 'Verify & Download PDF'}
                            </button>

                            {apiResponse && (
                              <div className="response-card-refined" style={{ marginTop: '24px' }}>
                                <div className={`status-banner ${apiResponse.error ? 'error' : apiResponse.success ? 'success' : 'warning'}`}>
                                  <span className="status-icon">
                                    {apiResponse.error ? '❌' : apiResponse.success ? '✔️' : '⚠️'}
                                  </span>
                                  <span className="status-text">
                                    {apiResponse.error ? 'API Error' : apiResponse.rd || 'Service Response'}
                                  </span>
                                </div>

                                <div className="response-details">
                                  {apiResponse.pdfUrl ? (
                                    <div className="pdf-action" style={{ textAlign: 'center', padding: '10px' }}>
                                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>Your certificate is ready for download.</p>
                                      <a href={apiResponse.pdfUrl} download={`${activeBirthDeathSubTab.replace(' ', '_')}.pdf`} className="btn-primary" style={{ textDecoration: 'none', background: '#10b981' }}>
                                        Download Certificate PDF
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="error-msg">
                                      {apiResponse.errorDescription || apiResponse.error || 'No record found with the provided details.'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="info-alert" style={{ marginTop: '24px', padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', gap: '12px' }}>
                          <span style={{ fontSize: '20px' }}>ℹ️</span>
                          <p style={{ fontSize: '13px', color: '#6ee7b7', margin: 0 }}>
                            Digitally signed Birth and Death certificates are available for events registered from 01-01-2018 onwards in Tamil Nadu.
                          </p>
                        </div>
                      </div>
                    ) : activeServiceSubTab === 'tn-edistrict' ? (
                      <div className="edistrict-services-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>TN eDistrict</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Tamil Nadu eGovernance Agency</p>
                          </div>
                        </div>

                        <div className="service-tabs">
                          {['OBC Certificate', 'Income Certificate', 'Community Certificate'].map(tab => (
                            <button
                              key={tab}
                              className={`service-tab ${activeEDistrictSubTab === tab ? 'active' : ''}`}
                              onClick={() => {
                                setActiveEDistrictSubTab(tab)
                                setApiResponse(null)
                              }}
                              style={{ flex: 1 }}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>

                        <div className="service-form-container">
                          <div key={activeEDistrictSubTab} className="glass-card form-inner" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                            <h4 style={{color: 'var(--text-main)', marginBottom: '16px' }}>{activeEDistrictSubTab} Verification</h4>

                            {['OBC Certificate', 'Income Certificate', 'Community Certificate'].includes(activeEDistrictSubTab) && (
                              <div className="form-group">
                                <label className="form-label">Application Number (APPNO)</label>
                                <input type="text" className="input-field" placeholder="e.g., TN-120160101101" id="ed_appno" />
                              </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                              <div className="form-group"><label className="form-label">Transaction ID</label><input type="text" className="input-field" id="ed_txnId" placeholder="f7f1469c..." /></div>
                              <div className="form-group"><label className="form-label">Format</label><input type="text" className="input-field" id="ed_format" defaultValue="pdf" /></div>
                              <div className="form-group"><label className="form-label">Consent ID</label><input type="text" className="input-field" id="ed_consentId" placeholder="ea9c43aa..." /></div>
                              <div className="form-group"><label className="form-label">Timestamp</label><input type="text" className="input-field" id="ed_timestamp" placeholder="2026-02-28..." /></div>
                              <div className="form-group"><label className="form-label">Data Consumer ID</label><input type="text" className="input-field" id="ed_dataConsumer_id" defaultValue="in.gov.portal" /></div>
                              <div className="form-group"><label className="form-label">Data Provider ID</label><input type="text" className="input-field" id="ed_dataProvider_id" defaultValue="tn.gov.edistrict" /></div>
                              <div className="form-group"><label className="form-label">Purpose Description</label><input type="text" className="input-field" id="ed_purpose" defaultValue="Certificate Verification" /></div>

                              <div className="form-group"><label className="form-label">User ID Type</label><input type="text" className="input-field" id="ed_user_idType" defaultValue="AADHAAR" /></div>
                              <div className="form-group"><label className="form-label">User ID Number</label><input type="text" className="input-field" id="ed_user_idNumber" defaultValue="XXXXXXXXXXXX" /></div>
                              <div className="form-group"><label className="form-label">User Mobile</label><input type="text" className="input-field" id="ed_user_mobile" defaultValue="XXXXXXXXXX" /></div>
                              <div className="form-group"><label className="form-label">User Email</label><input type="email" className="input-field" id="ed_user_email" defaultValue="user@example.com" placeholder="name@example.com" required maxLength={254} minLength={5} pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$" onBlur={(e) => { if (e.target.value && !isValidEmailAddress(e.target.value)) alert('Please enter a valid email address') }} /></div>

                              <div className="form-group"><label className="form-label">Data ID</label><input type="text" className="input-field" id="ed_data_id" defaultValue="string" /></div>

                              <div className="form-group"><label className="form-label">Access</label><input type="text" className="input-field" id="ed_access" defaultValue="VIEW" /></div>
                              <div className="form-group"><label className="form-label">Date Range From</label><input type="text" className="input-field" id="ed_date_from" /></div>
                              <div className="form-group"><label className="form-label">Date Range To</label><input type="text" className="input-field" id="ed_date_to" /></div>

                              <div className="form-group"><label className="form-label">Freq Unit</label><input type="text" className="input-field" id="ed_freq_unit" defaultValue="ONCE" /></div>
                              <div className="form-group"><label className="form-label">Freq Value (int)</label><input type="number" className="input-field" id="ed_freq_value" defaultValue="0" /></div>
                              <div className="form-group"><label className="form-label">Freq Repeats (int)</label><input type="number" className="input-field" id="ed_freq_repeats" defaultValue="0" /></div>

                              <div className="form-group"><label className="form-label">Signature</label><input type="text" className="input-field" id="ed_signature" defaultValue="NA" /></div>
                            </div>

                            <button
                              className="btn-primary"
                              style={{ marginTop: '24px', width: '100%' }}
                              onClick={() => {
                                const getVal = (id: string, def = '') => {
                                  const el = document.getElementById(id) as HTMLInputElement;
                                  return el && el.value ? el.value : def;
                                };

                                let endpoint = '';
                                let certificateParameters: any = {};

                                if (['OBC Certificate', 'Income Certificate', 'Community Certificate'].includes(activeEDistrictSubTab)) {
                                  const appno = getVal('ed_appno', '');
                                  if (!appno) return alert('Please enter Application Number (APPNO)');

                                  if (activeEDistrictSubTab === 'OBC Certificate') endpoint = '/obcer';
                                  if (activeEDistrictSubTab === 'Income Certificate') endpoint = '/incer';
                                  if (activeEDistrictSubTab === 'Community Certificate') endpoint = '/cmcer';

                                  certificateParameters = { APPNO: appno };
                                }

                                const defaultTxnId = Math.random().toString(36).substring(7);
                                const defaultTimestamp = new Date().toISOString();

                                const txnId = getVal('ed_txnId', defaultTxnId);
                                const timestamp = getVal('ed_timestamp', defaultTimestamp);
                                const edUserEmail = getVal('ed_user_email', 'user@example.com');
                                if (!isValidEmailAddress(edUserEmail)) return alert('Please enter a valid email address');

                                const payload = {
                                  txnId,
                                  format: getVal('ed_format', 'pdf'),
                                  certificateParameters,
                                  consentArtifact: {
                                    consent: {
                                      consentId: getVal('ed_consentId', txnId),
                                      timestamp,
                                      dataConsumer: { id: getVal('ed_dataConsumer_id', "in.gov.portal") },
                                      dataProvider: { id: getVal('ed_dataProvider_id', "tn.gov.edistrict") },
                                      purpose: { description: getVal('ed_purpose', "Certificate Verification") },
                                      user: {
                                        idType: getVal('ed_user_idType', "AADHAAR"),
                                        idNumber: getVal('ed_user_idNumber', "XXXXXXXXXXXX"),
                                        mobile: getVal('ed_user_mobile', "XXXXXXXXXX"),
                                        email: edUserEmail
                                      },
                                      data: { id: getVal('ed_data_id', "string") },
                                      permission: {
                                        access: getVal('ed_access', "VIEW"),
                                        dateRange: {
                                          from: getVal('ed_date_from', timestamp),
                                          to: getVal('ed_date_to', timestamp)
                                        },
                                        frequency: {
                                          unit: getVal('ed_freq_unit', "ONCE"),
                                          value: parseInt(getVal('ed_freq_value', "0")) || 0,
                                          repeats: parseInt(getVal('ed_freq_repeats', "0")) || 0
                                        }
                                      }
                                    },
                                    signature: { signature: getVal('ed_signature', "NA") }
                                  }
                                };

                                callSetuAPI('https://apisetu.gov.in/certificate/v3/edistricttn' + endpoint, payload);
                              }}
                              disabled={isApiLoading}
                            >
                              {isApiLoading ? 'Processing...' : 'Verify & Download PDF'}
                            </button>

                            {apiResponse && (
                              <div className="response-card-refined" style={{ marginTop: '24px' }}>
                                <div className={`status-banner ${apiResponse.error ? 'error' : apiResponse.success ? 'success' : 'warning'}`}>
                                  <span className="status-icon">
                                    {apiResponse.error ? '❌' : apiResponse.success ? '✔️' : '⚠️'}
                                  </span>
                                  <span className="status-text">
                                    {apiResponse.error ? 'API Error' : apiResponse.rd || 'Service Response'}
                                  </span>
                                </div>

                                <div className="response-details">
                                  {apiResponse.pdfUrl ? (
                                    <div className="pdf-action" style={{ textAlign: 'center', padding: '10px' }}>
                                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>Your certificate is ready for download.</p>
                                      <a href={apiResponse.pdfUrl} download={`${activeEDistrictSubTab.replace(' ', '_')}.pdf`} className="btn-primary" style={{ textDecoration: 'none', background: '#f59e0b' }}>
                                        Download Certificate PDF
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="error-msg">
                                      {apiResponse.errorDescription || apiResponse.error || 'No record found with the provided details.'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="info-alert" style={{ marginTop: '24px', padding: '16px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', gap: '12px' }}>
                          <span style={{ fontSize: '20px' }}>ℹ️</span>
                          <p style={{ fontSize: '13px', color: '#fcd34d', margin: 0 }}>
                            TN eDistrict is the online service delivery portal for TN State Govt. Documents can be pulled into citizens' DigiLocker accounts.
                          </p>
                        </div>
                      </div>
                    ) : activeServiceSubTab === 'eb-bill-services' ? (
                      <div className="name-transfer-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                          <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>EB Service</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Choose a form under EB services.</p>
                          </div>
                        </div>

                        <div className="services-list" style={{ marginTop: '16px' }}>
                          <div className="service-list-item" onClick={() => setActiveServiceSubTab('name-transfer')}>
                            <div className="service-logo" style={{ background: '#8b5cf6' }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            </div>
                            <div className="service-details">
                              <h3>Name Transfer</h3>
                              <p>Apply for EB/Property Name Transfer</p>
                            </div>
                            <div className="status-indicator">Active</div>
                          </div>

                          <div className="service-list-item" onClick={() => setActiveServiceSubTab('new-service-connection')}>
                            <div className="service-logo" style={{ background: '#6d28d9' }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 12h18" /><path d="M12 3v18" /><circle cx="12" cy="12" r="9" /></svg>
                            </div>
                            <div className="service-details">
                              <h3>New Service Connection</h3>
                              <p>Domestic, Agri, Commercial, and Industrial forms.</p>
                            </div>
                            <div className="status-indicator">Active</div>
                          </div>

                          <div className="service-list-item" onClick={() => setActiveServiceSubTab('new-service-connection-agri')}>
                            <div className="service-logo" style={{ background: '#7c3aed' }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 12h18" /><path d="M12 3v18" /><circle cx="12" cy="12" r="9" /></svg>
                            </div>
                            <div className="service-details">
                              <h3>New Service Connection Agri</h3>
                              <p>Apply agri EB service connection.</p>
                            </div>
                            <div className="status-indicator">Active</div>
                          </div>

                          <div className="service-list-item" onClick={() => setActiveServiceSubTab('tariff-change')}>
                            <div className="service-logo" style={{ background: '#6366f1' }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            </div>
                            <div className="service-details">
                              <h3>Tariff Change</h3>
                              <p>Apply for domestic/commercial/industrial tariff change.</p>
                            </div>
                            <div className="status-indicator">Active</div>
                          </div>

                          <div className="service-list-item" onClick={() => setActiveServiceSubTab('load-reduction')}>
                            <div className="service-logo" style={{ background: '#4f46e5' }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                            </div>
                            <div className="service-details">
                              <h3>Load Reduction</h3>
                              <p>Apply to reduce sanctioned EB load.</p>
                            </div>
                            <div className="status-indicator">Active</div>
                          </div>

                          <div className="service-list-item" onClick={() => setActiveServiceSubTab('addl-load')}>
                            <div className="service-logo" style={{ background: '#4338ca' }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 5v14" /><path d="M5 12h14" /><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                            </div>
                            <div className="service-details">
                              <h3>Add Load</h3>
                              <p>Apply additional load services.</p>
                            </div>
                            <div className="status-indicator">Active</div>
                          </div>

                          {[
                            { name: 'Ownership Update', desc: 'Apply for owner details correction.' }
                          ].map((item, idx) => (
                            <div key={idx} className="service-list-item" style={{ opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' }}>
                              <div className="service-logo" style={{ background: 'var(--glass)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                              </div>
                              <div className="service-details">
                                <h3>{item.name}</h3>
                                <p>{item.desc}</p>
                              </div>
                              <div style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', background: 'var(--glass)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Coming Soon</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : activeServiceSubTab === 'new-service-connection' ? (
                      <div className="name-transfer-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(109, 40, 217, 0.2)' }}>
                          <div style={{ padding: '12px', background: 'rgba(109, 40, 217, 0.1)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M3 12h18" /><path d="M12 3v18" /><circle cx="12" cy="12" r="9" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>New Service Connection</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Choose connection type and continue.</p>
                          </div>
                        </div>

                        <button className="back-btn" onClick={() => setActiveServiceSubTab('eb-bill-services')} style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                          Back to EB Service
                        </button>

                        <div className="services-list" style={{ marginTop: '16px' }}>
                          <div className="service-list-item" onClick={() => setActiveServiceSubTab('new-service-connection-domestic')}>
                            <div className="service-logo" style={{ background: '#7c3aed' }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 12h18" /><path d="M12 3v18" /><circle cx="12" cy="12" r="9" /></svg>
                            </div>
                            <div className="service-details">
                              <h3>New Service Connection Domestic</h3>
                              <p>Apply domestic EB service connection.</p>
                            </div>
                            <div className="status-indicator">Active</div>
                          </div>

                          <div className="service-list-item" onClick={() => setActiveServiceSubTab('new-service-connection-agri')}>
                            <div className="service-logo" style={{ background: '#6d28d9' }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 12h18" /><path d="M12 3v18" /><circle cx="12" cy="12" r="9" /></svg>
                            </div>
                            <div className="service-details">
                              <h3>New Service Connection Agri</h3>
                              <p>Apply agri EB service connection.</p>
                            </div>
                            <div className="status-indicator">Active</div>
                          </div>

                          <div className="service-list-item" onClick={() => setActiveServiceSubTab('new-service-connection-commercial')}>
                            <div className="service-logo" style={{ background: '#5b21b6' }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 12h18" /><path d="M12 3v18" /><circle cx="12" cy="12" r="9" /></svg>
                            </div>
                            <div className="service-details">
                              <h3>New Service Connection Commercial</h3>
                              <p>Apply commercial EB service connection.</p>
                            </div>
                            <div className="status-indicator">Active</div>
                          </div>

                          <div className="service-list-item" onClick={() => setActiveServiceSubTab('new-service-connection-industrial')}>
                            <div className="service-logo" style={{ background: '#4c1d95' }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 12h18" /><path d="M12 3v18" /><circle cx="12" cy="12" r="9" /></svg>
                            </div>
                            <div className="service-details">
                              <h3>New Service Connection Industrial</h3>
                              <p>Apply industrial EB service connection.</p>
                            </div>
                            <div className="status-indicator">Active</div>
                          </div>
                        </div>
                      </div>
                    ) : activeServiceSubTab === 'new-service-connection-domestic' ? (
                      <div className="name-transfer-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(124, 58, 237, 0.2)' }}>
                          <div style={{ padding: '12px', background: 'rgba(124, 58, 237, 0.1)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M3 12h18" /><path d="M12 3v18" /><circle cx="12" cy="12" r="9" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>New Service Connection Domestic</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Domestic EB new connection application.</p>
                          </div>
                        </div>

                        <button className="back-btn" onClick={() => setActiveServiceSubTab('new-service-connection')} style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                          Back to New Service Connection
                        </button>

                        <div className="service-form-container" style={{ marginTop: '24px' }}>
                          <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div className="form-group">
                              <label className="form-label">Nearest EB Service No with Region Code <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={12} className="input-field" placeholder="e.g. 032050014563" value={newServiceConnectionDomesticForm.nearestEbServiceNo} onChange={(e) => setNewServiceConnectionDomesticForm({ ...newServiceConnectionDomesticForm, nearestEbServiceNo: e.target.value.replace(/\D/g, '') })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <OptimizedFileUpload label="Photo (JPEG)" required accept="image/jpeg, image/jpg" onFileChange={(processed) => setNewServiceConnectionDomesticForm({ ...newServiceConnectionDomesticForm, photo: processed.compressedFile })} />
                              <OptimizedFileUpload label="Signature (JPEG)" required accept="image/jpeg, image/jpg" onFileChange={(processed) => setNewServiceConnectionDomesticForm({ ...newServiceConnectionDomesticForm, signature: processed.compressedFile })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Mobile No <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={10} className="input-field" placeholder="e.g. 9000090000" value={newServiceConnectionDomesticForm.mobileNo} onChange={(e) => setNewServiceConnectionDomesticForm({ ...newServiceConnectionDomesticForm, mobileNo: normalizePhoneInput(e.target.value) })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Aadhar No** <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={12} className="input-field" placeholder="e.g. 123412341234" value={newServiceConnectionDomesticForm.aadharNo} onChange={(e) => setNewServiceConnectionDomesticForm({ ...newServiceConnectionDomesticForm, aadharNo: e.target.value.replace(/\D/g, '') })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Tariff</label>
                              <input className="input-field" value={newServiceConnectionDomesticForm.tariff} readOnly />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div className="form-group">
                                <label className="form-label">Phase <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="input-field" value={newServiceConnectionDomesticForm.phase} onChange={(e) => {
                                  const phase = e.target.value
                                  setNewServiceConnectionDomesticForm({
                                    ...newServiceConnectionDomesticForm,
                                    phase,
                                    load: phase === 'Single' ? 'Single Phase 2 KW (Rs 5086)' : 'Three Phase 3 KW (Rs 12436)'
                                  })
                                }}>
                                  <option value="Single">Single</option>
                                  <option value="Three">Three</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Load <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="input-field" value={newServiceConnectionDomesticForm.load} onChange={(e) => setNewServiceConnectionDomesticForm({ ...newServiceConnectionDomesticForm, load: e.target.value })}>
                                  {newServiceConnectionDomesticForm.phase === 'Single' ? (
                                    <option value="Single Phase 2 KW (Rs 5086)">Single Phase 2 KW (Rs 5086)</option>
                                  ) : (
                                    <>
                                      <option value="Three Phase 3 KW (Rs 12436)">Three Phase 3 KW (Rs 12436)</option>
                                      <option value="Three Phase 4 KW (Rs.15336)">Three Phase 4 KW (Rs.15336)</option>
                                    </>
                                  )}
                                </select>
                              </div>
                            </div>
                            <OptimizedFileUpload label="Documents* (Or) Recent Property Tax" required accept=".pdf,image/*" onFileChange={(processed) => setNewServiceConnectionDomesticForm({ ...newServiceConnectionDomesticForm, documents: processed.compressedFile })} />

                            <div style={{ marginTop: '8px', padding: '12px', border: '1px dashed var(--glass-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                              <div>* In Case Death Required Death Certificate and Legal Heir Certificate (NOC is Required)</div>
                              <div>** Aadhar OTP is mandatory for Domestic Service</div>
                            </div>

                            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.08)', fontSize: '13px', color: 'var(--text-muted)' }}>
                              Service charge: Rs {getSubmissionChargeAmount({ serviceName: 'EB Service - New Service Connection Domestic' }).toFixed(2)}
                            </div>

                            <button className="btn-primary" style={{ marginTop: '24px', width: '100%' }} onClick={() => {
                              if (!newServiceConnectionDomesticForm.nearestEbServiceNo || !newServiceConnectionDomesticForm.mobileNo || !newServiceConnectionDomesticForm.aadharNo || !newServiceConnectionDomesticForm.documents || !newServiceConnectionDomesticForm.photo || !newServiceConnectionDomesticForm.signature) {
                                return alert('Please fill all mandatory fields and upload required documents!')
                              }
                              if (newServiceConnectionDomesticForm.nearestEbServiceNo.length !== 12) return alert('Nearest EB Service No must be exactly 12 digits')
                              if (newServiceConnectionDomesticForm.mobileNo.length !== 10) return alert('Mobile No must be exactly 10 digits')
                              if (newServiceConnectionDomesticForm.aadharNo.length !== 12) return alert('Aadhar No must be exactly 12 digits')

                              const serviceFee = 0
                              if (currentUser.walletBalance < serviceFee) return alert('Insufficient wallet balance! Please add money to your wallet.')

                              const formNo = 'NSCD' + Math.random().toString(36).substring(2, 7).toUpperCase()
                              const newTransaction = { id: Date.now(), type: 'Debit', amount: serviceFee, date: new Date().toISOString().split('T')[0], status: 'Success', description: `EB Service - New Service Connection Domestic Fee (Form: ${formNo})` }
                              const newSubmission = {
                                id: Math.random().toString(),
                                formNo,
                                userId: currentUser.id,
                                userName: currentUser.name,
                                serviceName: 'EB Service - New Service Connection Domestic',
                                formData: {
                                  ...newServiceConnectionDomesticForm,
                                  documents: newServiceConnectionDomesticForm.documents?.name || 'No file attached',
                                  photo: newServiceConnectionDomesticForm.photo?.name || 'No photo attached',
                                  signature: newServiceConnectionDomesticForm.signature?.name || 'No signature attached'
                                },
                                appliedDate: new Date().toISOString(),
                                status: 'Pending',
                                referenceNo: '',
                                demandPrint: '',
                                serviceUserId: '',
                                servicePassword: ''
                              }

                              const updatedUser = { ...currentUser, walletBalance: currentUser.walletBalance - serviceFee, transactions: [newTransaction, ...(currentUser.transactions || [])] }
                              setCurrentUser(updatedUser)
                              setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u))
                              if (!applyServiceFinanceOnSubmission(newSubmission)) return;
                              setServiceForms([newSubmission, ...serviceForms])
                              alert('Form submitted successfully! Application Number: ' + formNo + '. Service charge deducted: Rs ' + getSubmissionChargeAmount(newSubmission).toFixed(2))
                              setNewServiceConnectionDomesticForm({
                                nearestEbServiceNo: '',
                                mobileNo: '',
                                aadharNo: '',
                                tariff: 'Domestic',
                                phase: 'Single',
                                load: 'Single Phase 2 KW (Rs 5086)',
                                photo: null,
                                signature: null,
                                documents: null
                              })
                              setActiveServiceSubTab('new-service-connection')
                            }}>
                              Submit
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : activeServiceSubTab === 'new-service-connection-agri' ? (
                      <div className="name-transfer-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(109, 40, 217, 0.2)' }}>
                          <div style={{ padding: '12px', background: 'rgba(109, 40, 217, 0.1)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M3 12h18" /><path d="M12 3v18" /><circle cx="12" cy="12" r="9" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>New Service Connection Agri</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Agri EB new connection application.</p>
                          </div>
                        </div>

                        <button className="back-btn" onClick={() => setActiveServiceSubTab('new-service-connection')} style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                          Back to New Service Connection
                        </button>

                        <div className="service-form-container" style={{ marginTop: '24px' }}>
                          <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div className="form-group">
                              <label className="form-label">Nearest EB Service No with Region Code <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={12} className="input-field" placeholder="e.g. 032050014563" value={newServiceConnectionAgriForm.nearestEbServiceNo} onChange={(e) => setNewServiceConnectionAgriForm({ ...newServiceConnectionAgriForm, nearestEbServiceNo: e.target.value.replace(/\D/g, '') })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <OptimizedFileUpload label="Photo (JPEG)" required accept="image/jpeg, image/jpg" onFileChange={(processed) => setNewServiceConnectionAgriForm({ ...newServiceConnectionAgriForm, photo: processed.compressedFile })} />
                              <OptimizedFileUpload label="Signature (JPEG)" required accept="image/jpeg, image/jpg" onFileChange={(processed) => setNewServiceConnectionAgriForm({ ...newServiceConnectionAgriForm, signature: processed.compressedFile })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Mobile No <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={10} className="input-field" placeholder="e.g. 9000090000" value={newServiceConnectionAgriForm.mobileNo} onChange={(e) => setNewServiceConnectionAgriForm({ ...newServiceConnectionAgriForm, mobileNo: normalizePhoneInput(e.target.value) })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Aadhar No** <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={12} className="input-field" placeholder="e.g. 123412341234" value={newServiceConnectionAgriForm.aadharNo} onChange={(e) => setNewServiceConnectionAgriForm({ ...newServiceConnectionAgriForm, aadharNo: e.target.value.replace(/\D/g, '') })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Tariff</label>
                              <input className="input-field" value={newServiceConnectionAgriForm.tariff} readOnly />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div className="form-group">
                                <label className="form-label">Phase <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="input-field" value={newServiceConnectionAgriForm.phase} onChange={(e) => {
                                  const phase = e.target.value
                                  setNewServiceConnectionAgriForm({
                                    ...newServiceConnectionAgriForm,
                                    phase,
                                    load: phase === 'Single' ? 'Single Phase 2 KW (Rs 5086)' : 'Three Phase 3 KW (Rs 12436)'
                                  })
                                }}>
                                  <option value="Single">Single</option>
                                  <option value="Three">Three</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Load <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="input-field" value={newServiceConnectionAgriForm.load} onChange={(e) => setNewServiceConnectionAgriForm({ ...newServiceConnectionAgriForm, load: e.target.value })}>
                                  {newServiceConnectionAgriForm.phase === 'Single' ? (
                                    <option value="Single Phase 2 KW (Rs 5086)">Single Phase 2 KW (Rs 5086)</option>
                                  ) : (
                                    <>
                                      <option value="Three Phase 3 KW (Rs 12436)">Three Phase 3 KW (Rs 12436)</option>
                                      <option value="Three Phase 4 KW (Rs.15336)">Three Phase 4 KW (Rs.15336)</option>
                                    </>
                                  )}
                                </select>
                              </div>
                            </div>
                            <OptimizedFileUpload label="Documents* (Resolution 100 or Size 3 MB)" required accept=".pdf,image/*" onFileChange={(processed) => setNewServiceConnectionAgriForm({ ...newServiceConnectionAgriForm, documents: processed.compressedFile })} />

                            <div style={{ marginTop: '8px', padding: '12px', border: '1px dashed var(--glass-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                              <div>* 1) Patta/Chitta 2) Adangal 3) FMB Sketch 4) Topo Sketch 5) VAO Certificate 6) Document</div>
                              <div>** Aadhar OTP is mandatory for Agri Service</div>
                            </div>

                            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.08)', fontSize: '13px', color: 'var(--text-muted)' }}>
                              Service charge: Rs {getSubmissionChargeAmount({ serviceName: 'EB Service - New Service Connection Agri' }).toFixed(2)}
                            </div>

                            <button className="btn-primary" style={{ marginTop: '24px', width: '100%' }} onClick={() => {
                              if (!newServiceConnectionAgriForm.nearestEbServiceNo || !newServiceConnectionAgriForm.mobileNo || !newServiceConnectionAgriForm.aadharNo || !newServiceConnectionAgriForm.documents || !newServiceConnectionAgriForm.photo || !newServiceConnectionAgriForm.signature) {
                                return alert('Please fill all mandatory fields and upload required documents!')
                              }
                              if (newServiceConnectionAgriForm.nearestEbServiceNo.length !== 12) return alert('Nearest EB Service No must be exactly 12 digits')
                              if (newServiceConnectionAgriForm.mobileNo.length !== 10) return alert('Mobile No must be exactly 10 digits')
                              if (newServiceConnectionAgriForm.aadharNo.length !== 12) return alert('Aadhar No must be exactly 12 digits')

                              const serviceFee = 0
                              if (currentUser.walletBalance < serviceFee) return alert('Insufficient wallet balance! Please add money to your wallet.')

                              const formNo = 'NSCA' + Math.random().toString(36).substring(2, 7).toUpperCase()
                              const newTransaction = { id: Date.now(), type: 'Debit', amount: serviceFee, date: new Date().toISOString().split('T')[0], status: 'Success', description: `EB Service - New Service Connection Agri Fee (Form: ${formNo})` }
                              const newSubmission = {
                                id: Math.random().toString(),
                                formNo,
                                userId: currentUser.id,
                                userName: currentUser.name,
                                serviceName: 'EB Service - New Service Connection Agri',
                                formData: {
                                  ...newServiceConnectionAgriForm,
                                  documents: newServiceConnectionAgriForm.documents?.name || 'No file attached',
                                  photo: newServiceConnectionAgriForm.photo?.name || 'No photo attached',
                                  signature: newServiceConnectionAgriForm.signature?.name || 'No signature attached'
                                },
                                appliedDate: new Date().toISOString(),
                                status: 'Pending',
                                referenceNo: '',
                                demandPrint: '',
                                serviceUserId: '',
                                servicePassword: ''
                              }

                              const updatedUser = { ...currentUser, walletBalance: currentUser.walletBalance - serviceFee, transactions: [newTransaction, ...(currentUser.transactions || [])] }
                              setCurrentUser(updatedUser)
                              setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u))
                              if (!applyServiceFinanceOnSubmission(newSubmission)) return;
                              setServiceForms([newSubmission, ...serviceForms])
                              alert('Form submitted successfully! Application Number: ' + formNo + '. Service charge deducted: Rs ' + getSubmissionChargeAmount(newSubmission).toFixed(2))
                              setNewServiceConnectionAgriForm({
                                nearestEbServiceNo: '',
                                mobileNo: '',
                                aadharNo: '',
                                tariff: 'Domestic',
                                phase: 'Single',
                                load: 'Single Phase 2 KW (Rs 5086)',
                                photo: null,
                                signature: null,
                                documents: null
                              })
                              setActiveServiceSubTab('new-service-connection')
                            }}>
                              Submit
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : activeServiceSubTab === 'new-service-connection-commercial' ? (
                      <div className="name-transfer-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(91, 33, 182, 0.2)' }}>
                          <div style={{ padding: '12px', background: 'rgba(91, 33, 182, 0.1)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M3 12h18" /><path d="M12 3v18" /><circle cx="12" cy="12" r="9" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>New Service Connection Commercial</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Commercial EB new connection application.</p>
                          </div>
                        </div>

                        <button className="back-btn" onClick={() => setActiveServiceSubTab('new-service-connection')} style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                          Back to New Service Connection
                        </button>

                        <div className="service-form-container" style={{ marginTop: '24px' }}>
                          <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div className="form-group">
                              <label className="form-label">Nearest EB Service No with Region Code <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={12} className="input-field" placeholder="e.g. 032050014563" value={newServiceConnectionCommercialForm.nearestEbServiceNo} onChange={(e) => setNewServiceConnectionCommercialForm({ ...newServiceConnectionCommercialForm, nearestEbServiceNo: e.target.value.replace(/\D/g, '') })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <OptimizedFileUpload label="Photo (JPEG)" required accept="image/jpeg, image/jpg" onFileChange={(processed) => setNewServiceConnectionCommercialForm({ ...newServiceConnectionCommercialForm, photo: processed.compressedFile })} />
                              <OptimizedFileUpload label="Signature (JPEG)" required accept="image/jpeg, image/jpg" onFileChange={(processed) => setNewServiceConnectionCommercialForm({ ...newServiceConnectionCommercialForm, signature: processed.compressedFile })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Mobile No <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={10} className="input-field" placeholder="e.g. 9000090000" value={newServiceConnectionCommercialForm.mobileNo} onChange={(e) => setNewServiceConnectionCommercialForm({ ...newServiceConnectionCommercialForm, mobileNo: normalizePhoneInput(e.target.value) })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Tariff</label>
                              <input className="input-field" value={newServiceConnectionCommercialForm.tariff} readOnly />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div className="form-group">
                                <label className="form-label">Phase <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="input-field" value={newServiceConnectionCommercialForm.phase} onChange={(e) => {
                                  const phase = e.target.value
                                  setNewServiceConnectionCommercialForm({
                                    ...newServiceConnectionCommercialForm,
                                    phase,
                                    load: phase === 'Single' ? 'Single Phase 1 KW (Rs 4286)' : 'Three Phase 3 KW (Rs 12436)'
                                  })
                                }}>
                                  <option value="Single">Single</option>
                                  <option value="Three">Three</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Load <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="input-field" value={newServiceConnectionCommercialForm.load} onChange={(e) => setNewServiceConnectionCommercialForm({ ...newServiceConnectionCommercialForm, load: e.target.value })}>
                                  {newServiceConnectionCommercialForm.phase === 'Single' ? (
                                    <>
                                      <option value="Single Phase 1 KW (Rs 4286)">Single Phase 1 KW (Rs 4286)</option>
                                      <option value="Single Phase 2 KW (Rs 6286)">Single Phase 2 KW (Rs 6286)</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="Three Phase 3 KW (Rs 12436)">Three Phase 3 KW (Rs 12436)</option>
                                      <option value="Three Phase 4 KW (Rs.15336)">Three Phase 4 KW (Rs.15336)</option>
                                    </>
                                  )}
                                </select>
                              </div>
                            </div>
                            <OptimizedFileUpload label="Documents* (Or) Recent Property Tax" required accept=".pdf,image/*" onFileChange={(processed) => setNewServiceConnectionCommercialForm({ ...newServiceConnectionCommercialForm, documents: processed.compressedFile })} />
                            <OptimizedFileUpload label="Completion Certificate" required accept=".pdf,image/*" onFileChange={(processed) => setNewServiceConnectionCommercialForm({ ...newServiceConnectionCommercialForm, completionCertificate: processed.compressedFile })} />

                            <div style={{ marginTop: '8px', padding: '12px', border: '1px dashed var(--glass-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                              <div>* In Case Death Required Death Certificate and Legal Heir Certificate (NOC is Required)</div>
                            </div>

                            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.08)', fontSize: '13px', color: 'var(--text-muted)' }}>
                              Service charge: Rs {getSubmissionChargeAmount({ serviceName: 'EB Service - New Service Connection Commercial' }).toFixed(2)}
                            </div>

                            <button className="btn-primary" style={{ marginTop: '24px', width: '100%' }} onClick={() => {
                              if (!newServiceConnectionCommercialForm.nearestEbServiceNo || !newServiceConnectionCommercialForm.mobileNo || !newServiceConnectionCommercialForm.documents || !newServiceConnectionCommercialForm.completionCertificate || !newServiceConnectionCommercialForm.photo || !newServiceConnectionCommercialForm.signature) {
                                return alert('Please fill all mandatory fields and upload required documents!')
                              }
                              if (newServiceConnectionCommercialForm.nearestEbServiceNo.length !== 12) return alert('Nearest EB Service No must be exactly 12 digits')
                              if (newServiceConnectionCommercialForm.mobileNo.length !== 10) return alert('Mobile No must be exactly 10 digits')

                              const serviceFee = 0
                              if (currentUser.walletBalance < serviceFee) return alert('Insufficient wallet balance! Please add money to your wallet.')

                              const formNo = 'NSCC' + Math.random().toString(36).substring(2, 7).toUpperCase()
                              const newTransaction = { id: Date.now(), type: 'Debit', amount: serviceFee, date: new Date().toISOString().split('T')[0], status: 'Success', description: `EB Service - New Service Connection Commercial Fee (Form: ${formNo})` }
                              const newSubmission = {
                                id: Math.random().toString(),
                                formNo,
                                userId: currentUser.id,
                                userName: currentUser.name,
                                serviceName: 'EB Service - New Service Connection Commercial',
                                formData: {
                                  ...newServiceConnectionCommercialForm,
                                  documents: newServiceConnectionCommercialForm.documents?.name || 'No file attached',
                                  completionCertificate: newServiceConnectionCommercialForm.completionCertificate?.name || 'No file attached',
                                  photo: newServiceConnectionCommercialForm.photo?.name || 'No photo attached',
                                  signature: newServiceConnectionCommercialForm.signature?.name || 'No signature attached'
                                },
                                appliedDate: new Date().toISOString(),
                                status: 'Pending',
                                referenceNo: '',
                                demandPrint: '',
                                serviceUserId: '',
                                servicePassword: ''
                              }

                              const updatedUser = { ...currentUser, walletBalance: currentUser.walletBalance - serviceFee, transactions: [newTransaction, ...(currentUser.transactions || [])] }
                              setCurrentUser(updatedUser)
                              setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u))
                              if (!applyServiceFinanceOnSubmission(newSubmission)) return;
                              setServiceForms([newSubmission, ...serviceForms])
                              alert('Form submitted successfully! Application Number: ' + formNo + '. Service charge deducted: Rs ' + getSubmissionChargeAmount(newSubmission).toFixed(2))
                              setNewServiceConnectionCommercialForm({
                                nearestEbServiceNo: '',
                                mobileNo: '',
                                tariff: 'Commercial',
                                phase: 'Single',
                                load: 'Single Phase 1 KW (Rs 4286)',
                                photo: null,
                                signature: null,
                                documents: null,
                                completionCertificate: null
                              })
                              setActiveServiceSubTab('new-service-connection')
                            }}>
                              Submit
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : activeServiceSubTab === 'new-service-connection-industrial' ? (
                      <div className="name-transfer-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(76, 29, 149, 0.2)' }}>
                          <div style={{ padding: '12px', background: 'rgba(76, 29, 149, 0.1)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2"><path d="M3 12h18" /><path d="M12 3v18" /><circle cx="12" cy="12" r="9" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>New Service Connection Industrial</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Industrial EB new connection application.</p>
                          </div>
                        </div>

                        <button className="back-btn" onClick={() => setActiveServiceSubTab('new-service-connection')} style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                          Back to New Service Connection
                        </button>

                        <div className="service-form-container" style={{ marginTop: '24px' }}>
                          <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div className="form-group">
                              <label className="form-label">Nearest EB Service No with Region Code <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={12} className="input-field" placeholder="e.g. 032050014563" value={newServiceConnectionIndustrialForm.nearestEbServiceNo} onChange={(e) => setNewServiceConnectionIndustrialForm({ ...newServiceConnectionIndustrialForm, nearestEbServiceNo: e.target.value.replace(/\D/g, '') })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <OptimizedFileUpload label="Photo (JPEG)" required accept="image/jpeg, image/jpg" onFileChange={(processed) => setNewServiceConnectionIndustrialForm({ ...newServiceConnectionIndustrialForm, photo: processed.compressedFile })} />
                              <OptimizedFileUpload label="Signature (JPEG)" required accept="image/jpeg, image/jpg" onFileChange={(processed) => setNewServiceConnectionIndustrialForm({ ...newServiceConnectionIndustrialForm, signature: processed.compressedFile })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Mobile No <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={10} className="input-field" placeholder="e.g. 9000090000" value={newServiceConnectionIndustrialForm.mobileNo} onChange={(e) => setNewServiceConnectionIndustrialForm({ ...newServiceConnectionIndustrialForm, mobileNo: normalizePhoneInput(e.target.value) })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Tariff</label>
                              <input className="input-field" value={newServiceConnectionIndustrialForm.tariff} readOnly />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div className="form-group">
                                <label className="form-label">Phase <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="input-field" value={newServiceConnectionIndustrialForm.phase} onChange={(e) => {
                                  const phase = e.target.value
                                  setNewServiceConnectionIndustrialForm({
                                    ...newServiceConnectionIndustrialForm,
                                    phase,
                                    load: phase === 'Single' ? 'Single Phase 1 KW (Rs 4886)' : 'Three Phase 3 KW (Rs 12436) - Upto 112 KW'
                                  })
                                }}>
                                  <option value="Single">Single</option>
                                  <option value="Three">Three</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Load <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="input-field" value={newServiceConnectionIndustrialForm.load} onChange={(e) => setNewServiceConnectionIndustrialForm({ ...newServiceConnectionIndustrialForm, load: e.target.value })}>
                                  {newServiceConnectionIndustrialForm.phase === 'Single' ? (
                                    <>
                                      <option value="Single Phase 1 KW (Rs 4886)">Single Phase 1 KW (Rs 4886)</option>
                                      <option value="Single Phase 2 KW (Rs 7786)">Single Phase 2 KW (Rs 7786)</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="Three Phase 3 KW (Rs 12436) - Upto 112 KW">Three Phase 3 KW (Rs 12436) - Upto 112 KW</option>
                                      <option value="Three Phase 4 KW (Rs.15336) - Upto 150 KW">Three Phase 4 KW (Rs.15336) - Upto 150 KW</option>
                                    </>
                                  )}
                                </select>
                              </div>
                            </div>
                            <OptimizedFileUpload label="Documents* (Or) Recent Property Tax" required accept=".pdf,image/*" onFileChange={(processed) => setNewServiceConnectionIndustrialForm({ ...newServiceConnectionIndustrialForm, documents: processed.compressedFile })} />
                            <OptimizedFileUpload label="Udyam Registration with LT Agreement**" required accept=".pdf,image/*" onFileChange={(processed) => setNewServiceConnectionIndustrialForm({ ...newServiceConnectionIndustrialForm, udyamLtAgreement: processed.compressedFile })} />

                            <div style={{ marginTop: '8px', padding: '12px', border: '1px dashed var(--glass-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                              <div>* In Case Death Required Death Certificate and Legal Heir Certificate (NOC is Required)</div>
                              <div>** LT Agrement Form available in our portal kindly download and take print ount in Rs 20 document paper</div>
                            </div>

                            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.08)', fontSize: '13px', color: 'var(--text-muted)' }}>
                              Service charge: Rs {getSubmissionChargeAmount({ serviceName: 'EB Service - New Service Connection Industrial' }).toFixed(2)}
                            </div>

                            <button className="btn-primary" style={{ marginTop: '24px', width: '100%' }} onClick={() => {
                              if (!newServiceConnectionIndustrialForm.nearestEbServiceNo || !newServiceConnectionIndustrialForm.mobileNo || !newServiceConnectionIndustrialForm.documents || !newServiceConnectionIndustrialForm.udyamLtAgreement || !newServiceConnectionIndustrialForm.photo || !newServiceConnectionIndustrialForm.signature) {
                                return alert('Please fill all mandatory fields and upload required documents!')
                              }
                              if (newServiceConnectionIndustrialForm.nearestEbServiceNo.length !== 12) return alert('Nearest EB Service No must be exactly 12 digits')
                              if (newServiceConnectionIndustrialForm.mobileNo.length !== 10) return alert('Mobile No must be exactly 10 digits')

                              const serviceFee = 0
                              if (currentUser.walletBalance < serviceFee) return alert('Insufficient wallet balance! Please add money to your wallet.')

                              const formNo = 'NSCI' + Math.random().toString(36).substring(2, 7).toUpperCase()
                              const newTransaction = { id: Date.now(), type: 'Debit', amount: serviceFee, date: new Date().toISOString().split('T')[0], status: 'Success', description: `EB Service - New Service Connection Industrial Fee (Form: ${formNo})` }
                              const newSubmission = {
                                id: Math.random().toString(),
                                formNo,
                                userId: currentUser.id,
                                userName: currentUser.name,
                                serviceName: 'EB Service - New Service Connection Industrial',
                                formData: {
                                  ...newServiceConnectionIndustrialForm,
                                  documents: newServiceConnectionIndustrialForm.documents?.name || 'No file attached',
                                  udyamLtAgreement: newServiceConnectionIndustrialForm.udyamLtAgreement?.name || 'No file attached',
                                  photo: newServiceConnectionIndustrialForm.photo?.name || 'No photo attached',
                                  signature: newServiceConnectionIndustrialForm.signature?.name || 'No signature attached'
                                },
                                appliedDate: new Date().toISOString(),
                                status: 'Pending',
                                referenceNo: '',
                                demandPrint: '',
                                serviceUserId: '',
                                servicePassword: ''
                              }

                              const updatedUser = { ...currentUser, walletBalance: currentUser.walletBalance - serviceFee, transactions: [newTransaction, ...(currentUser.transactions || [])] }
                              setCurrentUser(updatedUser)
                              setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u))
                              if (!applyServiceFinanceOnSubmission(newSubmission)) return;
                              setServiceForms([newSubmission, ...serviceForms])
                              alert('Form submitted successfully! Application Number: ' + formNo + '. Service charge deducted: Rs ' + getSubmissionChargeAmount(newSubmission).toFixed(2))
                              setNewServiceConnectionIndustrialForm({
                                nearestEbServiceNo: '',
                                mobileNo: '',
                                tariff: 'Industrial',
                                phase: 'Single',
                                load: 'Single Phase 1 KW (Rs 4886)',
                                photo: null,
                                signature: null,
                                documents: null,
                                udyamLtAgreement: null
                              })
                              setActiveServiceSubTab('new-service-connection')
                            }}>
                              Submit
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : activeServiceSubTab === 'addl-load' ? (
                      <div className="name-transfer-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(67, 56, 202, 0.2)' }}>
                          <div style={{ padding: '12px', background: 'rgba(67, 56, 202, 0.1)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M12 5v14" /><path d="M5 12h14" /><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>Add Load</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Choose additional load form.</p>
                          </div>
                        </div>

                        <button className="back-btn" onClick={() => setActiveServiceSubTab('eb-bill-services')} style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                          Back to EB Service
                        </button>

                        <div className="form-group" style={{ marginTop: '16px' }}>
                          <label className="form-label">Filter Add Load Services</label>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Search by service name..."
                            value={addLoadFilter}
                            onChange={(e) => setAddLoadFilter(e.target.value)}
                          />
                        </div>

                        <div className="services-list" style={{ marginTop: '12px' }}>
                          {[
                            { key: 'temporary-addl-load', name: 'Temporary Add Load', description: 'Apply temporary additional load.', color: '#1d4ed8' },
                            { key: 'domestic-addl-load', name: 'Domestic Add Load', description: 'Apply domestic additional load.', color: '#4338ca' },
                            { key: 'commercial-addl-load', name: 'Commercial Add Load', description: 'Apply commercial additional load.', color: '#7c3aed' },
                            { key: 'industrial-addl-load', name: 'Industrial Add Load', description: 'Apply industrial additional load.', color: '#3730a3' }
                          ]
                            .filter((item) => {
                              const query = addLoadFilter.trim().toLowerCase()
                              if (!query) return true
                              return item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)
                            })
                            .map((item) => (
                              <div key={item.key} className="service-list-item" onClick={() => setActiveServiceSubTab(item.key)}>
                                <div className="service-logo" style={{ background: item.color }}>
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 5v14" /><path d="M5 12h14" /><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                                </div>
                                <div className="service-details">
                                  <h3>{item.name}</h3>
                                  <p>{item.description}</p>
                                </div>
                                <div className="status-indicator">Active</div>
                              </div>
                            ))}

                          {[
                            { key: 'temporary-addl-load', name: 'Temporary Add Load', description: 'Apply temporary additional load.' },
                            { key: 'domestic-addl-load', name: 'Domestic Add Load', description: 'Apply domestic additional load.' },
                            { key: 'commercial-addl-load', name: 'Commercial Add Load', description: 'Apply commercial additional load.' },
                            { key: 'industrial-addl-load', name: 'Industrial Add Load', description: 'Apply industrial additional load.' }
                          ].filter((item) => {
                            const query = addLoadFilter.trim().toLowerCase()
                            if (!query) return true
                            return item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)
                          }).length === 0 && (
                              <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                                No Add Load service matched your filter.
                              </div>
                            )}
                        </div>
                      </div>
                    ) : activeServiceSubTab === 'temporary-addl-load' ? (
                      <div className="name-transfer-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(29, 78, 216, 0.25)' }}>
                          <div style={{ padding: '12px', background: 'rgba(29, 78, 216, 0.12)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M12 5v14" /><path d="M5 12h14" /><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>Temporary Add Load</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Temporary additional load application.</p>
                          </div>
                        </div>

                        <button className="back-btn" onClick={() => setActiveServiceSubTab('addl-load')} style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                          Back to Add Load
                        </button>

                        <div className="service-form-container" style={{ marginTop: '24px' }}>
                          <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div className="form-group">
                              <label className="form-label">EB Service No with Region Code <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={12} className="input-field" placeholder="e.g. 032050014563" value={addlLoadTemporaryForm.ebServiceNo} onChange={(e) => setAddlLoadTemporaryForm({ ...addlLoadTemporaryForm, ebServiceNo: e.target.value.replace(/\D/g, '') })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <OptimizedFileUpload label="Photo (JPEG)" required accept="image/jpeg, image/jpg" onFileChange={(processed) => setAddlLoadTemporaryForm({ ...addlLoadTemporaryForm, photo: processed.compressedFile })} />
                              <OptimizedFileUpload label="Signature (JPEG)" required accept="image/jpeg, image/jpg" onFileChange={(processed) => setAddlLoadTemporaryForm({ ...addlLoadTemporaryForm, signature: processed.compressedFile })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Mobile No <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={10} className="input-field" placeholder="e.g. 9000090000" value={addlLoadTemporaryForm.mobileNo} onChange={(e) => setAddlLoadTemporaryForm({ ...addlLoadTemporaryForm, mobileNo: normalizePhoneInput(e.target.value) })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Tariff</label>
                              <input className="input-field" value={addlLoadTemporaryForm.tariff} readOnly />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Phase <span style={{ color: '#ef4444' }}>*</span></label>
                              <select className="input-field" value={addlLoadTemporaryForm.phase} onChange={(e) => setAddlLoadTemporaryForm({ ...addlLoadTemporaryForm, phase: e.target.value })}>
                                <option value="Single">Single</option>
                                <option value="Three">Three</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Required Additional Load <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" className="input-field" placeholder="Enter required additional load" value={addlLoadTemporaryForm.requiredAdditionalLoad} onChange={(e) => setAddlLoadTemporaryForm({ ...addlLoadTemporaryForm, requiredAdditionalLoad: e.target.value })} />
                            </div>
                            <OptimizedFileUpload label="Documents* (Resolution 100 or Size 3 MB)" required accept=".pdf,image/*" onFileChange={(processed) => setAddlLoadTemporaryForm({ ...addlLoadTemporaryForm, documents: processed.compressedFile })} />

                            <div style={{ marginTop: '8px', padding: '12px', border: '1px dashed var(--glass-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                              <div>* In Case Death Required Death Certificate and Legal Heir Certificate (NOC is Required)</div>
                            </div>

                            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.08)', fontSize: '13px', color: 'var(--text-muted)' }}>
                              Service charge: Rs {getSubmissionChargeAmount({ serviceName: 'EB Service - Temporary Add Load' }).toFixed(2)}
                            </div>

                            <button className="btn-primary" style={{ marginTop: '24px', width: '100%' }} onClick={() => {
                              if (!addlLoadTemporaryForm.ebServiceNo || !addlLoadTemporaryForm.mobileNo || !addlLoadTemporaryForm.requiredAdditionalLoad.trim() || !addlLoadTemporaryForm.documents || !addlLoadTemporaryForm.photo || !addlLoadTemporaryForm.signature) {
                                return alert('Please fill all mandatory fields and upload required documents!')
                              }
                              if (addlLoadTemporaryForm.ebServiceNo.length !== 12) return alert('EB Service No must be exactly 12 digits')
                              if (addlLoadTemporaryForm.mobileNo.length !== 10) return alert('Mobile No must be exactly 10 digits')

                              const serviceFee = 0
                              if (currentUser.walletBalance < serviceFee) return alert('Insufficient wallet balance! Please add money to your wallet.')

                              const formNo = 'ADLT' + Math.random().toString(36).substring(2, 8).toUpperCase()
                              const newTransaction = { id: Date.now(), type: 'Debit', amount: serviceFee, date: new Date().toISOString().split('T')[0], status: 'Success', description: `EB Service - Temporary Add Load Fee (Form: ${formNo})` }
                              const newSubmission = {
                                id: Math.random().toString(),
                                formNo,
                                userId: currentUser.id,
                                userName: currentUser.name,
                                serviceName: 'EB Service - Temporary Add Load',
                                formData: {
                                  ...addlLoadTemporaryForm,
                                  documents: addlLoadTemporaryForm.documents?.name || 'No file attached',
                                  photo: addlLoadTemporaryForm.photo?.name || 'No photo attached',
                                  signature: addlLoadTemporaryForm.signature?.name || 'No signature attached'
                                },
                                appliedDate: new Date().toISOString(),
                                status: 'Pending',
                                referenceNo: '',
                                demandPrint: '',
                                serviceUserId: '',
                                servicePassword: ''
                              }

                              const updatedUser = { ...currentUser, walletBalance: currentUser.walletBalance - serviceFee, transactions: [newTransaction, ...(currentUser.transactions || [])] }
                              setCurrentUser(updatedUser)
                              setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u))
                              if (!applyServiceFinanceOnSubmission(newSubmission)) return;
                              setServiceForms([newSubmission, ...serviceForms])
                              alert('Form submitted successfully! Application Number: ' + formNo + '. Service charge deducted: Rs ' + getSubmissionChargeAmount(newSubmission).toFixed(2))
                              setAddlLoadTemporaryForm({
                                ebServiceNo: '',
                                mobileNo: '',
                                tariff: 'Temporary',
                                phase: 'Single',
                                requiredAdditionalLoad: '',
                                photo: null,
                                signature: null,
                                documents: null
                              })
                              setActiveServiceSubTab('addl-load')
                            }}>
                              Submit
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : activeServiceSubTab === 'domestic-addl-load' ? (
                      <div className="name-transfer-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(67, 56, 202, 0.2)' }}>
                          <div style={{ padding: '12px', background: 'rgba(67, 56, 202, 0.1)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M12 5v14" /><path d="M5 12h14" /><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>Domestic Add Load</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Domestic additional load application.</p>
                          </div>
                        </div>

                        <button className="back-btn" onClick={() => setActiveServiceSubTab('addl-load')} style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                          Back to Add Load
                        </button>

                        <div className="service-form-container" style={{ marginTop: '24px' }}>
                          <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div className="form-group">
                              <label className="form-label">EB Service No with Region Code <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={12} className="input-field" placeholder="e.g. 032050014563" value={addlLoadDomesticForm.ebServiceNo} onChange={(e) => setAddlLoadDomesticForm({ ...addlLoadDomesticForm, ebServiceNo: e.target.value.replace(/\D/g, '') })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <OptimizedFileUpload label="Photo (JPEG)" required accept="image/jpeg, image/jpg" onFileChange={(processed) => setAddlLoadDomesticForm({ ...addlLoadDomesticForm, photo: processed.compressedFile })} />
                              <OptimizedFileUpload label="Signature (JPEG)" required accept="image/jpeg, image/jpg" onFileChange={(processed) => setAddlLoadDomesticForm({ ...addlLoadDomesticForm, signature: processed.compressedFile })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Mobile No <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={10} className="input-field" placeholder="e.g. 9000090000" value={addlLoadDomesticForm.mobileNo} onChange={(e) => setAddlLoadDomesticForm({ ...addlLoadDomesticForm, mobileNo: normalizePhoneInput(e.target.value) })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Tariff</label>
                              <input className="input-field" value={addlLoadDomesticForm.tariff} readOnly />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Phase <span style={{ color: '#ef4444' }}>*</span></label>
                              <select className="input-field" value={addlLoadDomesticForm.phase} onChange={(e) => setAddlLoadDomesticForm({ ...addlLoadDomesticForm, phase: e.target.value })}>
                                <option value="Single">Single</option>
                                <option value="Three">Three</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Required Additional Load <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" className="input-field" placeholder="Enter required additional load" value={addlLoadDomesticForm.requiredAdditionalLoad} onChange={(e) => setAddlLoadDomesticForm({ ...addlLoadDomesticForm, requiredAdditionalLoad: e.target.value })} />
                            </div>
                            <OptimizedFileUpload label="Documents* (Or) Recent Property Tax" required accept=".pdf,image/*" onFileChange={(processed) => setAddlLoadDomesticForm({ ...addlLoadDomesticForm, documents: processed.compressedFile })} />

                            <div style={{ marginTop: '8px', padding: '12px', border: '1px dashed var(--glass-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                              <div>* In Case Death Required Death Certificate and Legal Heir Certificate (NOC is Required)</div>
                              <div>** Aadhar OTP is mandatory for Domestic Service</div>
                            </div>

                            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.08)', fontSize: '13px', color: 'var(--text-muted)' }}>
                              Service charge: Rs {getSubmissionChargeAmount({ serviceName: 'EB Service - Domestic Add Load' }).toFixed(2)}
                            </div>

                            <button className="btn-primary" style={{ marginTop: '24px', width: '100%' }} onClick={() => {
                              if (!addlLoadDomesticForm.ebServiceNo || !addlLoadDomesticForm.mobileNo || !addlLoadDomesticForm.requiredAdditionalLoad.trim() || !addlLoadDomesticForm.documents || !addlLoadDomesticForm.photo || !addlLoadDomesticForm.signature) {
                                return alert('Please fill all mandatory fields and upload required documents!')
                              }
                              if (addlLoadDomesticForm.ebServiceNo.length !== 12) return alert('EB Service No must be exactly 12 digits')
                              if (addlLoadDomesticForm.mobileNo.length !== 10) return alert('Mobile No must be exactly 10 digits')

                              const serviceFee = 0
                              if (currentUser.walletBalance < serviceFee) return alert('Insufficient wallet balance! Please add money to your wallet.')

                              const formNo = 'ADL' + Math.random().toString(36).substring(2, 8).toUpperCase()
                              const newTransaction = { id: Date.now(), type: 'Debit', amount: serviceFee, date: new Date().toISOString().split('T')[0], status: 'Success', description: `EB Service - Domestic Add Load Fee (Form: ${formNo})` }
                              const newSubmission = {
                                id: Math.random().toString(),
                                formNo,
                                userId: currentUser.id,
                                userName: currentUser.name,
                                serviceName: 'EB Service - Domestic Add Load',
                                formData: {
                                  ...addlLoadDomesticForm,
                                  documents: addlLoadDomesticForm.documents?.name || 'No file attached',
                                  photo: addlLoadDomesticForm.photo?.name || 'No photo attached',
                                  signature: addlLoadDomesticForm.signature?.name || 'No signature attached'
                                },
                                appliedDate: new Date().toISOString(),
                                status: 'Pending',
                                referenceNo: '',
                                demandPrint: '',
                                serviceUserId: '',
                                servicePassword: ''
                              }

                              const updatedUser = { ...currentUser, walletBalance: currentUser.walletBalance - serviceFee, transactions: [newTransaction, ...(currentUser.transactions || [])] }
                              setCurrentUser(updatedUser)
                              setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u))
                              if (!applyServiceFinanceOnSubmission(newSubmission)) return;
                              setServiceForms([newSubmission, ...serviceForms])
                              alert('Form submitted successfully! Application Number: ' + formNo + '. Service charge deducted: Rs ' + getSubmissionChargeAmount(newSubmission).toFixed(2))
                              setAddlLoadDomesticForm({
                                ebServiceNo: '',
                                mobileNo: '',
                                tariff: 'Domestic',
                                phase: 'Single',
                                requiredAdditionalLoad: '',
                                photo: null,
                                signature: null,
                                documents: null
                              })
                              setActiveServiceSubTab('addl-load')
                            }}>
                              Submit
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : activeServiceSubTab === 'commercial-addl-load' ? (
                      <div className="name-transfer-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(124, 58, 237, 0.25)' }}>
                          <div style={{ padding: '12px', background: 'rgba(124, 58, 237, 0.12)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M12 5v14" /><path d="M5 12h14" /><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>Commercial Add Load</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Commercial additional load application.</p>
                          </div>
                        </div>

                        <button className="back-btn" onClick={() => setActiveServiceSubTab('addl-load')} style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                          Back to Add Load
                        </button>

                        <div className="service-form-container" style={{ marginTop: '24px' }}>
                          <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div className="form-group">
                              <label className="form-label">EB Service No with Region Code <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={12} className="input-field" placeholder="e.g. 032050014563" value={addlLoadCommercialForm.ebServiceNo} onChange={(e) => setAddlLoadCommercialForm({ ...addlLoadCommercialForm, ebServiceNo: e.target.value.replace(/\D/g, '') })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <OptimizedFileUpload label="Photo (JPEG)" required accept="image/jpeg, image/jpg" onFileChange={(processed) => setAddlLoadCommercialForm({ ...addlLoadCommercialForm, photo: processed.compressedFile })} />
                              <OptimizedFileUpload label="Signature (JPEG)" required accept="image/jpeg, image/jpg" onFileChange={(processed) => setAddlLoadCommercialForm({ ...addlLoadCommercialForm, signature: processed.compressedFile })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Mobile No <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={10} className="input-field" placeholder="e.g. 9000090000" value={addlLoadCommercialForm.mobileNo} onChange={(e) => setAddlLoadCommercialForm({ ...addlLoadCommercialForm, mobileNo: normalizePhoneInput(e.target.value) })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Tariff</label>
                              <input className="input-field" value={addlLoadCommercialForm.tariff} readOnly />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Phase <span style={{ color: '#ef4444' }}>*</span></label>
                              <select className="input-field" value={addlLoadCommercialForm.phase} onChange={(e) => setAddlLoadCommercialForm({ ...addlLoadCommercialForm, phase: e.target.value })}>
                                <option value="Single">Single</option>
                                <option value="Three">Three</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Required Additional Load <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" className="input-field" placeholder="Enter required additional load" value={addlLoadCommercialForm.requiredAdditionalLoad} onChange={(e) => setAddlLoadCommercialForm({ ...addlLoadCommercialForm, requiredAdditionalLoad: e.target.value })} />
                            </div>
                            <OptimizedFileUpload label="Documents* (Or) Recent Property Tax (Resolution 100 or Size 3 MB)" required accept=".pdf,image/*" onFileChange={(processed) => setAddlLoadCommercialForm({ ...addlLoadCommercialForm, documents: processed.compressedFile })} />
                            <OptimizedFileUpload label="Completion Certificate (Resolution 100 or Size 3 MB)" required accept=".pdf,image/*" onFileChange={(processed) => setAddlLoadCommercialForm({ ...addlLoadCommercialForm, completionCertificate: processed.compressedFile })} />

                            <div style={{ marginTop: '8px', padding: '12px', border: '1px dashed var(--glass-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                              <div>* In Case Death Required Death Certificate and Legal Heir Certificate (NOC is Required)</div>
                            </div>

                            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.08)', fontSize: '13px', color: 'var(--text-muted)' }}>
                              Service charge: Rs {getSubmissionChargeAmount({ serviceName: 'EB Service - Commercial Add Load' }).toFixed(2)}
                            </div>

                            <button className="btn-primary" style={{ marginTop: '24px', width: '100%' }} onClick={() => {
                              if (!addlLoadCommercialForm.ebServiceNo || !addlLoadCommercialForm.mobileNo || !addlLoadCommercialForm.requiredAdditionalLoad.trim() || !addlLoadCommercialForm.documents || !addlLoadCommercialForm.completionCertificate || !addlLoadCommercialForm.photo || !addlLoadCommercialForm.signature) {
                                return alert('Please fill all mandatory fields and upload required documents!')
                              }
                              if (addlLoadCommercialForm.ebServiceNo.length !== 12) return alert('EB Service No must be exactly 12 digits')
                              if (addlLoadCommercialForm.mobileNo.length !== 10) return alert('Mobile No must be exactly 10 digits')

                              const serviceFee = 0
                              if (currentUser.walletBalance < serviceFee) return alert('Insufficient wallet balance! Please add money to your wallet.')

                              const formNo = 'ADLC' + Math.random().toString(36).substring(2, 8).toUpperCase()
                              const newTransaction = { id: Date.now(), type: 'Debit', amount: serviceFee, date: new Date().toISOString().split('T')[0], status: 'Success', description: `EB Service - Commercial Add Load Fee (Form: ${formNo})` }
                              const newSubmission = {
                                id: Math.random().toString(),
                                formNo,
                                userId: currentUser.id,
                                userName: currentUser.name,
                                serviceName: 'EB Service - Commercial Add Load',
                                formData: {
                                  ...addlLoadCommercialForm,
                                  documents: addlLoadCommercialForm.documents?.name || 'No file attached',
                                  completionCertificate: addlLoadCommercialForm.completionCertificate?.name || 'No file attached',
                                  photo: addlLoadCommercialForm.photo?.name || 'No photo attached',
                                  signature: addlLoadCommercialForm.signature?.name || 'No signature attached'
                                },
                                appliedDate: new Date().toISOString(),
                                status: 'Pending',
                                referenceNo: '',
                                demandPrint: '',
                                serviceUserId: '',
                                servicePassword: ''
                              }

                              const updatedUser = { ...currentUser, walletBalance: currentUser.walletBalance - serviceFee, transactions: [newTransaction, ...(currentUser.transactions || [])] }
                              setCurrentUser(updatedUser)
                              setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u))
                              if (!applyServiceFinanceOnSubmission(newSubmission)) return;
                              setServiceForms([newSubmission, ...serviceForms])
                              alert('Form submitted successfully! Application Number: ' + formNo + '. Service charge deducted: Rs ' + getSubmissionChargeAmount(newSubmission).toFixed(2))
                              setAddlLoadCommercialForm({
                                ebServiceNo: '',
                                mobileNo: '',
                                tariff: 'Commercial',
                                phase: 'Single',
                                requiredAdditionalLoad: '',
                                photo: null,
                                signature: null,
                                documents: null,
                                completionCertificate: null
                              })
                              setActiveServiceSubTab('addl-load')
                            }}>
                              Submit
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : activeServiceSubTab === 'industrial-addl-load' ? (
                      <div className="name-transfer-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(55, 48, 163, 0.2)' }}>
                          <div style={{ padding: '12px', background: 'rgba(55, 48, 163, 0.1)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M12 5v14" /><path d="M5 12h14" /><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>Industrial Add Load</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Industrial additional load application.</p>
                          </div>
                        </div>

                        <button className="back-btn" onClick={() => setActiveServiceSubTab('addl-load')} style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                          Back to Add Load
                        </button>

                        <div className="service-form-container" style={{ marginTop: '24px' }}>
                          <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div className="form-group">
                              <label className="form-label">EB Service No with Region Code <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={12} className="input-field" placeholder="e.g. 032050014563" value={addlLoadIndustrialForm.ebServiceNo} onChange={(e) => setAddlLoadIndustrialForm({ ...addlLoadIndustrialForm, ebServiceNo: e.target.value.replace(/\D/g, '') })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <OptimizedFileUpload label="Photo (JPEG)" required accept="image/jpeg, image/jpg" onFileChange={(processed) => setAddlLoadIndustrialForm({ ...addlLoadIndustrialForm, photo: processed.compressedFile })} />
                              <OptimizedFileUpload label="Signature (JPEG)" required accept="image/jpeg, image/jpg" onFileChange={(processed) => setAddlLoadIndustrialForm({ ...addlLoadIndustrialForm, signature: processed.compressedFile })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Mobile No <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={10} className="input-field" placeholder="e.g. 9000090000" value={addlLoadIndustrialForm.mobileNo} onChange={(e) => setAddlLoadIndustrialForm({ ...addlLoadIndustrialForm, mobileNo: normalizePhoneInput(e.target.value) })} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Tariff</label>
                              <input className="input-field" value={addlLoadIndustrialForm.tariff} readOnly />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Phase <span style={{ color: '#ef4444' }}>*</span></label>
                              <select className="input-field" value={addlLoadIndustrialForm.phase} onChange={(e) => setAddlLoadIndustrialForm({ ...addlLoadIndustrialForm, phase: e.target.value })}>
                                <option value="Single">Single</option>
                                <option value="Three">Three</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Required Additional Load <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" className="input-field" placeholder="Enter required additional load" value={addlLoadIndustrialForm.requiredAdditionalLoad} onChange={(e) => setAddlLoadIndustrialForm({ ...addlLoadIndustrialForm, requiredAdditionalLoad: e.target.value })} />
                            </div>
                            <OptimizedFileUpload label="Documents* (Or) Recent Property Tax" required accept=".pdf,image/*" onFileChange={(processed) => setAddlLoadIndustrialForm({ ...addlLoadIndustrialForm, documents: processed.compressedFile })} />
                            <OptimizedFileUpload label="Udyam Registration with LT Agreement**" required accept=".pdf,image/*" onFileChange={(processed) => setAddlLoadIndustrialForm({ ...addlLoadIndustrialForm, udyamLtAgreement: processed.compressedFile })} />

                            <div style={{ marginTop: '8px', padding: '12px', border: '1px dashed var(--glass-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                              <div>* In Case Death Required Death Certificate and Legal Heir Certificate (NOC is Required)</div>
                              <div>** LT Agrement Form available in our portal kindly download and take print ount in Rs 20 Document Paper</div>
                            </div>

                            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.08)', fontSize: '13px', color: 'var(--text-muted)' }}>
                              Service charge: Rs {getSubmissionChargeAmount({ serviceName: 'EB Service - Industrial Add Load' }).toFixed(2)}
                            </div>

                            <button className="btn-primary" style={{ marginTop: '24px', width: '100%' }} onClick={() => {
                              if (!addlLoadIndustrialForm.ebServiceNo || !addlLoadIndustrialForm.mobileNo || !addlLoadIndustrialForm.requiredAdditionalLoad.trim() || !addlLoadIndustrialForm.documents || !addlLoadIndustrialForm.udyamLtAgreement || !addlLoadIndustrialForm.photo || !addlLoadIndustrialForm.signature) {
                                return alert('Please fill all mandatory fields and upload required documents!')
                              }
                              if (addlLoadIndustrialForm.ebServiceNo.length !== 12) return alert('EB Service No must be exactly 12 digits')
                              if (addlLoadIndustrialForm.mobileNo.length !== 10) return alert('Mobile No must be exactly 10 digits')

                              const serviceFee = 0
                              if (currentUser.walletBalance < serviceFee) return alert('Insufficient wallet balance! Please add money to your wallet.')

                              const formNo = 'ADLI' + Math.random().toString(36).substring(2, 8).toUpperCase()
                              const newTransaction = { id: Date.now(), type: 'Debit', amount: serviceFee, date: new Date().toISOString().split('T')[0], status: 'Success', description: `EB Service - Industrial Add Load Fee (Form: ${formNo})` }
                              const newSubmission = {
                                id: Math.random().toString(),
                                formNo,
                                userId: currentUser.id,
                                userName: currentUser.name,
                                serviceName: 'EB Service - Industrial Add Load',
                                formData: {
                                  ...addlLoadIndustrialForm,
                                  documents: addlLoadIndustrialForm.documents?.name || 'No file attached',
                                  udyamLtAgreement: addlLoadIndustrialForm.udyamLtAgreement?.name || 'No file attached',
                                  photo: addlLoadIndustrialForm.photo?.name || 'No photo attached',
                                  signature: addlLoadIndustrialForm.signature?.name || 'No signature attached'
                                },
                                appliedDate: new Date().toISOString(),
                                status: 'Pending',
                                referenceNo: '',
                                demandPrint: '',
                                serviceUserId: '',
                                servicePassword: ''
                              }

                              const updatedUser = { ...currentUser, walletBalance: currentUser.walletBalance - serviceFee, transactions: [newTransaction, ...(currentUser.transactions || [])] }
                              setCurrentUser(updatedUser)
                              setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u))
                              if (!applyServiceFinanceOnSubmission(newSubmission)) return;
                              setServiceForms([newSubmission, ...serviceForms])
                              alert('Form submitted successfully! Application Number: ' + formNo + '. Service charge deducted: Rs ' + getSubmissionChargeAmount(newSubmission).toFixed(2))
                              setAddlLoadIndustrialForm({
                                ebServiceNo: '',
                                mobileNo: '',
                                tariff: 'Industrial',
                                phase: 'Single',
                                requiredAdditionalLoad: '',
                                photo: null,
                                signature: null,
                                documents: null,
                                udyamLtAgreement: null
                              })
                              setActiveServiceSubTab('addl-load')
                            }}>
                              Submit
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : activeServiceSubTab === 'tariff-change' ? (
                      <div className="name-transfer-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(99, 102, 241, 0.25)' }}>
                          <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.12)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>EB Service - Tariff Change</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Submit request to change tariff category.</p>
                          </div>
                        </div>

                        <div className="service-form-container" style={{ marginTop: '24px' }}>
                          <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div className="form-group">
                              <label className="form-label">EB Service No with Region Code <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={12} className="input-field" placeholder="e.g. 032050014563" value={tariffChangeForm.ebServiceNo} onChange={(e) => setTariffChangeForm({ ...tariffChangeForm, ebServiceNo: e.target.value.replace(/\D/g, '') })} />
                              {tariffChangeForm.ebServiceNo.length > 0 && tariffChangeForm.ebServiceNo.length < 12 && <span style={{ fontSize: '12px', color: '#ef4444' }}>⚠️ Enter exactly 12 digits (currently {tariffChangeForm.ebServiceNo.length})</span>}
                            </div>

                            <div className="form-group">
                              <label className="form-label">Mobile No <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={10} className="input-field" placeholder="e.g. 9000090000" value={tariffChangeForm.mobileNo} onChange={(e) => setTariffChangeForm({ ...tariffChangeForm, mobileNo: normalizePhoneInput(e.target.value) })} />
                              {tariffChangeForm.mobileNo.length > 0 && tariffChangeForm.mobileNo.length < 10 && <span style={{ fontSize: '12px', color: '#ef4444' }}>⚠️ Enter exactly 10 digits (currently {tariffChangeForm.mobileNo.length})</span>}
                            </div>

                            <div className="form-group">
                              <label className="form-label">Aadhar No <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={12} className="input-field" placeholder="e.g. 123412341234" value={tariffChangeForm.aadharNo} onChange={(e) => setTariffChangeForm({ ...tariffChangeForm, aadharNo: e.target.value.replace(/\D/g, '') })} />
                              {tariffChangeForm.aadharNo.length > 0 && tariffChangeForm.aadharNo.length < 12 && <span style={{ fontSize: '12px', color: '#ef4444' }}>⚠️ Enter exactly 12 digits (currently {tariffChangeForm.aadharNo.length})</span>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div className="form-group">
                                <label className="form-label">Current Tariff <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="input-field" value={tariffChangeForm.currentTariff} onChange={(e) => setTariffChangeForm({ ...tariffChangeForm, currentTariff: e.target.value })}>
                                  <option value="Domestic">Domestic</option>
                                  <option value="Commercial">Commercial</option>
                                  <option value="Industrial">Industrial</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Requested Tariff <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="input-field" value={tariffChangeForm.requestedTariff} onChange={(e) => setTariffChangeForm({ ...tariffChangeForm, requestedTariff: e.target.value })}>
                                  <option value="Domestic">Domestic</option>
                                  <option value="Commercial">Commercial</option>
                                  <option value="Industrial">Industrial</option>
                                </select>
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div className="form-group">
                                <label className="form-label">Phase <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="input-field" value={tariffChangeForm.phase} onChange={(e) => {
                                  const phase = e.target.value;
                                  setTariffChangeForm({
                                    ...tariffChangeForm,
                                    phase,
                                    load: phase === 'Single' ? 'Single Phase 2 KW (Rs 5086)' : 'Three Phase 3 KW (Rs 12436)'
                                  });
                                }}>
                                  <option value="Single">Single</option>
                                  <option value="Three">Three</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Load <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="input-field" value={tariffChangeForm.load} onChange={(e) => setTariffChangeForm({ ...tariffChangeForm, load: e.target.value })}>
                                  {tariffChangeForm.phase === 'Single' ? (
                                    <option value="Single Phase 2 KW (Rs 5086)">Single Phase 2 KW (Rs 5086)</option>
                                  ) : (
                                    <>
                                      <option value="Three Phase 3 KW (Rs 12436)">Three Phase 3 KW (Rs 12436)</option>
                                      <option value="Three Phase 4 KW (Rs.15336)">Three Phase 4 KW (Rs.15336)</option>
                                    </>
                                  )}
                                </select>
                              </div>
                            </div>

                            <div className="form-group">
                              <label className="form-label">Reason for Tariff Change <span style={{ color: '#ef4444' }}>*</span></label>
                              <textarea
                                className="input-field"
                                style={{ minHeight: '88px', resize: 'vertical' }}
                                placeholder="Enter reason"
                                value={tariffChangeForm.reason}
                                onChange={(e) => setTariffChangeForm({ ...tariffChangeForm, reason: e.target.value })}
                              />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <OptimizedFileUpload
                                label="Photo (JPEG)"
                                required
                                accept="image/jpeg, image/jpg"
                                onFileChange={(processed) => setTariffChangeForm({ ...tariffChangeForm, photo: processed.compressedFile })}
                              />
                              <OptimizedFileUpload
                                label="Signature (JPEG)"
                                required
                                accept="image/jpeg, image/jpg"
                                onFileChange={(processed) => setTariffChangeForm({ ...tariffChangeForm, signature: processed.compressedFile })}
                              />
                            </div>

                            <OptimizedFileUpload
                              label="Documents*/**/*** (Resolution 100 or Max Size 3 MB)"
                              required
                              accept=".pdf,image/*"
                              onFileChange={(processed) => setTariffChangeForm({ ...tariffChangeForm, documents: processed.compressedFile })}
                            />

                            <div style={{ marginTop: '8px', padding: '12px', border: '1px dashed var(--glass-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                              <div>* In Case Death Required Death Certificate and Legal Heir Certificate</div>
                              <div>** In Case IIIA1 and IIIB required Udyam Registration with LT Agreement Form available in our portal kindly download and take print out in Rs 20 document paper</div>
                              <div>*** In Case Commercial required Completion Certificate (Service Effected After 2019) or Old Tax Receipt (Service Effected up to 2018)</div>
                            </div>

                            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.08)', fontSize: '13px', color: 'var(--text-muted)' }}>
                              Service charge: Rs {getSubmissionChargeAmount({ serviceName: 'EB Service - Tariff Change' }).toFixed(2)}
                            </div>

                            <button className="btn-primary" style={{ marginTop: '24px', width: '100%' }} onClick={() => {
                              if (!tariffChangeForm.ebServiceNo || !tariffChangeForm.mobileNo || !tariffChangeForm.aadharNo || !tariffChangeForm.reason.trim() || !tariffChangeForm.documents || !tariffChangeForm.photo || !tariffChangeForm.signature) {
                                return alert('Please fill all mandatory fields and upload required documents!');
                              }
                              if (tariffChangeForm.ebServiceNo.length !== 12) {
                                return alert('EB Service No must be exactly 12 digits');
                              }
                              if (tariffChangeForm.mobileNo.length !== 10) {
                                return alert('Mobile No must be exactly 10 digits');
                              }
                              if (tariffChangeForm.aadharNo.length !== 12) {
                                return alert('Aadhar No must be exactly 12 digits');
                              }
                              if (tariffChangeForm.currentTariff === tariffChangeForm.requestedTariff) {
                                return alert('Requested tariff should be different from current tariff');
                              }

                              const serviceFee = 0;
                              if (currentUser.walletBalance < serviceFee) {
                                return alert('Insufficient wallet balance! Please add money to your wallet.');
                              }

                              const formNo = 'TC' + Math.random().toString(36).substring(2, 8).toUpperCase();

                              const newTransaction = {
                                id: Date.now(),
                                type: 'Debit',
                                amount: serviceFee,
                                date: new Date().toISOString().split('T')[0],
                                status: 'Success',
                                description: `EB Service - Tariff Change Fee (Form: ${formNo})`
                              };

                              const newSubmission = {
                                id: Math.random().toString(),
                                formNo,
                                userId: currentUser.id,
                                userName: currentUser.name,
                                serviceName: 'EB Service - Tariff Change',
                                formData: {
                                  ...tariffChangeForm,
                                  documents: tariffChangeForm.documents?.name || 'No file attached',
                                  photo: tariffChangeForm.photo?.name || 'No photo attached',
                                  signature: tariffChangeForm.signature?.name || 'No signature attached'
                                },
                                appliedDate: new Date().toISOString(),
                                status: 'Pending',
                                referenceNo: '',
                                demandPrint: '',
                                serviceUserId: '',
                                servicePassword: ''
                              };

                              const updatedUser = {
                                ...currentUser,
                                walletBalance: currentUser.walletBalance - serviceFee,
                                transactions: [newTransaction, ...(currentUser.transactions || [])]
                              };

                              setCurrentUser(updatedUser);
                              setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
                              if (!applyServiceFinanceOnSubmission(newSubmission)) return;
                              setServiceForms([newSubmission, ...serviceForms]);

                              alert('Form submitted successfully! Application Number: ' + formNo + '. Service charge deducted: Rs ' + getSubmissionChargeAmount(newSubmission).toFixed(2))

                              setTariffChangeForm({
                                ebServiceNo: '',
                                mobileNo: '',
                                aadharNo: '',
                                currentTariff: 'Domestic',
                                requestedTariff: 'Commercial',
                                phase: 'Single',
                                load: 'Single Phase 2 KW (Rs 5086)',
                                reason: '',
                                photo: null,
                                signature: null,
                                documents: null
                              });
                              setActiveServiceSubTab('eb-bill-services');
                            }}>
                              Submit Application
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : activeServiceSubTab === 'load-reduction' ? (
                      <div className="name-transfer-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(79, 70, 229, 0.25)' }}>
                          <div style={{ padding: '12px', background: 'rgba(79, 70, 229, 0.12)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>EB Service - Load Reduction</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Submit request to reduce sanctioned load.</p>
                          </div>
                        </div>

                        <div className="service-form-container" style={{ marginTop: '24px' }}>
                          <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div className="form-group">
                              <label className="form-label">EB Service No with Region Code <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={12} className="input-field" placeholder="e.g. 032050014563" value={loadReductionForm.ebServiceNo} onChange={(e) => setLoadReductionForm({ ...loadReductionForm, ebServiceNo: e.target.value.replace(/\D/g, '') })} />
                              {loadReductionForm.ebServiceNo.length > 0 && loadReductionForm.ebServiceNo.length < 12 && <span style={{ fontSize: '12px', color: '#ef4444' }}>⚠️ Enter exactly 12 digits (currently {loadReductionForm.ebServiceNo.length})</span>}
                            </div>

                            <div className="form-group">
                              <label className="form-label">Mobile No <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={10} className="input-field" placeholder="e.g. 9000090000" value={loadReductionForm.mobileNo} onChange={(e) => setLoadReductionForm({ ...loadReductionForm, mobileNo: normalizePhoneInput(e.target.value) })} />
                              {loadReductionForm.mobileNo.length > 0 && loadReductionForm.mobileNo.length < 10 && <span style={{ fontSize: '12px', color: '#ef4444' }}>⚠️ Enter exactly 10 digits (currently {loadReductionForm.mobileNo.length})</span>}
                            </div>

                            <div className="form-group">
                              <label className="form-label">Existing Load <span style={{ color: '#ef4444' }}>*</span></label>
                              <select className="input-field" value={loadReductionForm.existingLoad} onChange={(e) => setLoadReductionForm({ ...loadReductionForm, existingLoad: e.target.value })}>
                                <option value="Single Phase 2 KW (Rs 5086)">Single Phase 2 KW (Rs 5086)</option>
                                <option value="Three Phase 3 KW (Rs 12436)">Three Phase 3 KW (Rs 12436)</option>
                                <option value="Three Phase 4 KW (Rs.15336)">Three Phase 4 KW (Rs.15336)</option>
                              </select>
                            </div>

                            <div className="form-group">
                              <label className="form-label">To Be Reduced Load <span style={{ color: '#ef4444' }}>*</span></label>
                              <select className="input-field" value={loadReductionForm.reducedLoad} onChange={(e) => setLoadReductionForm({ ...loadReductionForm, reducedLoad: e.target.value })}>
                                <option value="Single Phase 1 KW">Single Phase 1 KW</option>
                                <option value="Single Phase 1.5 KW">Single Phase 1.5 KW</option>
                                <option value="Three Phase 2 KW">Three Phase 2 KW</option>
                                <option value="Three Phase 3 KW (Rs 12436)">Three Phase 3 KW (Rs 12436)</option>
                              </select>
                            </div>

                            <OptimizedFileUpload
                              label="Documents (Photo.jpeg / PDF, Max Size 3 MB)"
                              required
                              accept=".pdf,image/jpeg,image/jpg,image/png"
                              onFileChange={(processed) => setLoadReductionForm({ ...loadReductionForm, documents: processed.compressedFile })}
                            />

                            <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                              On submit, admin will process and update Reference No, Demand Print, User ID, and Password. Demand Print will be downloadable in user Service Reports after completion.
                            </p>

                            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.08)', fontSize: '13px', color: 'var(--text-muted)' }}>
                              Service charge: Rs {getSubmissionChargeAmount({ serviceName: 'EB Service - Load Reduction' }).toFixed(2)}
                            </div>

                            <button className="btn-primary" style={{ marginTop: '24px', width: '100%' }} onClick={() => {
                              if (!loadReductionForm.ebServiceNo || !loadReductionForm.mobileNo || !loadReductionForm.existingLoad || !loadReductionForm.reducedLoad || !loadReductionForm.documents) {
                                return alert('Please fill all mandatory fields and upload required documents!');
                              }
                              if (loadReductionForm.ebServiceNo.length !== 12) {
                                return alert('EB Service No must be exactly 12 digits');
                              }
                              if (loadReductionForm.mobileNo.length !== 10) {
                                return alert('Mobile No must be exactly 10 digits');
                              }
                              if (loadReductionForm.existingLoad === loadReductionForm.reducedLoad) {
                                return alert('Requested reduced load should be different from current load');
                              }

                              const serviceFee = 0;
                              if (currentUser.walletBalance < serviceFee) {
                                return alert('Insufficient wallet balance! Please add money to your wallet.');
                              }

                              const formNo = 'LR' + Math.random().toString(36).substring(2, 8).toUpperCase();

                              const newTransaction = {
                                id: Date.now(),
                                type: 'Debit',
                                amount: serviceFee,
                                date: new Date().toISOString().split('T')[0],
                                status: 'Success',
                                description: `EB Service - Load Reduction Fee (Form: ${formNo})`
                              };

                              const newSubmission = {
                                id: Math.random().toString(),
                                formNo,
                                userId: currentUser.id,
                                userName: currentUser.name,
                                serviceName: 'EB Service - Load Reduction',
                                formData: {
                                  ...loadReductionForm,
                                  documents: loadReductionForm.documents?.name || 'No file attached'
                                },
                                appliedDate: new Date().toISOString(),
                                status: 'Pending',
                                referenceNo: '',
                                demandPrint: '',
                                serviceUserId: '',
                                servicePassword: ''
                              };

                              const updatedUser = {
                                ...currentUser,
                                walletBalance: currentUser.walletBalance - serviceFee,
                                transactions: [newTransaction, ...(currentUser.transactions || [])]
                              };

                              setCurrentUser(updatedUser);
                              setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
                              if (!applyServiceFinanceOnSubmission(newSubmission)) return;
                              setServiceForms([newSubmission, ...serviceForms]);

                              alert('Form submitted successfully! Application Number: ' + formNo + '. Service charge deducted: Rs ' + getSubmissionChargeAmount(newSubmission).toFixed(2))

                              setLoadReductionForm({
                                ebServiceNo: '',
                                mobileNo: '',
                                existingLoad: 'Single Phase 2 KW (Rs 5086)',
                                reducedLoad: 'Single Phase 1 KW',
                                documents: null
                              });
                              setActiveServiceSubTab('eb-bill-services');
                            }}>
                              Submit Application
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : activeServiceSubTab === 'name-transfer' ? (
                      <div className="name-transfer-view">
                        <div className="tn-police-header" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                          <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                          </div>
                          <div>
                            <h3 style={{color: 'var(--text-main)', margin: 0 }}>EB Service - Name Transfer</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0' }}>Apply for EB / Property Name Transfer under EB Service</p>
                          </div>
                        </div>

                        <div className="service-form-container" style={{ marginTop: '24px' }}>
                          <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div className="form-group">
                              <label className="form-label">EB Service No with Region Code <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={12} className="input-field" placeholder="e.g. 032050014563" value={nameTransferForm.ebServiceNo} onChange={(e) => setNameTransferForm({ ...nameTransferForm, ebServiceNo: e.target.value.replace(/\D/g, '') })} />
                              {nameTransferForm.ebServiceNo.length > 0 && nameTransferForm.ebServiceNo.length < 12 && <span style={{ fontSize: '12px', color: '#ef4444' }}>⚠️ Enter exactly 12 digits (currently {nameTransferForm.ebServiceNo.length})</span>}
                            </div>
                            <div className="form-group">
                              <label className="form-label">Mobile No <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={10} className="input-field" placeholder="e.g. 9000090000" value={nameTransferForm.mobileNo} onChange={(e) => setNameTransferForm({ ...nameTransferForm, mobileNo: normalizePhoneInput(e.target.value) })} />
                              {nameTransferForm.mobileNo.length > 0 && nameTransferForm.mobileNo.length < 10 && <span style={{ fontSize: '12px', color: '#ef4444' }}>⚠️ Enter exactly 10 digits (currently {nameTransferForm.mobileNo.length})</span>}
                            </div>
                            <div className="form-group">
                              <label className="form-label">Aadhar No <span style={{ color: '#ef4444' }}>*</span></label>
                              <input type="text" maxLength={12} className="input-field" placeholder="e.g. 123412341234" value={nameTransferForm.aadharNo} onChange={(e) => setNameTransferForm({ ...nameTransferForm, aadharNo: e.target.value.replace(/\D/g, '') })} />
                              {nameTransferForm.aadharNo.length > 0 && nameTransferForm.aadharNo.length < 12 && <span style={{ fontSize: '12px', color: '#ef4444' }}>⚠️ Enter exactly 12 digits (currently {nameTransferForm.aadharNo.length})</span>}
                            </div>
                            <OptimizedFileUpload
                              label="Documents (Or) Recent Property Tax"
                              required
                              accept=".pdf,image/*"
                              onFileChange={(processed) => setNameTransferForm({ ...nameTransferForm, documents: processed.compressedFile })}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <OptimizedFileUpload
                                label="Photo"
                                required
                                accept="image/jpeg, image/jpg"
                                onFileChange={(processed) => setNameTransferForm({ ...nameTransferForm, photo: processed.compressedFile })}
                              />
                              <OptimizedFileUpload
                                label="Signature"
                                required
                                accept="image/jpeg, image/jpg"
                                onFileChange={(processed) => setNameTransferForm({ ...nameTransferForm, signature: processed.compressedFile })}
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label">Sub Category Tariff <span style={{ color: '#ef4444' }}>*</span></label>
                              <select className="input-field" value={nameTransferForm.subCategory} onChange={(e) => setNameTransferForm({ ...nameTransferForm, subCategory: e.target.value })}>
                                <option value="Domestic">Domestic</option>
                                <option value="Commercial">Commercial</option>
                                <option value="Industrial">Industrial</option>
                              </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div className="form-group">
                                <label className="form-label">Phase <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="input-field" value={nameTransferForm.phase} onChange={(e) => {
                                  const phase = e.target.value;
                                  setNameTransferForm({
                                    ...nameTransferForm,
                                    phase,
                                    load: phase === 'Single' ? 'Single Phase 2 KW (Rs 5086)' : 'Three Phase 3 KW (Rs 12436)'
                                  });
                                }}>
                                  <option value="Single">Single</option>
                                  <option value="Three">Three</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Load <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="input-field" value={nameTransferForm.load} onChange={(e) => setNameTransferForm({ ...nameTransferForm, load: e.target.value })}>
                                  {nameTransferForm.phase === 'Single' ? (
                                    <option value="Single Phase 2 KW (Rs 5086)">Single Phase 2 KW (Rs 5086)</option>
                                  ) : (
                                    <>
                                      <option value="Three Phase 3 KW (Rs 12436)">Three Phase 3 KW (Rs 12436)</option>
                                      <option value="Three Phase 4 KW (Rs.15336)">Three Phase 4 KW (Rs.15336)</option>
                                    </>
                                  )}
                                </select>
                              </div>
                            </div>

                            <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '12px', borderLeft: '3px solid #f59e0b', paddingLeft: '8px' }}>
                              * In Case Death Required Death Certificate and Legal Heir Certificate
                            </p>

                            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.08)', fontSize: '13px', color: 'var(--text-muted)' }}>
                              Service charge: Rs {getSubmissionChargeAmount({ serviceName: 'EB Service - Name Transfer' }).toFixed(2)}
                            </div>

                            <button className="btn-primary" style={{ marginTop: '24px', width: '100%' }} onClick={() => {
                              if (!nameTransferForm.ebServiceNo || !nameTransferForm.mobileNo || !nameTransferForm.aadharNo) {
                                return alert('Please fill all mandatory fields!');
                              }
                              if (nameTransferForm.ebServiceNo.length !== 12) {
                                return alert('EB Service No must be exactly 12 digits');
                              }
                              if (nameTransferForm.mobileNo.length !== 10) {
                                return alert('Mobile No must be exactly 10 digits');
                              }
                              if (nameTransferForm.aadharNo.length !== 12) {
                                return alert('Aadhar No must be exactly 12 digits');
                              }

                              const serviceFee = 0;
                              if (currentUser.walletBalance < serviceFee) {
                                return alert('Insufficient wallet balance! Please add money to your wallet.');
                              }

                              const formNo = 'NT' + Math.random().toString(36).substring(2, 8).toUpperCase();

                              // Create Transaction Record
                              const newTransaction = {
                                id: Date.now(),
                                type: 'Debit',
                                amount: serviceFee,
                                date: new Date().toISOString().split('T')[0],
                                status: 'Success',
                                description: `EB Service - Name Transfer Fee (Form: ${formNo})`
                              };

                              const newSubmission = {
                                id: Math.random().toString(),
                                formNo,
                                userId: currentUser.id,
                                userName: currentUser.name,
                                serviceName: 'EB Service - Name Transfer',
                                formData: {
                                  ...nameTransferForm,
                                  documents: nameTransferForm.documents?.name || 'No file attached',
                                  photo: nameTransferForm.photo?.name || 'No photo attached',
                                  signature: nameTransferForm.signature?.name || 'No signature attached'
                                },
                                appliedDate: new Date().toISOString(),
                                status: 'Pending',
                                referenceNo: '',
                                demandPrint: '',
                                serviceUserId: '',
                                servicePassword: ''
                              };

                              // Update User Data (Balance & Transactions)
                              const updatedUser = {
                                ...currentUser,
                                walletBalance: currentUser.walletBalance - serviceFee,
                                transactions: [newTransaction, ...(currentUser.transactions || [])]
                              };

                              setCurrentUser(updatedUser);
                              setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
                              if (!applyServiceFinanceOnSubmission(newSubmission)) return;
                              setServiceForms([newSubmission, ...serviceForms]);

                              alert('Form submitted successfully! Application Number: ' + formNo + '. Service charge deducted: Rs ' + getSubmissionChargeAmount(newSubmission).toFixed(2))

                              // Reset form
                              setNameTransferForm({
                                ebServiceNo: '', mobileNo: '', aadharNo: '',
                                photo: null, signature: null, subCategory: 'Domestic', phase: 'Single', load: 'Single Phase 2 KW (Rs 5086)', documents: null
                              });
                              setActiveServiceSubTab(null);
                            }}>
                              Submit Application
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : ['resume-normal', 'resume-first-year', 'resume-fresher', 'resume-experienced', 'resume-labour', 'resume-word-to-pdf', 'resume-edit-pdf', 'resume-edit-word-pdf'].includes(String(activeServiceSubTab || '')) ? (
                      <ErrorBoundary>
                        <ResumeServiceModule
                          key={activeServiceSubTab}
                          moduleKey={String(activeServiceSubTab)}
                          serviceFee={getSubmissionChargeAmount({ serviceName: `Resume - ${String(activeServiceSubTab || '').replace('resume-', '').replace(/-/g, ' ')}` })}
                          onBack={() => setActiveServiceSubTab(null)}
                        />
                      </ErrorBoundary>
                    ) : activeServiceCategory === 'bank' && !activeServiceSubTab ? (
                      <div className="services-list">
                        <div className="service-list-item" onClick={() => { setActiveServiceSubTab('cibil-score'); setCibilResult(null); setCibilForm({ firstName: '', lastName: '', mobile: '', pan: '', dob: '', pincode: '', address: '' }); setCibilStep(0); }}>
                          <div className="service-logo" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                          </div>
                          <div className="service-details">
                            <h3>CIBIL Score Check</h3>
                            <p>Instant credit report using Name, Mobile &amp; PAN.</p>
                          </div>
                          <div className="status-indicator">Active</div>
                        </div>
                        {[{ name: 'Loan Status Check', desc: 'Track loan application & EMI details.' }, { name: 'Account Verification', desc: 'Verify bank account via IFSC & number.' }].map((s, i) => (
                          <div key={i} className="service-list-item" style={{ opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' }}>
                            <div className="service-logo" style={{ background: 'var(--glass)' }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                            </div>
                            <div className="service-details"><h3>{s.name}</h3><p>{s.desc}</p></div>
                            <div style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', background: 'var(--glass)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Coming Soon</div>
                          </div>
                        ))}
                      </div>
                    ) : activeServiceSubTab === 'cibil-score' ? (
                      <div className="cibil-services-view">
                        <div className="cibil-header" style={{ marginBottom: '24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div className="cibil-logo-badge" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                            </div>
                            <div>
                              <h3 style={{color: 'var(--text-main)', margin: 0, fontSize: '20px', fontWeight: '700' }}>CIBIL Bureau Services</h3>
                              <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0' }}>SkyTree Solutions · TransUnion CIBIL Authorized Provider</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ textAlign: 'right', marginRight: '12px' }}>
                              <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Wallet Balance</p>
                              <p style={{ fontSize: '15px', color: '#10b981', fontWeight: '700', margin: 0 }}>₹ {(currentUser?.walletBalance || 0).toFixed(2)}</p>
                            </div>
                            <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', height: 'fit-content' }}>SECURE</span>
                          </div>
                        </div>

                        {/* Sub Navigation */}
                        <div className="cibil-sub-nav">
                          <div className={`cibil-nav-item ${activeCibilSubView === 'form' ? 'active' : ''}`} onClick={() => setActiveCibilSubView('form')}>New Report</div>
                          <div className={`cibil-nav-item ${activeCibilSubView === 'history' ? 'active' : ''}`} onClick={() => setActiveCibilSubView('history')}>History</div>
                          {activeCibilSubView === 'report' && <div className="cibil-nav-item active">Current Report</div>}
                        </div>

                        {activeCibilSubView === 'form' && (
                          <div className="glass-card form-inner" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', marginTop: '20px', maxWidth: '800px' }}>
                            <h4 style={{color: 'var(--text-main)', marginBottom: '24px', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ background: 'var(--primary)', width: '4px', height: '18px', borderRadius: '2px' }}></span>
                              Customer Information Form
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                              <div className="form-group">
                                <label className="form-label">First Name (as per PAN)</label>
                                <input type="text" className="input-field" placeholder="First Name" value={cibilForm.firstName} onChange={e => setCibilForm({ ...cibilForm, firstName: e.target.value })} disabled={cibilLoading} />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Last Name (as per PAN)</label>
                                <input type="text" className="input-field" placeholder="Last Name" value={cibilForm.lastName} onChange={e => setCibilForm({ ...cibilForm, lastName: e.target.value })} disabled={cibilLoading} />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Mobile Number</label>
                                <input type="tel" className="input-field" placeholder="10-digit mobile" maxLength={10} value={cibilForm.mobile} onChange={e => setCibilForm({ ...cibilForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} disabled={cibilLoading} />
                              </div>
                              <div className="form-group">
                                <label className="form-label">PAN Number</label>
                                <input type="text" className="input-field" placeholder="ABCDE1234F" maxLength={10} value={cibilForm.pan} onChange={e => setCibilForm({ ...cibilForm, pan: e.target.value.toUpperCase().slice(0, 10) })} style={{ letterSpacing: '2px', fontFamily: 'monospace' }} disabled={cibilLoading} />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Date of Birth</label>
                                <input type="date" className="input-field" value={cibilForm.dob} onChange={e => setCibilForm({ ...cibilForm, dob: e.target.value })} disabled={cibilLoading} />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Pincode</label>
                                <input type="text" className="input-field" placeholder="6-digit pincode" maxLength={6} value={cibilForm.pincode} onChange={e => setCibilForm({ ...cibilForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} disabled={cibilLoading} />
                              </div>
                              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Residential Address</label>
                                <input type="text" className="input-field" placeholder="Full Address" value={cibilForm.address} onChange={e => setCibilForm({ ...cibilForm, address: e.target.value })} disabled={cibilLoading} />
                              </div>
                            </div>

                            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px', padding: '16px', marginTop: '24px' }}>
                              <p style={{ color: 'var(--error-color)', fontSize: '13px', margin: 0, fontWeight: '600' }}>⚠️ Important Note:</p>
                              <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0', lineHeight: '1.5' }}>
                                Just a friendly reminder that once you submit the information to the Bureau, refunds won't be possible.
                                Please double-check all details before proceeding. Service Fee: <strong>₹50.00</strong>.
                              </p>
                            </div>

                            <button className="btn-primary" style={{ marginTop: '24px', width: '100%', height: '50px', fontSize: '16px' }} onClick={handleCibilCheck} disabled={cibilLoading}>
                              {cibilLoading ? (
                                <><div className="cibil-spinner" />Processing Bureau Handshake...</>
                              ) : (
                                <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>Submit to Bureau</>
                              )}
                            </button>
                          </div>
                        )}

                        {activeCibilSubView === 'history' && (
                          <div className="cibil-history-view" style={{ animation: 'fadeIn 0.4s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                              <h3 style={{color: 'var(--text-main)', margin: 0, fontSize: '18px' }}>Credit Report History</h3>
                              <button className="btn-primary" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', padding: '8px 16px', fontSize: '13px' }} onClick={() => setShowCibilFilter(!showCibilFilter)}>
                                {showCibilFilter ? '🔼 Hide Filters' : '🔍 Filter Records'}
                              </button>
                            </div>

                            {showCibilFilter && (
                              <div className="glass-card" style={{ marginBottom: '20px', padding: '20px', background: 'var(--glass)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                                  <div className="form-group">
                                    <label className="form-label">Search (Name/PAN)</label>
                                    <input type="text" className="input-field" placeholder="Search..." value={cibilFilters.search} onChange={e => setCibilFilters({ ...cibilFilters, search: e.target.value })} />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label">From Date</label>
                                    <input type="date" className="input-field" value={cibilFilters.fromDate} onChange={e => setCibilFilters({ ...cibilFilters, fromDate: e.target.value })} />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label">To Date</label>
                                    <input type="date" className="input-field" value={cibilFilters.toDate} onChange={e => setCibilFilters({ ...cibilFilters, toDate: e.target.value })} />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="input-field" value={cibilFilters.status} onChange={e => setCibilFilters({ ...cibilFilters, status: e.target.value })}>
                                      <option value="All">All Statuses</option>
                                      <option value="Completed">Completed</option>
                                      <option value="Cancelled">Cancelled</option>
                                    </select>
                                  </div>
                                  <button className="btn-primary" style={{ marginTop: '28px' }} onClick={() => setCibilFilters({ search: '', fromDate: '', toDate: '', status: 'All' })}>Clear</button>
                                </div>
                              </div>
                            )}

                            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                              <table className="data-table" style={{ margin: 0 }}>
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Application Date</th>
                                    <th>Customer Name</th>
                                    <th>PAN Number</th>
                                    <th>Reference ID</th>
                                    <th>Status</th>
                                    <th>Score</th>
                                    <th>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredCibilHistory.length > 0 ? filteredCibilHistory.map((h, i) => (
                                    <tr key={h.id}>
                                      <td>{i + 1}</td>
                                      <td>{h.reportDate}</td>
                                      <td>{h.personal.fullName}</td>
                                      <td style={{ fontFamily: 'monospace' }}>{h.personal.pan}</td>
                                      <td style={{ color: 'var(--text-muted)' }}>{h.referenceId}</td>
                                      <td><span className={`status-badge ${h.status.toLowerCase()}`}>{h.status}</span></td>
                                      <td><strong style={{ color: h.color }}>{h.score}</strong></td>
                                      <td>
                                        <button className="btn-primary" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={() => { setCibilResult(h); setActiveCibilSubView('report'); }}>View Report</button>
                                      </td>
                                    </tr>
                                  )) : (
                                    <tr>
                                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No credit reports found matching your criteria.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {(activeCibilSubView === 'report' && cibilResult) && (
                          <div className="cibil-detailed-report" style={{ animation: 'fadeIn 0.5s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', gap: '10px' }}>
                              <button className="btn-primary" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }} onClick={() => window.print()}>🖨️ Print Report</button>
                              <button className="btn-primary" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClick={() => setActiveCibilSubView('history')}>Close</button>
                            </div>

                            <div className="report-paper" style={{ background: 'white', color: '#1e293b', borderRadius: '8px', padding: '0', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                              {/* Header */}
                              <div style={{ padding: '30px', borderBottom: '2px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{background: '#404040', color: 'var(--text-main)', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>ST</div>
                                    <h2 style={{margin: 0, color: '#0f172a', fontSize: '22px' }}>SkyTree Solutions <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}>Bureau Connect</span></h2>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <h4 style={{margin: 0, color: '#334155', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '13px' }}>Credit Information Report</h4>
                                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '11px' }}>Bureau Partner: TransUnion CIBIL / Equifax</p>
                                  </div>
                                </div>
                              </div>

                              {/* Main Content Area */}
                              <div style={{ padding: '30px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '40px' }}>
                                  {/* Left: Score & Tables */}
                                  <div>
                                    <h3 style={{borderLeft: '4px solid #404040', paddingLeft: '12px', fontSize: '16px', color: '#0f172a', marginBottom: '20px' }}>PERSONAL INFORMATION</h3>
                                    <table className="cibil-report-table" style={{ color: '#334155' }}>
                                      <thead><tr><th>Name</th><th>Date of Birth</th><th>Gender</th><th>Address</th></tr></thead>
                                      <tbody>
                                        <tr>
                                          <td style={{ fontWeight: 'bold' }}>{cibilResult.personal.fullName}</td>
                                          <td>{cibilResult.personal.dob}</td>
                                          <td>{cibilResult.personal.gender}</td>
                                          <td style={{ fontSize: '11px' }}>{cibilResult.personal.address}, {cibilResult.personal.pincode}</td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    <h3 style={{borderLeft: '4px solid #404040', paddingLeft: '12px', fontSize: '16px', color: '#0f172a', margin: '30px 0 20px' }}>EMPLOYMENT INFORMATION</h3>
                                    <table className="cibil-report-table" style={{ color: '#334155' }}>
                                      <thead><tr><th>Occupation</th><th>Monthly Income</th><th>Net Income</th><th>Occu-Code</th></tr></thead>
                                      <tbody>
                                        <tr>
                                          <td>{cibilResult.personal.occupation}</td>
                                          <td style={{ fontWeight: 'bold' }}>{cibilResult.employment.monthlyIncome}</td>
                                          <td>{cibilResult.employment.netIncome}</td>
                                          <td>{cibilResult.employment.occupationCode}</td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    <h3 style={{borderLeft: '4px solid #404040', paddingLeft: '12px', fontSize: '16px', color: '#0f172a', margin: '30px 0 20px' }}>ACCOUNT SUMMARY</h3>
                                    <table className="cibil-report-table" style={{ color: '#334155' }}>
                                      <thead>
                                        <tr><th>Total Accounts</th><th>Active</th><th>Zero Balance</th><th>Total Balance</th></tr>
                                      </thead>
                                      <tbody>
                                        <tr>
                                          <td>{cibilResult.summary.noOfAccounts}</td>
                                          <td>{cibilResult.summary.noOfActiveAccounts}</td>
                                          <td>{cibilResult.summary.noOfZeroBalanceAccounts || 0}</td>
                                          <td style={{ fontWeight: 'bold', color: '#0f172a' }}>{cibilResult.summary.totalBalanceAmount}</td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                                      <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Most Severe Status (24M)</p>
                                        <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: '700', color: cibilResult.score < 650 ? '#ef4444' : '#10b981' }}>{cibilResult.summary.mostSevereStatusWithIn24Months || 'STANDARD'}</p>
                                      </div>
                                      <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Total Past Due</p>
                                        <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: '700', color: cibilResult.summary.totalPastDue !== '₹ 0' ? '#ef4444' : '#10b981' }}>{cibilResult.summary.totalPastDue}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right: Gauge & Identity */}
                                  <div>
                                    <div style={{background: '#0f172a', padding: '30px', borderRadius: '16px', color: 'var(--text-main)', textAlign: 'center' }}>
                                      <h4 style={{margin: '0 0 20px', fontSize: '12px', letterSpacing: '2px', opacity: 0.7 }}>CREDIT SCORE</h4>
                                      <div className="cibil-gauge-container">
                                        <div className="cibil-semi-circle" style={{
                                          background: `conic-gradient(from 180deg at 50% 50%, #ef4444 0% 10%, #f97316 10% 25%, #f59e0b 25% 40%, #eab308 40% 55%, #84cc16 55% 70%, #22c55e 70% 85%, #16a34a 85% 100%)`,
                                          mask: 'radial-gradient(circle at 50% 50%, transparent 65%, black 66%)'
                                        }}></div>
                                        <div style={{ position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)', fontSize: '32px', fontWeight: '800' }}>{cibilResult.score}</div>
                                      </div>
                                      <p style={{ margin: '15px 0 0', fontSize: '14px', fontWeight: '600', color: cibilResult.color }}>{cibilResult.label} PROFILE</p>
                                      <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                                        <span>300</span><span>900</span>
                                      </div>
                                    </div>

                                    <div style={{ marginTop: '30px' }}>
                                      <h4 style={{fontSize: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', color: '#64748b' }}>IDENTITY VERIFICATION</h4>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>PAN Number</span>
                                        <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: 'bold', fontFamily: 'monospace' }}>{cibilResult.personal.pan}</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>Reference ID</span>
                                        <span style={{ fontSize: '12px', color: '#1e293b' }}>{cibilResult.referenceId}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Bottom: Accounts Grid */}
                                <div style={{ marginTop: '40px' }}>
                                  <h3 style={{borderLeft: '4px solid #404040', paddingLeft: '12px', fontSize: '16px', color: '#0f172a', marginBottom: '20px' }}>LIST OF ACCOUNTS</h3>
                                  <table className="cibil-report-table" style={{ color: '#334155' }}>
                                    <thead>
                                      <tr><th>#</th><th>Institution</th><th>Account Type</th><th>Balance</th><th>Dues</th><th>Status</th><th>Opened</th></tr>
                                    </thead>
                                    <tbody>
                                      {cibilResult.accounts.map((acc: any, idx: number) => (
                                        <tr key={idx}>
                                          <td>{idx + 1}</td>
                                          <td style={{ fontWeight: '600' }}>{acc.institution}</td>
                                          <td>{acc.type}</td>
                                          <td>{acc.balance}</td>
                                          <td style={{ color: acc.pastDues ? '#ef4444' : '#10b981' }}>{acc.pastDues || '₹ 0'}</td>
                                          <td><span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', background: '#f1f5f9' }}>{acc.status}</span></td>
                                          <td>{acc.opened}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* 48 Month Grid */}
                                <div style={{ marginTop: '40px' }}>
                                  <h3 style={{borderLeft: '4px solid #404040', paddingLeft: '12px', fontSize: '16px', color: '#0f172a', marginBottom: '20px' }}>ENQUIRY SUMMARY</h3>
                                  <table className="cibil-report-table" style={{ color: '#334155' }}>
                                    <thead><tr><th>Total Enquiries</th><th>Past 30 Days</th><th>Past 12 Months</th><th>Latest Enquiry</th></tr></thead>
                                    <tbody>
                                      <tr>
                                        <td style={{ fontWeight: 'bold' }}>{cibilResult.enquirySummary.totalEnquiries}</td>
                                        <td style={{ color: cibilResult.enquirySummary.enquiriesPast30Days > 0 ? '#ef4444' : '#334155' }}>{cibilResult.enquirySummary.enquiriesPast30Days}</td>
                                        <td>{cibilResult.enquirySummary.enquiriesPast12Months}</td>
                                        <td>{cibilResult.enquiries[0].date}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>

                                {/* 48 Month Grid */}
                                <div style={{ marginTop: '40px' }}>
                                  <h3 style={{borderLeft: '4px solid #404040', paddingLeft: '12px', fontSize: '16px', color: '#0f172a', marginBottom: '20px' }}>PAYMENT HISTORY (LAST 48 MONTHS)</h3>
                                  <div className="history-grid-wrapper">
                                    <table className="history-grid-table" style={{ color: '#334155' }}>
                                      <thead>
                                        <tr>
                                          <th>Month</th>
                                          {cibilResult.history48.slice(-12).map((h: any, i: number) => <th key={i}>{h.month}</th>)}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr>
                                          <td style={{ fontWeight: '600', textAlign: 'left' }}>Status</td>
                                          {cibilResult.history48.slice(-12).map((h: any, i: number) => (
                                            <td key={i} className={h.status === '000' ? 'status-std' : 'status-late'}>{h.status}</td>
                                          ))}
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                  <p style={{ fontSize: '10px', color: '#64748b', marginTop: '10px' }}>* STD: Standard, 000: No Delay, 030+: Days Past Due</p>
                                </div>

                                {/* Disclaimer */}
                                <div style={{ marginTop: '50px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.6', textAlign: 'justify' }}>
                                    **Credit Report Disclaimer** This report is provided for informational purposes only. SkyTree Solutions sourced this data from TransUnion CIBIL/Equifax authorized bureaus.
                                    We do not guarantee completeness. Any discrepancies should be reported to the bank directly.
                                    Confidentiality must be maintained. SkyTree is a facilitator and not the primary data generator.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {cibilLoading && (
                          <div className="cibil-loading-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="cibil-spinner" style={{ width: '60px', height: '60px', marginBottom: '30px' }} />
                            <div className="cibil-loading-steps" style={{ maxWidth: '400px', width: '100%' }}>
                              {[{ step: 1, label: 'Connecting to Credit Bureau...', icon: '🔗' }, { step: 2, label: 'Fetching CIR Data Packets...', icon: '📊' }, { step: 3, label: 'Generating Score Dashboard...', icon: '🧮' }].map((s) => (
                                <div key={s.step} className={`cibil-step ${cibilStep >= s.step ? 'cibil-step-active' : ''} ${cibilStep > s.step ? 'cibil-step-done' : ''}`} style={{ marginBottom: '15px' }}>
                                  <span style={{ fontSize: '24px' }}>{cibilStep > s.step ? '✅' : s.icon}</span>
                                  <span className="cibil-step-label" style={{ fontSize: '16px' }}>{s.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}

                {activeTab === 'Service Reports' && (
                  <div className="dashboard-content">
                    <div className="service-reports-header">
                      <div>
                        <h2 className="h1" style={{ margin: 0 }}>My Service Reports</h2>
                        <p className="service-reports-subtitle">Detailed tracking for all submitted applications with complete processing data.</p>
                      </div>
                      <button className="btn-primary" style={{ padding: '10px 16px', fontSize: '14px' }} onClick={() => setActiveTab('Services')}>
                        Apply New Service
                      </button>
                    </div>

                    <div className="service-reports-stats-grid">
                      <div className="service-report-stat-card">
                        <span className="service-report-stat-label">Total</span>
                        <strong className="service-report-stat-value">{myServiceReports.length}</strong>
                      </div>
                      <div className="service-report-stat-card success">
                        <span className="service-report-stat-label">Completed</span>
                        <strong className="service-report-stat-value">{completedReportsCount}</strong>
                      </div>
                      <div className="service-report-stat-card warning">
                        <span className="service-report-stat-label">Pending</span>
                        <strong className="service-report-stat-value">{pendingReportsCount}</strong>
                      </div>
                      <div className="service-report-stat-card info">
                        <span className="service-report-stat-label">Applied Today</span>
                        <strong className="service-report-stat-value">{todayReportsCount}</strong>
                      </div>
                    </div>

                    <div className="service-reports-filter-bar">
                      <input
                        type="text"
                        className="service-report-search-input"
                        placeholder="Search by app no, service name, reference no"
                        value={serviceReportSearch}
                        onChange={(e) => setServiceReportSearch(e.target.value)}
                      />
                      <select
                        className="service-report-status-select"
                        value={serviceReportStatus}
                        onChange={(e) => setServiceReportStatus(e.target.value as 'All' | 'Pending' | 'Completed')}
                      >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    <div className="service-reports-layout">
                      <div className="service-reports-list-panel">
                        {filteredServiceReports.length > 0 ? (
                          filteredServiceReports.map((form: any) => {
                            const isSelected = String(form.id) === expandedServiceReportId
                            return (
                              <button
                                key={form.id}
                                type="button"
                                className={`service-report-list-item ${isSelected ? 'active' : ''}`}
                                onClick={() => setExpandedServiceReportId(String(form.id))}
                              >
                                <div className="service-report-list-row">
                                  <span className="service-report-form-no">{form.formNo}</span>
                                  <span className={`status-badge ${form.status === 'Completed' ? 'approved' : 'pending'}`}>
                                    {form.status}
                                  </span>
                                </div>
                                <div className="service-report-service-name">{form.serviceName}</div>
                                <div className="service-report-list-meta">
                                  Applied: {new Date(form.appliedDate).toLocaleDateString()}
                                </div>
                              </button>
                            )
                          })
                        ) : (
                          <div className="service-reports-empty-state">
                            <div style={{ fontSize: '38px' }}>📋</div>
                            <p>No reports found for the current filters.</p>
                            <button className="btn-primary" style={{ marginTop: '10px' }} onClick={() => { setServiceReportSearch(''); setServiceReportStatus('All'); }}>
                              Reset Filters
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="service-reports-detail-panel">
                        {filteredServiceReports.length > 0 && expandedServiceReportId ? (
                          filteredServiceReports
                            .filter((form: any) => String(form.id) === expandedServiceReportId)
                            .map((form: any) => (
                              <div key={form.id} className="service-report-detail-card">
                                <div className="service-report-detail-top">
                                  <div>
                                    <h3>{form.serviceName}</h3>
                                    <p>Application No: <strong>{form.formNo}</strong></p>
                                  </div>
                                  <span className={`status-badge ${form.status === 'Completed' ? 'approved' : 'pending'}`}>
                                    {form.status}
                                  </span>
                                </div>

                                <div className="service-report-meta-grid">
                                  <div>
                                    <label>Date Applied</label>
                                    <span>{new Date(form.appliedDate).toLocaleString()}</span>
                                  </div>
                                  <div>
                                    <label>Reference No</label>
                                    <span>{form.referenceNo || 'Pending allocation'}</span>
                                  </div>
                                  <div>
                                    <label>Service Login ID</label>
                                    <span>{form.serviceUserId || 'Not generated yet'}</span>
                                  </div>
                                  <div>
                                    <label>Service Password</label>
                                    <span>{form.servicePassword || 'Not generated yet'}</span>
                                  </div>
                                </div>

                                <div className="service-report-section">
                                  <h4>Submitted Form Data</h4>
                                  <div className="service-report-kv-grid">
                                    {Object.entries(form.formData || {}).map(([key, value]: any) => (
                                      <div key={key} className="service-report-kv-item">
                                        <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                        <strong>{String(value || 'NA')}</strong>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="service-report-section">
                                  <h4>Status Updates / Downloads</h4>
                                  {form.status === 'Completed' ? (
                                    <div className="service-report-complete-actions">
                                      <p>Your application is completed and service credentials are generated.</p>
                                      {form.demandPrint ? (
                                        <button
                                          className="btn-primary"
                                          style={{ padding: '10px 14px', fontSize: '13px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                                          onClick={() => {
                                            if (!form.demandPrintDataUrl) {
                                              alert('Demand print file content is unavailable for this application.')
                                              return
                                            }
                                            const link = document.createElement('a')
                                            link.href = form.demandPrintDataUrl
                                            link.download = form.demandPrint || `Demand_Print_${form.formNo}.pdf`
                                            document.body.appendChild(link)
                                            link.click()
                                            document.body.removeChild(link)
                                          }}
                                        >
                                          Download Demand Print
                                        </button>
                                      ) : (
                                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Demand print not uploaded yet by admin.</p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="service-report-pending-box">
                                      <div className="pulse-circle small" style={{ width: '10px', height: '10px' }}></div>
                                      <span>Verification and approval are currently in progress.</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="service-reports-empty-detail">
                            <p>Select an application from the left panel to view full details.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Add Money' && (
                  <div className="wallet-dashboard">
                    <div className="wallet-balance-card">
                      <div className="balance-info">
                        <span className="balance-label">Current Balance</span>
                        <h2 className="balance-amount">₹ {(currentUser?.walletBalance || 0).toFixed(2)}</h2>
                      </div>
                      <button className="btn-primary add-funds-btn" onClick={handleAddFunds}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 12 20 22 4 22 4 12"></polyline>
                          <rect x="2" y="7" width="20" height="5"></rect>
                          <line x1="12" y1="22" x2="12" y2="7"></line>
                        </svg>
                        <span>Add Funds</span>
                      </button>
                    </div>

                    <div className="transactions-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{color: 'var(--text-main)', margin: 0 }}>Recent Transactions</h3>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          Total: {currentUser?.transactions?.length || 0}
                        </div>
                      </div>

                      <div className="transactions-list">
                        {currentUser?.transactions && currentUser.transactions.length > 0 ? (
                          currentUser.transactions.map((tx: any) => (
                            <div key={tx.id} className="transaction-card">
                              <div className="tx-icon-wrapper" style={{ background: tx.type === 'Credit' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: tx.type === 'Credit' ? '#10b981' : '#ef4444' }}>
                                {tx.type === 'Credit' ? (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                                ) : (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
                                )}
                              </div>
                              <div className="tx-details">
                                <span className="tx-desc">{tx.description}</span>
                                <div className="tx-meta">
                                  <span>{new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                  <span className="tx-dot">•</span>
                                  <span style={{ fontFamily: 'monospace', opacity: 0.8 }}>TRX_{tx.id.toString().slice(-6)}</span>
                                </div>
                              </div>
                              <div className="tx-amount-col">
                                <span className="tx-amount" style={{ color: tx.type === 'Credit' ? '#10b981' : '#ef4444' }}>
                                  {tx.type === 'Credit' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                                </span>
                                <span className={`status-badge ${tx.status.toLowerCase()}`}>{tx.status}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state-card glass-card">
                            <div className="pulse-circle" style={{ background: 'var(--glass-border)', borderColor: 'rgba(255,255,255,0.1)' }}></div>
                            <p style={{ color: 'var(--text-muted)', marginTop: '16px' }}>No transactions recorded yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 1000 }}>
              <button
                className="theme-toggle-btn"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                )}
              </button>
            </div>
            <div className="glass-card">
            <header className="auth-header">
              <div className="logo-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" />
                  <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="h1">
                {step === 1 ? 'Welcome back' : step === 2 ? 'Admin Login' : 'Create Account'}
              </h1>
              <p className="p">
                {step === 1 ? 'Experience the future of seamless access' :
                  step === 2 ? 'Please verify your identity to proceed' :
                    'Fill in the details below to join us'}
              </p>
            </header>

            <div className="step-container">
              {step === 1 ? (
                <div className="social-container">
                  <button className="btn-primary" onClick={handleEnterPortal}>
                    <span>Enter Portal</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ) : step === 2 ? (
                <form onSubmit={handleLogin} className="social-container">
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <div className="input-wrapper">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Enter username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className="input-wrapper">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      <input
                        type="password"
                        className="input-field"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <a href="#" className="forgot-link">Forgot password?</a>

                  <div className="captcha-container">
                    <div className="captcha-visual" title="Click to refresh" onClick={generateCaptcha}>
                      {captchaValue}
                    </div>
                    <input
                      type="text"
                      className="captcha-input"
                      placeholder="Verify"
                      maxLength={6}
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      required
                    />
                  </div>

                  {error && <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', marginTop: '-8px' }}>{error}</p>}

                  <button type="submit" className="btn-primary">
                    <span>Sign In</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Don't have an account? </span>
                    <button
                      type="button"
                      className="forgot-link"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onClick={() => setStep(3)}
                    >
                      Create Account
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSignup} className="social-container" style={{ gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Enter full name"
                      value={signupData.name}
                      onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Father/Spouse Name</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Enter father/spouse name"
                      value={signupData.fatherSpouseName}
                      onChange={(e) => setSignupData({ ...signupData, fatherSpouseName: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="input-field"
                        placeholder="9876543210"
                        maxLength={10}
                        inputMode="numeric"
                        value={signupData.phone}
                        onChange={(e) => setSignupData({ ...signupData, phone: normalizePhoneInput(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="input-field"
                        placeholder="name@example.com"
                        required
                        maxLength={254}
                        minLength={5}
                        pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        onBlur={(e) => {
                          if (e.target.value && !isValidEmailAddress(e.target.value)) {
                            alert('Please enter a valid email address')
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Shop Name</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Enter shop name"
                      value={signupData.shopName}
                      onChange={(e) => setSignupData({ ...signupData, shopName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <textarea
                      className="input-field"
                      style={{ minHeight: '60px', resize: 'vertical', padding: '12px' }}
                      placeholder="Enter residential address"
                      value={signupData.address}
                      onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Pincode</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="600001"
                        value={signupData.pincode}
                        onChange={handlePincodeChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <input
                        type="text"
                        className="input-field"
                        value={signupData.state}
                        readOnly
                        style={{ opacity: 0.7, cursor: 'not-allowed' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">District</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder={isSearchingDistrict ? "Searching..." : "Auto-filled from pincode"}
                      value={signupData.district}
                      readOnly
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button type="button" className="btn-primary" style={{ background: 'var(--glass)', color: 'var(--text-main)' }} onClick={() => setStep(2)}>
                      <span>Back</span>
                    </button>
                    <button type="submit" className="btn-primary">
                      <span>Create Account</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            <footer style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
              System Security Protocol v2.4.0
            </footer>
          </div>
        </>
      )}
        {isAddFundsModalOpen && (
          <div className="payment-modal-overlay">
            <div className="payment-modal-card glass-card">
              <button className="modal-close" onClick={() => setIsAddFundsModalOpen(false)}>×</button>

              <div className="modal-progress">
                <div className={`progress-step ${paymentStep >= 1 ? 'active' : ''}`}>1</div>
                <div className="progress-line"></div>
                <div className={`progress-step ${paymentStep >= 2 ? 'active' : ''}`}>2</div>
                <div className="progress-line"></div>
                <div className={`progress-step ${paymentStep >= 4 ? 'active' : ''}`}>✓</div>
              </div>

              {paymentStep === 1 && (
                <div className="payment-step-content">
                  <h3>Add Money</h3>
                  <p className="p" style={{ fontSize: '13px', marginBottom: '20px' }}>Enter the amount you wish to add.</p>

                  <div className="amount-input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="number"
                      className="payment-input"
                      value={addFundsAmount}
                      onChange={(e) => setAddFundsAmount(e.target.value)}
                      placeholder="500"
                    />
                  </div>


                  <div className="amount-presets">
                    {['500', '1000', '2000', '5000'].map(amt => (
                      <button
                        key={amt}
                        className={`preset-btn ${addFundsAmount === amt ? 'active' : ''}`}
                        onClick={() => setAddFundsAmount(amt)}
                      >
                        ₹ {amt}
                      </button>
                    ))}
                  </div>

                  <button className="btn-primary w-full" style={{ marginTop: '24px' }} onClick={handleRazorpayPayment}>
                    Continue to Payment
                  </button>
                </div>
              )}

              {paymentStep === 2 && (
                <div className="payment-step-content" style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div className="processing-spinner"></div>
                  <h3 style={{marginTop: '24px' }}>Processing Payment…</h3>
                  <p className="p" style={{ fontSize: '13px', marginTop: '8px' }}>Securely verifying your transaction. Please wait.</p>
                </div>
              )}

              {paymentStep === 4 && (
                <div className="payment-step-content center" style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div className="success-check-wrapper">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <h3 style={{marginTop: '24px' }}>Transaction Successful!</h3>
                  <p className="p" style={{ fontSize: '14px' }}>₹ {parseFloat(addFundsAmount).toFixed(2)} has been credited successfully.</p>
                  <p className="p" style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>Ref: PG_{Date.now().toString().slice(-8)}</p>
                  <button className="btn-primary w-full" style={{ marginTop: '32px' }} onClick={() => setIsAddFundsModalOpen(false)}>
                    Return to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main >
    </>
  )
}

export default App













