export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CHURCH_ADMIN: 'CHURCH_ADMIN',
  SENIOR_PASTOR: 'SENIOR_PASTOR',
  PASTOR: 'PASTOR',
  FINANCE_OFFICER: 'FINANCE_OFFICER',
  DEPARTMENT_LEADER: 'DEPARTMENT_LEADER',
  MEMBER: 'MEMBER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const MemberStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  VISITOR: 'VISITOR',
  TRANSFERRED: 'TRANSFERRED',
  DECEASED: 'DECEASED',
} as const;
export type MemberStatus = (typeof MemberStatus)[keyof typeof MemberStatus];

export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const ServiceType = {
  SUNDAY: 'SUNDAY',
  MIDWEEK: 'MIDWEEK',
  PRAYER: 'PRAYER',
  EVENT: 'EVENT',
} as const;
export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

export const TransactionType = {
  TITHE: 'TITHE',
  OFFERING: 'OFFERING',
  DONATION: 'DONATION',
  EXPENSE: 'EXPENSE',
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const ContributionType = {
  TITHE: 'TITHE',
  OFFERING: 'OFFERING',
  SPECIAL: 'SPECIAL',
  PLEDGE: 'PLEDGE',
} as const;
export type ContributionType = (typeof ContributionType)[keyof typeof ContributionType];

export const ContributionStatus = {
  RECORDED: 'RECORDED',
  VERIFIED: 'VERIFIED',
  VOID: 'VOID',
} as const;
export type ContributionStatus = (typeof ContributionStatus)[keyof typeof ContributionStatus];

export const PaymentMethod = {
  CASH: 'CASH',
  MOBILE_MONEY: 'MOBILE_MONEY',
  BANK: 'BANK',
  CARD: 'CARD',
  CHEQUE: 'CHEQUE',
  OTHER: 'OTHER',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  COMPLETED: 'COMPLETED',
  PENDING: 'PENDING',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  VOID: 'VOID',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentSource = {
  MANUAL: 'MANUAL',
  PROVIDER: 'PROVIDER',
  IMPORT: 'IMPORT',
} as const;
export type PaymentSource = (typeof PaymentSource)[keyof typeof PaymentSource];

export const EventStatus = {
  DRAFT: 'DRAFT',
  UPCOMING: 'UPCOMING',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const RegistrationStatus = {
  CONFIRMED: 'CONFIRMED',
  WAITLIST: 'WAITLIST',
  CANCELLED: 'CANCELLED',
} as const;
export type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus];

export const PrayerStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  PRAYED_FOR: 'PRAYED_FOR',
  CLOSED: 'CLOSED',
} as const;
export type PrayerStatus = (typeof PrayerStatus)[keyof typeof PrayerStatus];

export const CounselingStatus = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  FOLLOW_UP: 'FOLLOW_UP',
} as const;
export type CounselingStatus = (typeof CounselingStatus)[keyof typeof CounselingStatus];

export const AssetType = {
  EQUIPMENT: 'EQUIPMENT',
  VEHICLE: 'VEHICLE',
  BUILDING: 'BUILDING',
  FURNITURE: 'FURNITURE',
  OTHER: 'OTHER',
} as const;
export type AssetType = (typeof AssetType)[keyof typeof AssetType];

export const AssetCondition = {
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  FAIR: 'FAIR',
  POOR: 'POOR',
  REPAIR_NEEDED: 'REPAIR_NEEDED',
} as const;
export type AssetCondition = (typeof AssetCondition)[keyof typeof AssetCondition];

export const AnnouncementStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type AnnouncementStatus = (typeof AnnouncementStatus)[keyof typeof AnnouncementStatus];

export const PodcastStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type PodcastStatus = (typeof PodcastStatus)[keyof typeof PodcastStatus];
