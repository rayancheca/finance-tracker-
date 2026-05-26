import { differenceInCalendarMonths } from 'date-fns';
import { fromISODate } from './dates';

export type LeaseStatus = 'active' | 'subletting' | 'released';

export interface LeaseInput {
  status: LeaseStatus;
  monthlyShare: number;
  endDate: string; // ISO date
  subletOffsetMonthly: number;
  asOf?: Date;
}

export interface LeaseResult {
  status: LeaseStatus;
  monthsRemaining: number;
  effectiveMonthlyShare: number;
  totalRemainingLiability: number;
  releaseSavings: (releaseDate: Date) => number;
}

export function calculateLease(input: LeaseInput): LeaseResult {
  const asOf = input.asOf ?? new Date();
  const end = fromISODate(input.endDate);
  const monthsRemaining = Math.max(0, differenceInCalendarMonths(end, asOf));

  const effectiveMonthlyShare =
    input.status === 'released'
      ? 0
      : input.status === 'subletting'
        ? Math.max(0, input.monthlyShare - Math.max(0, input.subletOffsetMonthly))
        : input.monthlyShare;

  const totalRemainingLiability = monthsRemaining * effectiveMonthlyShare;

  return {
    status: input.status,
    monthsRemaining,
    effectiveMonthlyShare,
    totalRemainingLiability,
    releaseSavings: (releaseDate: Date) => {
      if (input.status === 'released') return 0;
      const monthsIfRelease = Math.max(0, differenceInCalendarMonths(end, releaseDate));
      const savedMonths = Math.max(0, monthsRemaining - monthsIfRelease);
      return savedMonths * effectiveMonthlyShare;
    },
  };
}
