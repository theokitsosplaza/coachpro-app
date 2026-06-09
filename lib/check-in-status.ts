export const CHECK_IN_STATUS = {
  Pending:  'Pending',
  Approved: 'Approved',
} as const;

export type CheckInStatus = (typeof CHECK_IN_STATUS)[keyof typeof CHECK_IN_STATUS];
