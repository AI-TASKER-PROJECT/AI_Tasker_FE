import type {
  AcceptanceCriteria,
  AnalyticsOverview,
  AuditLog,
  BusinessProfile,
  Contract,
  ContractChangeRequest,
  Deliverable,
  Dispute,
  ExpertProfile,
  Invoice,
  Job,
  Milestone,
  NotificationItem,
  Portfolio,
  Proposal,
  Review,
  Staff,
  SystemSetting,
  Transaction,
} from '../types';

export const mockJobs: Job[] = [
  {
    jobId: 101,
    businessId: 1,
    title: 'Xây dựng trợ lý AI chăm sóc khách hàng đa kênh',
    rawRequirements:
      'Cần chatbot trả lời sản phẩm, tra cứu đơn hàng và chuyển tiếp nhân viên khi cần.',
    structuredSow:
      'Thiết kế trợ lý hội thoại RAG hỗ trợ tiếng Việt, tích hợp dữ liệu sản phẩm và lịch sử đơn hàng, có cơ chế hand-off cho nhân viên.',
    aiTag: 'NLP',
    budget: 180_000_000,
    status: 'OPEN',
    plannedDurationValue: 10,
    plannedDurationUnit: 'tuần',
    isHot: true,
    companyName: 'Nova Retail',
    proposalsCount: 8,
    skills: ['RAG', 'LLM', 'Vector DB'],
    publishedAt: '2026-06-01T08:00:00',
  },
  {
    jobId: 102,
    businessId: 2,
    title: 'Nhận diện lỗi bề mặt sản phẩm bằng Computer Vision',
    rawRequirements:
      'Camera trên dây chuyền cần phát hiện vết xước, móp và sai màu.',
    structuredSow:
      'Xây dựng pipeline thị giác máy tính phát hiện bất thường theo thời gian thực, cung cấp dashboard tỷ lệ lỗi và hướng dẫn triển khai edge.',
    aiTag: 'Computer Vision',
    budget: 260_000_000,
    status: 'OPEN',
    plannedDurationValue: 12,
    plannedDurationUnit: 'tuần',
    companyName: 'Mekong Manufacturing',
    proposalsCount: 5,
    skills: ['YOLO', 'Anomaly Detection', 'Edge AI'],
    publishedAt: '2026-05-29T09:00:00',
  },
  {
    jobId: 103,
    businessId: 1,
    title: 'Mô hình dự báo nhu cầu tồn kho theo chi nhánh',
    rawRequirements:
      'Dự báo bán hàng và gợi ý nhập hàng cho 60 cửa hàng.',
    structuredSow:
      'Phát triển mô hình forecasting theo SKU/cửa hàng, tích hợp yếu tố mùa vụ và chiến dịch, cung cấp API gợi ý bổ sung tồn kho.',
    aiTag: 'Forecasting',
    budget: 140_000_000,
    status: 'DRAFT',
    plannedDurationValue: 8,
    plannedDurationUnit: 'tuần',
    companyName: 'Nova Retail',
    proposalsCount: 0,
    skills: ['Time Series', 'MLOps', 'Python'],
  },
  {
    jobId: 104,
    businessId: 3,
    title: 'OCR hồ sơ bảo hiểm tiếng Việt',
    rawRequirements:
      'Đọc hồ sơ yêu cầu bồi thường và trích xuất trường dữ liệu.',
    structuredSow:
      'Xây dựng OCR và document understanding cho biểu mẫu bảo hiểm, đánh giá theo F1-score và thời gian xử lý.',
    aiTag: 'Document AI',
    budget: 220_000_000,
    status: 'OPEN',
    plannedDurationValue: 14,
    plannedDurationUnit: 'tuần',
    isHot: true,
    companyName: 'An Tâm Insurance',
    proposalsCount: 11,
    skills: ['OCR', 'Document AI', 'Transformer'],
    publishedAt: '2026-05-25T08:30:00',
  },
  {
    jobId: 105,
    businessId: 4,
    title: 'Gợi ý khóa học cá nhân hóa cho nền tảng EdTech',
    rawRequirements:
      'Hệ thống cần gợi ý nội dung phù hợp theo lịch sử học.',
    structuredSow:
      'Thiết kế recommender system kết hợp hành vi học và nội dung, đánh giá A/B test và độ đa dạng gợi ý.',
    aiTag: 'Recommendation',
    budget: 120_000_000,
    status: 'CLOSED',
    plannedDurationValue: 9,
    plannedDurationUnit: 'tuần',
    companyName: 'LearnFlow',
    proposalsCount: 7,
    skills: ['Recommender', 'A/B Testing', 'Data Pipeline'],
    publishedAt: '2026-05-10T10:00:00',
  },
  {
    jobId: 106,
    businessId: 5,
    title: 'Phân tích cảm xúc phản hồi khách hàng',
    rawRequirements: 'Phân loại phản hồi tích cực, tiêu cực và chủ đề.',
    structuredSow:
      'Xây dựng mô hình sentiment và topic classification tiếng Việt, kèm dashboard theo kênh phản hồi.',
    aiTag: 'NLP',
    budget: 90_000_000,
    status: 'OPEN',
    plannedDurationValue: 6,
    plannedDurationUnit: 'tuần',
    companyName: 'Bright Telecom',
    proposalsCount: 4,
    skills: ['NLP', 'Text Classification', 'Dashboard'],
    publishedAt: '2026-05-21T14:00:00',
  },
];

export const mockExperts: ExpertProfile[] = [
  {
    expertId: 11,
    accountId: 21,
    nationalId: '079203001234',
    kycStatus: 'Approved',
    fullName: 'Trần Hoàng Nam',
    title: 'Senior NLP & LLM Engineer',
    rating: 4.9,
    completedProjects: 18,
    skills: ['RAG', 'LLM', 'Vector DB', 'MLOps'],
  },
  {
    expertId: 12,
    accountId: 22,
    nationalId: '079203005678',
    kycStatus: 'Approved',
    fullName: 'Vũ Thanh Hằng',
    title: 'Computer Vision Specialist',
    rating: 4.8,
    completedProjects: 14,
    skills: ['Computer Vision', 'YOLO', 'Edge AI'],
  },
  {
    expertId: 13,
    accountId: 23,
    nationalId: '079203009999',
    kycStatus: 'Approved',
    fullName: 'Nguyễn Quang Minh',
    title: 'Data Scientist & Forecasting Lead',
    rating: 4.7,
    completedProjects: 22,
    skills: ['Forecasting', 'Python', 'Data Pipeline'],
  },
  {
    expertId: 14,
    accountId: 24,
    nationalId: '079203004444',
    kycStatus: 'Pending',
    fullName: 'Đỗ Lan Phương',
    title: 'Document AI Engineer',
    rating: 4.6,
    completedProjects: 9,
    skills: ['OCR', 'Document AI', 'Transformer'],
  },
];

export const mockBusinessProfiles: BusinessProfile[] = [
  {
    businessId: 1,
    accountId: 10,
    taxCode: '0312345678',
    companyName: 'Nova Retail',
    address: 'Quận 1, TP. Hồ Chí Minh',
    businessLicenseUrl: 'https://example.com/nova-license.pdf',
    kybStatus: 'Approved',
    createdAt: '2026-05-02T08:00:00',
  },
  {
    businessId: 2,
    accountId: 11,
    taxCode: '0109988776',
    companyName: 'Mekong Manufacturing',
    address: 'Bình Dương',
    businessLicenseUrl: 'https://example.com/mekong-license.pdf',
    kybStatus: 'Pending',
    createdAt: '2026-06-01T08:00:00',
  },
  {
    businessId: 3,
    accountId: 12,
    taxCode: '0301122334',
    companyName: 'An Tâm Insurance',
    address: 'Hà Nội',
    businessLicenseUrl: 'https://example.com/antam-license.pdf',
    kybStatus: 'Rejected',
    createdAt: '2026-05-28T08:00:00',
  },
];

export const mockPortfolio: Portfolio = {
  portfolioId: 1,
  expertId: 11,
  context:
    'Đã triển khai trợ lý tri thức nội bộ và chatbot chăm sóc khách hàng cho bán lẻ, tài chính.',
  dataProcessing:
    'Chuẩn hóa dữ liệu tiếng Việt, xây dựng pipeline chunking, embedding, đánh giá retrieval.',
  modelArchitecture:
    'RAG với hybrid search, reranker và LLM có guardrail cho nghiệp vụ.',
  performanceMetrics:
    'Answer relevance 0.91, groundedness 0.95, latency P95 dưới 2.4 giây.',
  pocUrl: 'https://example.com/poc-rag',
};

export const mockProposals: Proposal[] = [
  {
    proposalId: 501,
    jobId: 101,
    expertId: 11,
    technicalSolution:
      'RAG đa nguồn dữ liệu, hybrid search, guardrail và dashboard đánh giá chất lượng.',
    bidAmount: 165_000_000,
    status: 'Pending',
    expertName: 'Trần Hoàng Nam',
    expertTitle: 'Senior NLP & LLM Engineer',
    rating: 4.9,
    matchScore: 96,
    deliveryDays: 64,
    createdAt: '2026-06-02T09:00:00',
  },
  {
    proposalId: 502,
    jobId: 101,
    expertId: 13,
    technicalSolution:
      'Kiến trúc microservice, intent routing và lớp analytics theo hành trình hội thoại.',
    bidAmount: 172_000_000,
    status: 'Pending',
    expertName: 'Nguyễn Quang Minh',
    expertTitle: 'Data Scientist & Forecasting Lead',
    rating: 4.7,
    matchScore: 84,
    deliveryDays: 70,
    createdAt: '2026-06-02T10:30:00',
  },
  {
    proposalId: 503,
    jobId: 102,
    expertId: 12,
    technicalSolution:
      'Pipeline YOLO kết hợp anomaly detection, tối ưu inference trên edge GPU.',
    bidAmount: 245_000_000,
    status: 'Accepted',
    expertName: 'Vũ Thanh Hằng',
    expertTitle: 'Computer Vision Specialist',
    rating: 4.8,
    matchScore: 94,
    deliveryDays: 80,
    createdAt: '2026-05-30T11:00:00',
  },
];

export const mockContracts: Contract[] = [
  {
    contractId: 9001,
    jobId: 102,
    businessId: 2,
    expertId: 12,
    technologyUsed: 'Python, YOLOv9, FastAPI, PostgreSQL',
    totalBudget: 245_000_000,
    timelineDays: 80,
    ndaSigned: true,
    status: 'Active',
    title: 'Nhận diện lỗi bề mặt sản phẩm bằng Computer Vision',
    businessName: 'Mekong Manufacturing',
    expertName: 'Vũ Thanh Hằng',
    progress: 58,
    createdAt: '2026-05-12T08:00:00',
  },
  {
    contractId: 9002,
    jobId: 105,
    businessId: 4,
    expertId: 13,
    technologyUsed: 'Python, Spark, MLflow',
    totalBudget: 115_000_000,
    timelineDays: 60,
    ndaSigned: true,
    status: 'Completed',
    title: 'Gợi ý khóa học cá nhân hóa cho nền tảng EdTech',
    businessName: 'LearnFlow',
    expertName: 'Nguyễn Quang Minh',
    progress: 100,
    createdAt: '2026-03-01T08:00:00',
  },
  {
    contractId: 9003,
    jobId: 101,
    businessId: 1,
    expertId: 11,
    technologyUsed: 'Spring Boot, PostgreSQL, Vector DB, LLM API',
    totalBudget: 165_000_000,
    timelineDays: 64,
    ndaSigned: false,
    status: 'Draft',
    title: 'Xây dựng trợ lý AI chăm sóc khách hàng đa kênh',
    businessName: 'Nova Retail',
    expertName: 'Trần Hoàng Nam',
    progress: 8,
    createdAt: '2026-06-02T08:00:00',
  },
];

export const mockChangeRequests: ContractChangeRequest[] = [
  {
    requestId: 31,
    contractId: 9003,
    requestedByAccountId: 21,
    changeType: 'TIMELINE',
    changeSummary:
      'Đề xuất tăng thời gian kiểm thử tích hợp từ 7 lên 12 ngày để đảm bảo đủ dữ liệu hội thoại.',
    proposedTimelineDays: 70,
    status: 'Pending',
    createdAt: '2026-06-03T08:15:00',
  },
];

export const mockMilestones: Milestone[] = [
  {
    milestoneId: 701,
    contractId: 9001,
    milestoneName: 'Khảo sát dữ liệu và thiết kế pipeline',
    fundsAllocated: 55_000_000,
    orderIndex: 1,
    status: 'Released',
    slaDaysLeft: 0,
  },
  {
    milestoneId: 702,
    contractId: 9001,
    milestoneName: 'Huấn luyện mô hình phát hiện lỗi',
    fundsAllocated: 110_000_000,
    orderIndex: 2,
    status: 'Under Review',
    slaDaysLeft: 4,
  },
  {
    milestoneId: 703,
    contractId: 9001,
    milestoneName: 'Tối ưu edge và bàn giao',
    fundsAllocated: 80_000_000,
    orderIndex: 3,
    status: 'Pending',
    slaDaysLeft: 7,
  },
];

export const mockCriteria: AcceptanceCriteria[] = [
  {
    criteriaId: 801,
    milestoneId: 702,
    description: 'mAP@50 đạt tối thiểu 0.92 trên tập kiểm thử đã thống nhất',
    isPassed: true,
  },
  {
    criteriaId: 802,
    milestoneId: 702,
    description: 'Độ trễ xử lý trung bình dưới 150ms trên thiết bị edge',
    isPassed: true,
  },
  {
    criteriaId: 803,
    milestoneId: 702,
    description: 'Có báo cáo phân tích lỗi false positive / false negative',
    isPassed: false,
  },
];

export const mockDeliverables: Deliverable[] = [
  {
    deliverableId: 901,
    milestoneId: 702,
    sourceCodeUrl: 'https://example.com/source/model-v2.zip',
    demoLink: 'https://example.com/demo/vision-inspection',
    submissionNotes:
      'Đã bổ sung notebook đánh giá, hướng dẫn deploy và báo cáo hiệu năng edge.',
    createdAt: '2026-06-01T14:00:00',
  },
];

export const mockTransactions: Transaction[] = [
  {
    transactionId: 10001,
    milestoneId: 701,
    milestoneName: 'Khảo sát dữ liệu và thiết kế pipeline',
    amount: 55_000_000,
    commissionFee: 5_500_000,
    transactionType: 'Payout',
    status: 'Success',
    createdAt: '2026-05-21T09:00:00',
  },
  {
    transactionId: 10002,
    milestoneId: 702,
    milestoneName: 'Huấn luyện mô hình phát hiện lỗi',
    amount: 110_000_000,
    commissionFee: 0,
    transactionType: 'Deposit',
    status: 'Success',
    createdAt: '2026-05-22T09:00:00',
  },
  {
    transactionId: 10003,
    milestoneId: 703,
    milestoneName: 'Tối ưu edge và bàn giao',
    amount: 80_000_000,
    commissionFee: 0,
    transactionType: 'Deposit',
    status: 'Pending',
    createdAt: '2026-06-02T09:00:00',
  },
];

export const mockInvoices: Invoice[] = [
  {
    invoiceId: 3001,
    transactionId: 10001,
    bankTxCode: 'VNP-AIT-10001',
    receiptImgUrl: 'https://example.com/receipts/10001.jpg',
    createdAt: '2026-05-21T09:05:00',
  },
  {
    invoiceId: 3002,
    transactionId: 10002,
    bankTxCode: 'VNP-AIT-10002',
    receiptImgUrl: 'https://example.com/receipts/10002.jpg',
    createdAt: '2026-05-22T09:05:00',
  },
];

export const mockDisputes: Dispute[] = [
  {
    disputeId: 401,
    contractId: 9001,
    milestoneId: 702,
    assignedStaffId: 61,
    evidenceReport:
      'Doanh nghiệp phản ánh tỷ lệ false positive cao hơn báo cáo trong điều kiện ánh sáng yếu.',
    proposedAction: 'Kiểm thử lại với bộ dữ liệu ánh sáng yếu',
    status: 'UnderReview',
    title: 'Kết quả kiểm thử chưa ổn định ở ca đêm',
    raisedBy: 'Mekong Manufacturing',
    jobTitle: 'Nhận diện lỗi bề mặt sản phẩm bằng Computer Vision',
    staffName: 'Phạm Quốc Huy',
    createdAt: '2026-06-02T08:00:00',
  },
  {
    disputeId: 402,
    contractId: 9002,
    milestoneId: 710,
    evidenceReport:
      'Chuyên gia yêu cầu đối soát lại đánh giá sau khi hệ thống đã đạt toàn bộ AC.',
    proposedAction: 'Force payout 100%',
    status: 'Escalated',
    title: 'Yêu cầu đối soát kết quả nghiệm thu',
    raisedBy: 'Nguyễn Quang Minh',
    jobTitle: 'Gợi ý khóa học cá nhân hóa cho nền tảng EdTech',
    staffName: 'Lê Mai Linh',
    createdAt: '2026-05-28T10:00:00',
  },
  {
    disputeId: 403,
    contractId: 9004,
    evidenceReport: 'Hồ sơ mới, chưa được phân công.',
    status: 'Open',
    title: 'Tranh chấp phạm vi bàn giao',
    raisedBy: 'Bright Telecom',
    jobTitle: 'Phân tích cảm xúc phản hồi khách hàng',
    createdAt: '2026-06-03T08:00:00',
  },
];

export const mockStaffs: Staff[] = [
  {
    staffId: 61,
    accountId: 71,
    specialization: 'Computer Vision',
    fullName: 'Phạm Quốc Huy',
    email: 'huy.pham@aitasker.vn',
    activeTickets: 3,
  },
  {
    staffId: 62,
    accountId: 72,
    specialization: 'NLP',
    fullName: 'Lê Mai Linh',
    email: 'linh.le@aitasker.vn',
    activeTickets: 2,
  },
  {
    staffId: 63,
    accountId: 73,
    specialization: 'Data Science',
    fullName: 'Trần Quốc Bảo',
    email: 'bao.tran@aitasker.vn',
    activeTickets: 1,
  },
];

export const mockSettings: SystemSetting[] = [
  {
    settingKey: 'platform_fee_percent',
    settingValue: '10',
    valueType: 'DECIMAL',
    description: 'Phần trăm phí nền tảng khấu trừ khi giải ngân.',
    isActive: true,
  },
  {
    settingKey: 'default_sla_days',
    settingValue: '7',
    valueType: 'INT',
    description: 'Số ngày SLA mặc định để tự động duyệt milestone.',
    isActive: true,
  },
  {
    settingKey: 'auto_assign_staff_enabled',
    settingValue: 'true',
    valueType: 'BOOLEAN',
    description: 'Tự động gán staff cho ticket tranh chấp mới.',
    isActive: true,
  },
];

export const mockReviews: Review[] = [
  {
    reviewId: 1,
    contractId: 9002,
    reviewerId: 10,
    revieweeId: 23,
    rating: 4.8,
    comment:
      'Chuyên gia làm việc có cấu trúc, giải thích rõ và chủ động đề xuất phương án đo lường.',
    reviewerName: 'LearnFlow',
    createdAt: '2026-05-16T08:00:00',
  },
  {
    reviewId: 2,
    contractId: 9002,
    reviewerId: 23,
    revieweeId: 10,
    rating: 4.7,
    comment:
      'Doanh nghiệp cung cấp dữ liệu đúng hạn và phản hồi nghiệm thu minh bạch.',
    reviewerName: 'Nguyễn Quang Minh',
    createdAt: '2026-05-17T08:00:00',
  },
];

export const mockAnalytics: AnalyticsOverview = {
  totalContracts: 128,
  completedContracts: 96,
  terminatedContracts: 8,
  contractSuccessRatePercent: 75,
  totalDisputes: 17,
  openDisputes: 5,
  totalTransactions: 384,
  transactionVolume: 12_480_000_000,
};

export const mockNotifications: NotificationItem[] = [
  {
    id: 1,
    title: 'Proposal mới cho dự án chatbot',
    description: 'Trần Hoàng Nam vừa gửi đề xuất kỹ thuật với độ phù hợp 96%.',
    time: '10 phút trước',
    type: 'info',
    read: false,
    href: '/app/jobs/101/manage',
  },
  {
    id: 2,
    title: 'Milestone đang chờ nghiệm thu',
    description: 'Mốc “Huấn luyện mô hình phát hiện lỗi” còn 4 ngày SLA.',
    time: '1 giờ trước',
    type: 'warning',
    read: false,
    href: '/app/contracts/9001/workspace',
  },
  {
    id: 3,
    title: 'Giao dịch ký quỹ thành công',
    description: 'Biên lai VNP-AIT-10002 đã được đối soát.',
    time: 'Hôm qua',
    type: 'success',
    read: true,
    href: '/app/finance',
  },
];

export const mockAuditLogs: AuditLog[] = [
  {
    logId: 1,
    actor: 'Lê Thu Quản Trị',
    action: 'APPROVE_EXPERT_PROFILE',
    entityName: 'expert_profiles',
    entityId: '13',
    createdAt: '2026-06-03T09:20:00',
    ipAddress: '10.0.1.23',
  },
  {
    logId: 2,
    actor: 'Phạm Quốc Huy',
    action: 'APPROVE_BUSINESS_PROFILE',
    entityName: 'business_profiles',
    entityId: '2',
    createdAt: '2026-06-03T08:45:00',
    ipAddress: '10.0.1.18',
  },
  {
    logId: 3,
    actor: 'Lê Thu Quản Trị',
    action: 'UPDATE_SYSTEM_SETTING',
    entityName: 'system_settings',
    entityId: 'default_sla_days',
    createdAt: '2026-06-02T16:10:00',
    ipAddress: '10.0.1.23',
  },
];
