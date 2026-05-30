import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAllSettings } from '@/db/queries';
import { requireUser } from '@/lib/auth';
import { calculateTaxes } from '@/lib/tax';
import { TaxCalculatorForm } from '@/components/tax/TaxCalculatorForm';
import { formatUSD, formatPercent } from '@/lib/currency';

export const dynamic = 'force-dynamic';

export default async function TaxCalculatorPage() {
  const userId = await requireUser();
  const settings = await getAllSettings(userId);
  const result = calculateTaxes({
    grossAnnual: settings['salary.annualGross'],
    filingStatus: settings['tax.filingStatus'],
    standardDeduction: settings['tax.standardDeduction'],
    retirement401kPct: settings['tax.401kContribPct'],
    healthPremiumMonthly: settings['tax.healthPremiumMonthly'],
    hsaContribAnnual: settings['tax.hsaContribAnnual'],
    state: settings['salary.state'],
    paychecksPerYear: settings['salary.paychecksPerYear'],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Tax Calculator</h1>
        <p className="text-sm text-muted-foreground">
          Federal + payroll + state estimate using 2025 brackets. Adjust inputs and save.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
          </CardHeader>
          <CardContent>
            <TaxCalculatorForm initial={settings} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estimate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Gross annual" value={formatUSD(result.gross)} />
            <Row label="Pre-tax deductions" value={`− ${formatUSD(result.preTaxDeductions)}`} />
            <Row label="Standard deduction" value={`− ${formatUSD(settings['tax.standardDeduction'])}`} />
            <Row label="Taxable income" value={formatUSD(result.taxableIncome)} />
            <hr className="border-border" />
            <Row label="Federal income tax" value={formatUSD(result.federalIncomeTax)} />
            <Row label="Social Security" value={formatUSD(result.socialSecurity)} />
            <Row label="Medicare" value={formatUSD(result.medicare)} />
            <Row label="State income tax" value={formatUSD(result.stateIncomeTax)} />
            <hr className="border-border" />
            <Row label="Total taxes & FICA" value={formatUSD(result.totalTax)} bold />
            <Row label="Net annual" value={formatUSD(result.netAnnual)} bold tone="positive" />
            <Row label="Net monthly" value={formatUSD(result.netMonthly)} tone="positive" />
            <Row
              label="Per paycheck (gross / net)"
              value={`${formatUSD(result.perPaycheckGross)} / ${formatUSD(result.perPaycheckNet)}`}
            />
            <Row label="Effective rate" value={formatPercent(result.effectiveRate)} />
            <Row label="Marginal bracket" value={formatPercent(result.marginalBracket)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Federal bracket breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {result.federalBracketBreakdown.map((b, i) => (
            <div key={i} className="flex justify-between tabular">
              <span className="text-muted-foreground">
                {formatPercent(b.rate)} on {formatUSD(b.from)} – {formatUSD(b.to)}
              </span>
              <span>{formatUSD(b.tax)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          Estimates only. Not tax advice. Verify with a tax professional or IRS publications before
          filing.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: 'positive';
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={[
          'tabular text-sm',
          bold ? 'font-semibold' : '',
          tone === 'positive' ? 'text-income' : '',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}
