import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, 
  Download, 
  Filter, 
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  ShieldAlert,
  Calendar,
  Send,
  Layers,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronRight,
  Loader2,
  Boxes,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import * as XLSX from 'xlsx';
import { mockService } from '@/services/mockService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend
} from 'recharts';

type ReportCategory = 'compliance' | 'incidents' | 'commitments' | 'requests' | 'frameworks' | 'risks' | 'all';

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('compliance');
  const [isGenerating, setIsGenerating] = useState(false);

  // ---- Filters that affect both display and export ----
  const [filterFramework, setFilterFramework] = useState<string>('all');
  const [filterPolicy, setFilterPolicy] = useState<string>('all');
  const [filterProcStatus, setFilterProcStatus] = useState<string>('all');
  const [filterIncStatus, setFilterIncStatus] = useState<string>('all');
  const [filterIncPriority, setFilterIncPriority] = useState<string>('all');
  const [filterCommStatus, setFilterCommStatus] = useState<string>('all');
  const [filterReqStatus, setFilterReqStatus] = useState<string>('all');
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const safeSet = (setter: (v: string) => void) => (v: string | null) => setter(v || 'all');

  const resetFilters = () => {
    setFilterFramework('all');
    setFilterPolicy('all');
    setFilterProcStatus('all');
    setFilterIncStatus('all');
    setFilterIncPriority('all');
    setFilterCommStatus('all');
    setFilterReqStatus('all');
    setFilterRiskLevel('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const isRtl = i18n.language === 'ar';

  const rawData = useMemo(() => ({
    procedures: mockService.getProcedures(),
    incidents: mockService.getIncidents(),
    commitments: mockService.getCommitments(),
    requests: mockService.getChangeRequests(),
    policies: mockService.getPolicies(),
    frameworks: mockService.getFrameworks(),
    standards: mockService.getStandards(),
    policyItems: mockService.getPolicyItems(),
    users: mockService.getUsers(),
    risks: mockService.getRisks()
  }), []);

  // Apply all active filters once; downstream stats/charts/HTML/Excel all read
  // from this so display and export stay in sync.
  const data = useMemo(() => {
    const inDateRange = (iso: string | undefined): boolean => {
      if (!filterDateFrom && !filterDateTo) return true;
      if (!iso) return false;
      const t = new Date(iso).getTime();
      if (filterDateFrom && t < new Date(filterDateFrom).getTime()) return false;
      if (filterDateTo && t > new Date(filterDateTo + 'T23:59:59').getTime()) return false;
      return true;
    };

    const policyIdsInFramework = filterFramework === 'all'
      ? null
      : new Set(rawData.policies.filter(p => p.frameworkId === filterFramework).map(p => p.id));

    const policies = rawData.policies.filter(p =>
      (filterFramework === 'all' || p.frameworkId === filterFramework) &&
      (filterPolicy === 'all' || p.id === filterPolicy)
    );
    const policyIds = new Set(policies.map(p => p.id));
    const standards = rawData.standards.filter(s => policyIds.has(s.policyId));
    const standardIds = new Set(standards.map(s => s.id));
    const policyItems = rawData.policyItems.filter(i => policyIds.has(i.policyId));

    const procedures = rawData.procedures.filter(p => {
      if (!standardIds.has(p.standardId)) return false;
      if (policyIdsInFramework && !policyIdsInFramework.has(p.policyId)) return false;
      if (filterProcStatus !== 'all' && p.status !== filterProcStatus) return false;
      if (!inDateRange(p.endDate)) return false;
      return true;
    });

    const incidents = rawData.incidents.filter(i => {
      if (filterIncStatus !== 'all' && i.status !== filterIncStatus) return false;
      if (filterIncPriority !== 'all' && i.priority !== filterIncPriority) return false;
      if (!inDateRange(i.reportedAt)) return false;
      return true;
    });

    const commitments = rawData.commitments.filter(c => {
      if (filterCommStatus !== 'all' && c.status !== filterCommStatus) return false;
      if (!inDateRange(c.expiryDate)) return false;
      return true;
    });

    const requests = rawData.requests.filter(r => {
      if (filterReqStatus !== 'all' && r.status !== filterReqStatus) return false;
      return true;
    });

    return {
      ...rawData,
      policies,
      standards,
      policyItems,
      procedures,
      incidents,
      commitments,
      requests,
      // risks are filtered later (level computed from likelihood × impact)
    };
  }, [rawData, filterFramework, filterPolicy, filterProcStatus, filterIncStatus, filterIncPriority, filterCommStatus, filterReqStatus, filterDateFrom, filterDateTo]);

  const risksDetail = useMemo(() => {
    return data.risks.map((r: any) => {
      const likelihood = mockService.getRiskLikelihood(r);
      const score = likelihood * (r.impact || 1);
      const level = score >= 15 ? 'very_high' : score >= 9 ? 'high' : score >= 4 ? 'medium' : 'low';
      const linkedProcs = (r.procedureIds || []).map((id: string) => rawData.procedures.find((p: any) => p.id === id)).filter(Boolean);
      const completedLinked = linkedProcs.filter((p: any) => p.status === 'completed').length;
      return {
        id: r.id,
        nameAr: r.nameAr,
        nameEn: r.nameEn,
        likelihood,
        impact: r.impact,
        score,
        level,
        linkedCount: linkedProcs.length,
        completedLinked
      };
    })
      .filter((r: any) => filterRiskLevel === 'all' || r.level === filterRiskLevel)
      .sort((a: any, b: any) => b.score - a.score);
  }, [data, rawData, filterRiskLevel]);

  const riskStats = useMemo(() => ({
    total: risksDetail.length,
    veryHigh: risksDetail.filter(r => r.level === 'very_high').length,
    high: risksDetail.filter(r => r.level === 'high').length,
    medium: risksDetail.filter(r => r.level === 'medium').length,
    low: risksDetail.filter(r => r.level === 'low').length,
    avg: risksDetail.length > 0 ? Math.round(risksDetail.reduce((s, r) => s + r.score, 0) / risksDetail.length) : 0
  }), [risksDetail]);

  const frameworksDetail = useMemo(() => {
    return data.frameworks.map((f: any) => {
      const policies = data.policies.filter((p: any) => p.frameworkId === f.id);
      // Mirror getFrameworkProgress's union path so counts and the progress bar agree.
      const stdIdSet = new Set<string>();
      policies.forEach((p: any) => mockService._standardsInPolicy(p.id).forEach(sid => stdIdSet.add(sid)));
      const standards = data.standards.filter((s: any) => stdIdSet.has(s.id));
      const standardIds = Array.from(stdIdSet);
      const procedures = data.procedures.filter((pr: any) => stdIdSet.has(pr.standardId));
      const completed = procedures.filter((pr: any) => pr.status === 'completed').length;
      const inProgress = procedures.filter((pr: any) => pr.status === 'in_progress').length;
      const notStarted = procedures.filter((pr: any) => pr.status === 'not_started').length;
      const overdue = procedures.filter((pr: any) => pr.status !== 'completed' && pr.endDate && new Date(pr.endDate).getTime() < Date.now()).length;
      const progress = mockService.getFrameworkProgress(f.id);
      return {
        id: f.id,
        nameAr: f.nameAr,
        nameEn: f.nameEn,
        descriptionAr: f.descriptionAr,
        descriptionEn: f.descriptionEn,
        progress,
        policiesCount: policies.length,
        standardsCount: standards.length,
        proceduresCount: procedures.length,
        completed,
        inProgress,
        notStarted,
        overdue,
        policies,
        standards,
        procedures
      };
    });
  }, [data]);

  const fwStats = useMemo(() => {
    const total = frameworksDetail.length;
    const certified = frameworksDetail.filter(f => f.progress === 100).length;
    const inProgress = frameworksDetail.filter(f => f.progress > 0 && f.progress < 100).length;
    const initial = frameworksDetail.filter(f => f.progress === 0).length;
    const avgProgress = total > 0 ? Math.round(frameworksDetail.reduce((acc, f) => acc + f.progress, 0) / total) : 0;
    return { total, certified, inProgress, initial, avgProgress };
  }, [frameworksDetail]);

  const stats = useMemo(() => {
    const p = data.procedures;
    const i = data.incidents;
    const c = data.commitments;
    const r = data.requests;

    return {
      proc: {
        completed: p.filter(x => x.status === 'completed').length,
        inProgress: p.filter(x => x.status === 'in_progress').length,
        notStarted: p.filter(x => x.status === 'not_started').length,
        total: p.length
      },
      inc: {
        resolved: i.filter(x => x.status === 'resolved' || x.status === 'closed').length,
        open: i.filter(x => x.status !== 'resolved' && x.status !== 'closed').length,
        total: i.length
      },
      comm: {
        active: c.filter(x => x.status === 'active').length,
        expired: c.filter(x => x.status === 'expired').length,
        total: c.length
      },
      req: {
        approved: r.filter(x => x.status === 'approved').length,
        pending: r.filter(x => x.status === 'pending' || x.status === 'clarification_needed').length,
        rejected: r.filter(x => x.status === 'rejected').length,
        total: r.length
      }
    };
  }, [data]);

  const chartData = useMemo(() => {
    switch (activeCategory) {
      case 'compliance':
        return [
          { name: t('completed'), value: stats.proc.completed, color: '#10b981' },
          { name: t('in_progress'), value: stats.proc.inProgress, color: '#3b82f6' },
          { name: t('not_started'), value: stats.proc.notStarted, color: '#94a3b8' },
        ];
      case 'incidents':
        return [
          { name: t('resolved'), value: stats.inc.resolved, color: '#10b981' },
          { name: t('open'), value: stats.inc.open, color: '#f43f5e' },
        ];
      case 'commitments':
        return [
          { name: t('active'), value: stats.comm.active, color: '#10b981' },
          { name: t('expired'), value: stats.comm.expired, color: '#f43f5e' },
        ];
      case 'requests':
        return [
          { name: t('approved'), value: stats.req.approved, color: '#10b981' },
          { name: t('pending'), value: stats.req.pending, color: '#f59e0b' },
          { name: t('rejected'), value: stats.req.rejected, color: '#f43f5e' },
        ];
      case 'frameworks':
        return [
          { name: isRtl ? 'معتمد' : 'Certified', value: fwStats.certified, color: '#10b981' },
          { name: isRtl ? 'قيد التنفيذ' : 'In Progress', value: fwStats.inProgress, color: '#3b82f6' },
          { name: isRtl ? 'لم يبدأ' : 'Initial', value: fwStats.initial, color: '#94a3b8' },
        ];
      case 'risks':
        return [
          { name: isRtl ? 'مرتفع جداً' : 'Very High', value: riskStats.veryHigh, color: '#f43f5e' },
          { name: isRtl ? 'مرتفع' : 'High', value: riskStats.high, color: '#f97316' },
          { name: isRtl ? 'متوسط' : 'Medium', value: riskStats.medium, color: '#f59e0b' },
          { name: isRtl ? 'منخفض' : 'Low', value: riskStats.low, color: '#10b981' },
        ];
      default:
        return [];
    }
  }, [activeCategory, stats, t, fwStats, riskStats, isRtl]);

  const escapeHtml = (s: any): string => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const buildReportHtml = (): string => {
    const reportTitle = (() => {
      switch (activeCategory) {
        case 'compliance': return isRtl ? 'تقرير الالتزام' : 'Compliance Report';
        case 'frameworks': return isRtl ? 'تقرير أطر العمل' : 'Frameworks Report';
        case 'incidents': return isRtl ? 'تقرير البلاغات الأمنية' : 'Security Incidents Report';
        case 'commitments': return isRtl ? 'تقرير الالتزامات والشهادات' : 'Commitments & Certifications Report';
        case 'requests': return isRtl ? 'تقرير طلبات التغيير' : 'Change Requests Report';
        case 'risks': return isRtl ? 'تقرير إدارة المخاطر' : 'Risk Management Report';
        case 'all': return isRtl ? 'التقرير الشامل' : 'Comprehensive Report';
      }
    })();

    const sections: string[] = [];

    if (activeCategory === 'compliance' || activeCategory === 'all') {
      const rows = data.procedures.map(p => `
        <tr>
          <td>${escapeHtml(isRtl ? p.nameAr : p.nameEn)}</td>
          <td>${escapeHtml(t(p.status))}</td>
          <td>${escapeHtml(p.endDate || '')}</td>
        </tr>`).join('');
      sections.push(`
        <h2>${escapeHtml(t('compliance_report'))}</h2>
        <table>
          <thead><tr><th>${escapeHtml(t('procedure'))}</th><th>${escapeHtml(t('status'))}</th><th>${escapeHtml(t('end_date'))}</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="3" class="muted">${isRtl ? 'لا توجد بيانات' : 'No data'}</td></tr>`}</tbody>
        </table>`);
    }

    if (activeCategory === 'incidents' || activeCategory === 'all') {
      const rows = data.incidents.map(i => `
        <tr>
          <td>${escapeHtml(i.title)}</td>
          <td>${escapeHtml(t(i.status))}</td>
          <td>${escapeHtml(i.priority)}</td>
        </tr>`).join('');
      sections.push(`
        <h2>${escapeHtml(t('incidents_report'))}</h2>
        <table>
          <thead><tr><th>${escapeHtml(t('title'))}</th><th>${escapeHtml(t('status'))}</th><th>${escapeHtml(t('priority'))}</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="3" class="muted">${isRtl ? 'لا توجد بيانات' : 'No data'}</td></tr>`}</tbody>
        </table>`);
    }

    if (activeCategory === 'commitments' || activeCategory === 'all') {
      const rows = data.commitments.map((c: any) => `
        <tr>
          <td>${escapeHtml(isRtl ? c.nameAr : c.nameEn)}</td>
          <td>${escapeHtml(t(c.status))}</td>
          <td>${escapeHtml(c.expiryDate || '')}</td>
        </tr>`).join('');
      sections.push(`
        <h2>${isRtl ? 'الالتزامات' : 'Commitments'}</h2>
        <table>
          <thead><tr><th>${isRtl ? 'الاسم' : 'Name'}</th><th>${escapeHtml(t('status'))}</th><th>${isRtl ? 'تاريخ الانتهاء' : 'Expiry'}</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="3" class="muted">${isRtl ? 'لا توجد بيانات' : 'No data'}</td></tr>`}</tbody>
        </table>`);
    }

    if (activeCategory === 'requests' || activeCategory === 'all') {
      const rows = data.requests.map((r: any) => `
        <tr>
          <td>${escapeHtml(r.title)}</td>
          <td>${escapeHtml(r.type)}</td>
          <td>${escapeHtml(t(r.status))}</td>
          <td>${escapeHtml(r.senderName)}</td>
          <td>${escapeHtml(r.receiverName)}</td>
        </tr>`).join('');
      sections.push(`
        <h2>${isRtl ? 'طلبات التغيير' : 'Change Requests'}</h2>
        <table>
          <thead><tr><th>${escapeHtml(t('title'))}</th><th>${isRtl ? 'النوع' : 'Type'}</th><th>${escapeHtml(t('status'))}</th><th>${isRtl ? 'المرسل' : 'Sender'}</th><th>${isRtl ? 'المستقبل' : 'Receiver'}</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5" class="muted">${isRtl ? 'لا توجد بيانات' : 'No data'}</td></tr>`}</tbody>
        </table>`);
    }

    if (activeCategory === 'frameworks' || activeCategory === 'all') {
      const summary = frameworksDetail.map(f => `
        <tr>
          <td><b>${escapeHtml(isRtl ? f.nameAr : f.nameEn)}</b></td>
          <td>${f.policiesCount}</td>
          <td>${f.standardsCount}</td>
          <td>${f.proceduresCount}</td>
          <td class="ok">${f.completed}</td>
          <td class="warn">${f.overdue}</td>
          <td><b>${f.progress}%</b></td>
        </tr>`).join('');

      sections.push(`
        <h2>${isRtl ? 'تقرير أطر العمل — ملخص' : 'Frameworks Report — Summary'}</h2>
        <table>
          <thead><tr>
            <th>${isRtl ? 'الإطار' : 'Framework'}</th>
            <th>${isRtl ? 'سياسات' : 'Policies'}</th>
            <th>${isRtl ? 'معايير' : 'Standards'}</th>
            <th>${isRtl ? 'إجراءات' : 'Procedures'}</th>
            <th>${isRtl ? 'مكتمل' : 'Done'}</th>
            <th>${isRtl ? 'متأخر' : 'Overdue'}</th>
            <th>${isRtl ? 'الالتزام %' : 'Progress %'}</th>
          </tr></thead>
          <tbody>${summary || `<tr><td colspan="7" class="muted">${isRtl ? 'لا توجد بيانات' : 'No data'}</td></tr>`}</tbody>
        </table>`);

      frameworksDetail.forEach(f => {
        if (f.policies.length === 0) return;
        const policyRows = f.policies.map((p: any) => {
          const pStdIds = mockService._standardsInPolicy(p.id);
          const pProcs = data.procedures.filter((pr: any) => pStdIds.includes(pr.standardId));
          const pProgress = mockService.getPolicyProgress(p.id);
          return `<tr>
            <td>${escapeHtml(isRtl ? p.nameAr : p.nameEn)}</td>
            <td>${pStdIds.length}</td>
            <td>${pProcs.length}</td>
            <td><b>${pProgress}%</b></td>
          </tr>`;
        }).join('');
        sections.push(`
          <h3>• ${escapeHtml(isRtl ? f.nameAr : f.nameEn)} — ${isRtl ? 'السياسات' : 'Policies'}</h3>
          <table>
            <thead><tr>
              <th>${isRtl ? 'السياسة' : 'Policy'}</th>
              <th>${isRtl ? 'معايير' : 'Std.'}</th>
              <th>${isRtl ? 'إجراءات' : 'Proc.'}</th>
              <th>${isRtl ? 'الالتزام %' : 'Progress %'}</th>
            </tr></thead>
            <tbody>${policyRows}</tbody>
          </table>`);
      });
    }

    if (activeCategory === 'risks' || activeCategory === 'all') {
      const levelLabel = (lvl: string) =>
        lvl === 'very_high' ? (isRtl ? 'مرتفع جداً' : 'Very High')
        : lvl === 'high' ? (isRtl ? 'مرتفع' : 'High')
        : lvl === 'medium' ? (isRtl ? 'متوسط' : 'Medium')
        : (isRtl ? 'منخفض' : 'Low');
      const levelClass = (lvl: string) =>
        lvl === 'very_high' || lvl === 'high' ? 'warn'
        : lvl === 'low' ? 'ok' : '';

      sections.push(`
        <h2>${isRtl ? 'إدارة المخاطر — ملخص' : 'Risk Management — Summary'}</h2>
        <table>
          <thead><tr>
            <th>${isRtl ? 'الإجمالي' : 'Total'}</th>
            <th>${isRtl ? 'مرتفع جداً' : 'Very High'}</th>
            <th>${isRtl ? 'مرتفع' : 'High'}</th>
            <th>${isRtl ? 'متوسط' : 'Medium'}</th>
            <th>${isRtl ? 'منخفض' : 'Low'}</th>
            <th>${isRtl ? 'متوسط النقاط' : 'Avg Score'}</th>
          </tr></thead>
          <tbody><tr>
            <td><b>${riskStats.total}</b></td>
            <td class="warn"><b>${riskStats.veryHigh}</b></td>
            <td class="warn">${riskStats.high}</td>
            <td>${riskStats.medium}</td>
            <td class="ok">${riskStats.low}</td>
            <td><b>${riskStats.avg}</b></td>
          </tr></tbody>
        </table>`);

      const rows = risksDetail.map(r => `
        <tr>
          <td><b>${escapeHtml(isRtl ? r.nameAr : r.nameEn)}</b></td>
          <td>${r.likelihood}</td>
          <td>${r.impact}</td>
          <td><b>${r.score}</b></td>
          <td class="${levelClass(r.level)}">${escapeHtml(levelLabel(r.level))}</td>
          <td>${r.linkedCount}</td>
          <td class="ok">${r.completedLinked}</td>
        </tr>`).join('');

      sections.push(`
        <h2>${isRtl ? 'سجل المخاطر' : 'Risk Register'}</h2>
        <table>
          <thead><tr>
            <th>${isRtl ? 'اسم الخطر' : 'Risk Name'}</th>
            <th>${isRtl ? 'الحدوث' : 'Likelihood'}</th>
            <th>${isRtl ? 'الأثر' : 'Impact'}</th>
            <th>${isRtl ? 'القيمة' : 'Score'}</th>
            <th>${isRtl ? 'المستوى' : 'Level'}</th>
            <th>${isRtl ? 'إجراءات مرتبطة' : 'Linked'}</th>
            <th>${isRtl ? 'منها مكتمل' : 'Completed'}</th>
          </tr></thead>
          <tbody>${rows || `<tr><td colspan="7" class="muted">${isRtl ? 'لا توجد بيانات' : 'No data'}</td></tr>`}</tbody>
        </table>`);
    }

    const dir = isRtl ? 'rtl' : 'ltr';
    const lang = isRtl ? 'ar' : 'en';
    const generatedLabel = isRtl ? 'تاريخ التوليد' : 'Generated';

    return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(reportTitle)} — DER3</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  body { font-family: "Segoe UI", "Tahoma", "Arial", sans-serif; color: #0f172a; margin: 0; padding: 24px; direction: ${dir}; }
  .header { display: flex; align-items: baseline; justify-content: space-between; padding-bottom: 12px; border-bottom: 2px solid #0f172a; margin-bottom: 18px; }
  .header h1 { margin: 0; font-size: 22px; }
  .header .meta { font-size: 11px; color: #64748b; }
  h2 { font-size: 15px; margin: 22px 0 8px; padding: 8px 12px; background: #0f172a; color: #fff; border-radius: 6px; }
  h3 { font-size: 13px; margin: 16px 0 6px; color: #334155; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 6px; }
  th { background: #f1f5f9; color: #0f172a; font-weight: 700; text-align: ${isRtl ? 'right' : 'left'}; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: ${isRtl ? 'right' : 'left'}; }
  tr:nth-child(even) td { background: #fafafa; }
  .ok { color: #059669; font-weight: 700; }
  .warn { color: #dc2626; font-weight: 700; }
  .muted { color: #94a3b8; text-align: center; font-style: italic; }
  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(reportTitle)}</h1>
    <div class="meta">${generatedLabel}: ${new Date().toLocaleString(isRtl ? 'ar-SA' : 'en-US')}</div>
  </div>
  ${sections.join('\n')}
  <div class="footer">DER3 Shield System</div>
</body>
</html>`;
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate generation

      if (format === 'pdf') {
        const html = buildReportHtml();
        const win = window.open('', '_blank', 'width=1024,height=768');
        if (!win) {
          toast.error(isRtl ? 'يرجى السماح بفتح النوافذ المنبثقة' : 'Please allow popups to export PDF');
          return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.focus();
        // Wait for fonts/layout, then trigger print. User picks "Save as PDF".
        setTimeout(() => {
          try { win.print(); } catch { /* noop */ }
        }, 400);
      } else {
        const wb = XLSX.utils.book_new();

        if (activeCategory === 'compliance' || activeCategory === 'all') {
          const procWS = XLSX.utils.json_to_sheet(data.procedures.map(p => ({
            [isRtl ? 'الاسم' : 'Name']: isRtl ? p.nameAr : p.nameEn,
            [isRtl ? 'الحالة' : 'Status']: t(p.status),
            [isRtl ? 'الأهمية' : 'Importance']: t(p.importance),
            [isRtl ? 'تاريخ الانتهاء' : 'Due']: p.endDate
          })));
          XLSX.utils.book_append_sheet(wb, procWS, "Procedures");
        }

        if (activeCategory === 'incidents' || activeCategory === 'all') {
          const incWS = XLSX.utils.json_to_sheet(data.incidents.map(i => ({
            [isRtl ? 'العنوان' : 'Title']: i.title,
            [isRtl ? 'الحالة' : 'Status']: t(i.status),
            [isRtl ? 'الأهمية' : 'Priority']: i.priority,
            [isRtl ? 'تاريخ البلاغ' : 'Reported At']: i.reportedAt
          })));
          XLSX.utils.book_append_sheet(wb, incWS, "Incidents");
        }

        if (activeCategory === 'commitments' || activeCategory === 'all') {
          const commWS = XLSX.utils.json_to_sheet(data.commitments.map(c => ({
            [isRtl ? 'الاسم' : 'Name']: isRtl ? c.nameAr : c.nameEn,
            [isRtl ? 'الحالة' : 'Status']: t(c.status),
            [isRtl ? 'تاريخ الانتهاء' : 'Expiry Date']: c.expiryDate || ''
          })));
          XLSX.utils.book_append_sheet(wb, commWS, "Commitments");
        }

        if (activeCategory === 'requests' || activeCategory === 'all') {
          const reqWS = XLSX.utils.json_to_sheet(data.requests.map((r: any) => ({
            [isRtl ? 'العنوان' : 'Title']: r.title,
            [isRtl ? 'النوع' : 'Type']: r.type,
            [isRtl ? 'الحالة' : 'Status']: t(r.status),
            [isRtl ? 'المرسل' : 'Sender']: r.senderName,
            [isRtl ? 'المستقبل' : 'Receiver']: r.receiverName
          })));
          XLSX.utils.book_append_sheet(wb, reqWS, "ChangeRequests");
        }

        if (activeCategory === 'frameworks' || activeCategory === 'all') {
          const fwSummary = XLSX.utils.json_to_sheet(frameworksDetail.map(f => ({
            Framework: isRtl ? f.nameAr : f.nameEn,
            Description: isRtl ? f.descriptionAr : f.descriptionEn,
            Policies: f.policiesCount,
            Standards: f.standardsCount,
            Procedures: f.proceduresCount,
            Completed: f.completed,
            InProgress: f.inProgress,
            NotStarted: f.notStarted,
            Overdue: f.overdue,
            'Progress %': f.progress
          })));
          XLSX.utils.book_append_sheet(wb, fwSummary, 'Frameworks');

          const policiesRows: any[] = [];
          frameworksDetail.forEach(f => {
            f.policies.forEach((p: any) => {
              const pStdIds = mockService._standardsInPolicy(p.id);
              const pProcs = data.procedures.filter((pr: any) => pStdIds.includes(pr.standardId));
              policiesRows.push({
                Framework: isRtl ? f.nameAr : f.nameEn,
                Policy: isRtl ? p.nameAr : p.nameEn,
                Standards: pStdIds.length,
                Procedures: pProcs.length,
                Completed: pProcs.filter((pr: any) => pr.status === 'completed').length,
                'Progress %': mockService.getPolicyProgress(p.id)
              });
            });
          });
          if (policiesRows.length) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(policiesRows), 'FW_Policies');
          }

          const standardsRows: any[] = [];
          frameworksDetail.forEach(f => {
            f.standards.forEach((s: any) => {
              const policy = data.policies.find((p: any) => p.id === s.policyId);
              standardsRows.push({
                Framework: isRtl ? f.nameAr : f.nameEn,
                Policy: policy ? (isRtl ? policy.nameAr : policy.nameEn) : '',
                Standard: isRtl ? s.nameAr : s.nameEn,
                'Progress %': mockService.getStandardProgress(s.id)
              });
            });
          });
          if (standardsRows.length) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(standardsRows), 'FW_Standards');
          }

          const proceduresRows: any[] = [];
          frameworksDetail.forEach(f => {
            f.procedures.forEach((pr: any) => {
              const std = data.standards.find((s: any) => s.id === pr.standardId);
              const policy = std ? data.policies.find((p: any) => p.id === std.policyId) : null;
              proceduresRows.push({
                Framework: isRtl ? f.nameAr : f.nameEn,
                Policy: policy ? (isRtl ? policy.nameAr : policy.nameEn) : '',
                Standard: std ? (isRtl ? std.nameAr : std.nameEn) : '',
                Procedure: isRtl ? pr.nameAr : pr.nameEn,
                Status: t(pr.status),
                Importance: pr.importance,
                StartDate: pr.startDate,
                EndDate: pr.endDate
              });
            });
          });
          if (proceduresRows.length) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(proceduresRows), 'FW_Procedures');
          }
        }

        if (activeCategory === 'risks' || activeCategory === 'all') {
          const risksWS = XLSX.utils.json_to_sheet(risksDetail.map(r => ({
            [isRtl ? 'اسم الخطر' : 'Risk Name']: isRtl ? r.nameAr : r.nameEn,
            [isRtl ? 'الحدوث' : 'Likelihood']: r.likelihood,
            [isRtl ? 'الأثر' : 'Impact']: r.impact,
            [isRtl ? 'القيمة' : 'Score']: r.score,
            [isRtl ? 'المستوى' : 'Level']: r.level,
            [isRtl ? 'إجراءات مرتبطة' : 'Linked Procedures']: r.linkedCount,
            [isRtl ? 'منها مكتمل' : 'Completed']: r.completedLinked
          })));
          XLSX.utils.book_append_sheet(wb, risksWS, 'Risks');
        }

        XLSX.writeFile(wb, `DER3_Export_${new Date().getTime()}.xlsx`);
      }
      
      toast.success(t('report_generated_success'));
    } catch (error) {
      console.error(error);
      toast.error(t('report_generation_failed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const categories = [
    { id: 'compliance', icon: Layers, label: t('compliance_report'), desc: t('compliance_report_desc'), color: 'blue' },
    { id: 'frameworks', icon: Boxes, label: isRtl ? 'تقرير أطر العمل' : 'Frameworks Report', desc: isRtl ? 'تفاصيل كاملة لأطر العمل وسياساتها ومعاييرها وإجراءاتها' : 'Full details of frameworks, policies, standards and procedures', color: 'blue' },
    { id: 'incidents', icon: ShieldAlert, label: t('incidents_report'), desc: t('incidents_report_desc'), color: 'rose' },
    { id: 'commitments', icon: Calendar, label: t('commitments_report'), desc: t('commitments_report_desc'), color: 'emerald' },
    { id: 'requests', icon: Send, label: t('requests_report'), desc: t('requests_report_desc'), color: 'indigo' },
    { id: 'risks', icon: AlertTriangle, label: isRtl ? 'تقرير إدارة المخاطر' : 'Risk Management Report', desc: isRtl ? 'سجل المخاطر مع قيمها ومستوياتها وإجراءاتها المرتبطة' : 'Risk register with scores, levels and linked procedures', color: 'rose' },
    { id: 'all', icon: FileText, label: t('all_services_report'), desc: t('all_services_report_desc'), color: 'orange' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('reports')}</h2>
          <p className="text-slate-500 font-medium">{t('generate_reports_desc')}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleExport('pdf')} 
            disabled={isGenerating}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 rounded-xl px-6 shadow-lg shadow-slate-200"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            {t('export_pdf')}
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleExport('excel')} 
            disabled={isGenerating}
            className="border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 font-bold h-11 rounded-xl px-6"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
            {t('export_excel')}
          </Button>
        </div>
      </div>

      {/* Filters — affect both display and export */}
      <Card className="border-none shadow-md rounded-2xl bg-white">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
              <Filter className="w-4 h-4 text-primary" />
              {isRtl ? 'فلاتر التقرير' : 'Report Filters'}
            </div>
            <Button variant="ghost" onClick={resetFilters} className="h-8 px-3 text-[12px] font-bold text-text-muted hover:text-rose-600">
              {isRtl ? 'إعادة تعيين' : 'Reset'}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(activeCategory === 'compliance' || activeCategory === 'frameworks' || activeCategory === 'all') && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{isRtl ? 'إطار العمل' : 'Framework'}</label>
                  <Select value={filterFramework} onValueChange={(v) => { setFilterFramework(v || 'all'); setFilterPolicy('all'); }}>
                    <SelectTrigger className="h-9 text-[12px]">
                      <SelectValue>
                        {filterFramework === 'all' ? (isRtl ? 'الكل' : 'All') : (rawData.frameworks.find(f => f.id === filterFramework)?.[isRtl ? 'nameAr' : 'nameEn'])}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                      {rawData.frameworks.map(f => <SelectItem key={f.id} value={f.id}>{isRtl ? f.nameAr : f.nameEn}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{isRtl ? 'السياسة' : 'Policy'}</label>
                  <Select value={filterPolicy} onValueChange={safeSet(setFilterPolicy)}>
                    <SelectTrigger className="h-9 text-[12px]">
                      <SelectValue>
                        {filterPolicy === 'all' ? (isRtl ? 'الكل' : 'All') : (rawData.policies.find(p => p.id === filterPolicy)?.[isRtl ? 'nameAr' : 'nameEn'])}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                      {rawData.policies
                        .filter(p => filterFramework === 'all' || p.frameworkId === filterFramework)
                        .map(p => <SelectItem key={p.id} value={p.id}>{isRtl ? p.nameAr : p.nameEn}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {(activeCategory === 'compliance' || activeCategory === 'all') && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{isRtl ? 'حالة الإجراء' : 'Procedure Status'}</label>
                <Select value={filterProcStatus} onValueChange={safeSet(setFilterProcStatus)}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue>{filterProcStatus === 'all' ? (isRtl ? 'الكل' : 'All') : t(filterProcStatus)}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                    <SelectItem value="not_started">{t('not_started')}</SelectItem>
                    <SelectItem value="in_progress">{t('in_progress')}</SelectItem>
                    <SelectItem value="completed">{t('completed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(activeCategory === 'incidents' || activeCategory === 'all') && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{isRtl ? 'حالة البلاغ' : 'Incident Status'}</label>
                  <Select value={filterIncStatus} onValueChange={safeSet(setFilterIncStatus)}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue>{filterIncStatus === 'all' ? (isRtl ? 'الكل' : 'All') : t(filterIncStatus)}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                      <SelectItem value="new">{t('new')}</SelectItem>
                      <SelectItem value="open">{t('open')}</SelectItem>
                      <SelectItem value="investigating">{isRtl ? 'قيد التحقيق' : 'Investigating'}</SelectItem>
                      <SelectItem value="resolved">{t('resolved')}</SelectItem>
                      <SelectItem value="closed">{isRtl ? 'مغلق' : 'Closed'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{isRtl ? 'الأهمية' : 'Priority'}</label>
                  <Select value={filterIncPriority} onValueChange={safeSet(setFilterIncPriority)}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue>{filterIncPriority === 'all' ? (isRtl ? 'الكل' : 'All') : filterIncPriority}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                      <SelectItem value="critical">{isRtl ? 'حرج' : 'Critical'}</SelectItem>
                      <SelectItem value="high">{isRtl ? 'عالٍ' : 'High'}</SelectItem>
                      <SelectItem value="medium">{isRtl ? 'متوسط' : 'Medium'}</SelectItem>
                      <SelectItem value="low">{isRtl ? 'منخفض' : 'Low'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {(activeCategory === 'commitments' || activeCategory === 'all') && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{isRtl ? 'حالة الالتزام' : 'Commitment Status'}</label>
                <Select value={filterCommStatus} onValueChange={safeSet(setFilterCommStatus)}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue>{filterCommStatus === 'all' ? (isRtl ? 'الكل' : 'All') : t(filterCommStatus)}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                    <SelectItem value="active">{isRtl ? 'نشط' : 'Active'}</SelectItem>
                    <SelectItem value="expiring_soon">{isRtl ? 'قارب على الانتهاء' : 'Expiring Soon'}</SelectItem>
                    <SelectItem value="expired">{isRtl ? 'منتهٍ' : 'Expired'}</SelectItem>
                    <SelectItem value="completed">{isRtl ? 'مكتمل' : 'Completed'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(activeCategory === 'requests' || activeCategory === 'all') && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{isRtl ? 'حالة الطلب' : 'Request Status'}</label>
                <Select value={filterReqStatus} onValueChange={safeSet(setFilterReqStatus)}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue>{filterReqStatus === 'all' ? (isRtl ? 'الكل' : 'All') : t(filterReqStatus)}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                    <SelectItem value="pending">{isRtl ? 'قيد المراجعة' : 'Pending'}</SelectItem>
                    <SelectItem value="approved">{isRtl ? 'موافق عليه' : 'Approved'}</SelectItem>
                    <SelectItem value="rejected">{isRtl ? 'مرفوض' : 'Rejected'}</SelectItem>
                    <SelectItem value="clarification_needed">{isRtl ? 'يحتاج توضيح' : 'Needs Clarification'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(activeCategory === 'risks' || activeCategory === 'all') && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{isRtl ? 'مستوى الخطر' : 'Risk Level'}</label>
                <Select value={filterRiskLevel} onValueChange={safeSet(setFilterRiskLevel)}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue>{filterRiskLevel === 'all' ? (isRtl ? 'الكل' : 'All') : filterRiskLevel}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                    <SelectItem value="very_high">{isRtl ? 'مرتفع جداً' : 'Very High'}</SelectItem>
                    <SelectItem value="high">{isRtl ? 'مرتفع' : 'High'}</SelectItem>
                    <SelectItem value="medium">{isRtl ? 'متوسط' : 'Medium'}</SelectItem>
                    <SelectItem value="low">{isRtl ? 'منخفض' : 'Low'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{isRtl ? 'من تاريخ' : 'From Date'}</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full h-9 px-2 text-[12px] rounded-md border border-border-subtle bg-slate-50/50" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{isRtl ? 'إلى تاريخ' : 'To Date'}</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full h-9 px-2 text-[12px] rounded-md border border-border-subtle bg-slate-50/50" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest px-1">
            {isRtl ? 'اختر نوع التقرير' : 'Select Report Type'}
          </h3>
          <div className="space-y-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={cn(
                  "w-full text-right flex items-center justify-between p-4 rounded-2xl transition-all border-2",
                  activeCategory === cat.id 
                    ? "bg-white border-primary shadow-xl shadow-primary/5 scale-[1.02]" 
                    : "bg-slate-50/50 border-transparent hover:bg-white hover:border-slate-200"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                    activeCategory === cat.id ? "bg-primary text-white" : "bg-white text-slate-400 border border-slate-100 shadow-sm"
                  )}>
                    <cat.icon className="w-6 h-6" />
                  </div>
                  <div className={isRtl ? "text-right" : "text-left"}>
                    <p className={cn("font-black text-sm", activeCategory === cat.id ? "text-primary" : "text-slate-600")}>
                      {cat.label}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold line-clamp-1 max-w-[180px]">
                      {cat.desc}
                    </p>
                  </div>
                </div>
                <ChevronRight className={cn(
                  "w-4 h-4 transition-all",
                  activeCategory === cat.id ? "text-primary translate-x-1" : "text-slate-300",
                  isRtl && activeCategory === cat.id ? "rotate-180 translate-x-[-4px]" : isRtl ? "rotate-180" : ""
                )} />
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-xl shadow-slate-100 rounded-3xl overflow-hidden bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-primary" />
                  {isRtl ? 'توزيع الحالات' : 'Status Distribution'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isRtl ? 'عرض بصري للبيانات الحالية حسب الحالة' : 'Visual breakdown of current data by status'}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center"
                      iconType="circle"
                      wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-slate-100 rounded-3xl overflow-hidden bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  {isRtl ? 'مقارنة إجمالية' : 'Overall Comparison'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isRtl ? 'إحصائيات الخدمات المكتملة مقابل الإجمالي' : 'Total counts for completed vs total services'}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: t('procedures'), total: stats.proc.total, completed: stats.proc.completed },
                      { name: t('incidents'), total: stats.inc.total, completed: stats.inc.resolved },
                      { name: t('commitments'), total: stats.comm.total, completed: stats.comm.active },
                      { name: t('requests'), total: stats.req.total, completed: stats.req.approved },
                    ]}
                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="total" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={25} />
                    <Bar dataKey="completed" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-xl shadow-slate-100 rounded-3xl bg-white overflow-hidden">
            <div className="bg-slate-900 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                  <Filter className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-black text-xl">{isRtl ? 'إحصائيات سريعة' : 'Quick Stats'}</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{activeCategory}</p>
                </div>
              </div>
            </div>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                <div className="p-8 text-center sm:text-right">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    {isRtl ? 'إجمالي العناصر' : 'Total Items'}
                  </p>
                  <h4 className="text-4xl font-black text-slate-900">
                    {activeCategory === 'compliance' ? stats.proc.total :
                     activeCategory === 'incidents' ? stats.inc.total :
                     activeCategory === 'commitments' ? stats.comm.total :
                     activeCategory === 'requests' ? stats.req.total :
                     activeCategory === 'frameworks' ? fwStats.total :
                     stats.proc.total + stats.inc.total + stats.comm.total + stats.req.total}
                  </h4>
                </div>
                <div className="p-8 text-center sm:text-right bg-emerald-50/30">
                  <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                    {isRtl ? 'مكتمل / ناجح' : 'Completed / Success'}
                  </p>
                  <h4 className="text-4xl font-black text-emerald-600">
                    {activeCategory === 'compliance' ? stats.proc.completed :
                     activeCategory === 'incidents' ? stats.inc.resolved :
                     activeCategory === 'commitments' ? stats.comm.active :
                     activeCategory === 'requests' ? stats.req.approved :
                     activeCategory === 'frameworks' ? fwStats.certified :
                     stats.proc.completed + stats.inc.resolved + stats.comm.active + stats.req.approved}
                  </h4>
                </div>
                <div className="p-8 text-center sm:text-right bg-rose-50/30">
                  <p className="text-[11px] font-black text-rose-600 uppercase tracking-widest mb-1">
                    {isRtl ? 'متأخر / مفتوح' : 'Delayed / Open'}
                  </p>
                  <h4 className="text-4xl font-black text-rose-600">
                    {activeCategory === 'compliance' ? data.procedures.filter(p => new Date(p.endDate) < new Date() && p.status !== 'completed').length :
                     activeCategory === 'incidents' ? stats.inc.open :
                     activeCategory === 'commitments' ? stats.comm.expired :
                     activeCategory === 'requests' ? stats.req.pending :
                     activeCategory === 'frameworks' ? (fwStats.inProgress + fwStats.initial) :
                     '--'}
                  </h4>
                </div>
              </div>
            </CardContent>
          </Card>

          {activeCategory === 'frameworks' && (
            <Card className="border-none shadow-xl shadow-slate-100 rounded-3xl bg-white overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-primary" />
                  {isRtl ? 'تفاصيل أطر العمل' : 'Frameworks Breakdown'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isRtl
                    ? 'كل إطار مع سياساته ومعاييره وإجراءاته ونسبة الالتزام'
                    : 'Each framework with its policies, standards, procedures and progress'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {frameworksDetail.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-sm font-bold">
                    {isRtl ? 'لا توجد أطر عمل' : 'No frameworks'}
                  </div>
                )}
                {frameworksDetail.map(f => {
                  const status = f.progress === 100
                    ? { label: isRtl ? 'معتمد' : 'Certified', cls: 'bg-emerald-100 text-emerald-700' }
                    : f.progress > 0
                      ? { label: isRtl ? 'قيد التنفيذ' : 'In Progress', cls: 'bg-blue-100 text-blue-700' }
                      : { label: isRtl ? 'لم يبدأ' : 'Initial', cls: 'bg-slate-100 text-slate-600' };
                  return (
                    <div key={f.id} className="border border-slate-200 rounded-2xl p-5 hover:border-primary/40 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <h4 className="text-base font-black text-slate-900">{isRtl ? f.nameAr : f.nameEn}</h4>
                          <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">{isRtl ? f.descriptionAr : f.descriptionEn}</p>
                        </div>
                        <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0', status.cls)}>
                          {status.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', f.progress === 100 ? 'bg-emerald-500' : f.progress > 50 ? 'bg-primary' : f.progress > 0 ? 'bg-amber-500' : 'bg-slate-300')}
                            style={{ width: `${f.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-black text-slate-900">{f.progress}%</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                        <div className="rounded-lg bg-slate-50 px-2 py-2">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isRtl ? 'سياسات' : 'Policies'}</div>
                          <div className="text-base font-black text-slate-900 mt-0.5">{f.policiesCount}</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-2 py-2">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isRtl ? 'معايير' : 'Standards'}</div>
                          <div className="text-base font-black text-slate-900 mt-0.5">{f.standardsCount}</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-2 py-2">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isRtl ? 'إجراءات' : 'Procedures'}</div>
                          <div className="text-base font-black text-slate-900 mt-0.5">{f.proceduresCount}</div>
                        </div>
                        <div className="rounded-lg bg-emerald-50 px-2 py-2">
                          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">{isRtl ? 'مكتمل' : 'Done'}</div>
                          <div className="text-base font-black text-emerald-700 mt-0.5">{f.completed}</div>
                        </div>
                        <div className="rounded-lg bg-rose-50 px-2 py-2">
                          <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">{isRtl ? 'متأخر' : 'Overdue'}</div>
                          <div className="text-base font-black text-rose-700 mt-0.5">{f.overdue}</div>
                        </div>
                      </div>

                      {f.policies.length > 0 && (
                        <details className="mt-4">
                          <summary className="cursor-pointer text-[12px] font-bold text-primary hover:underline">
                            {isRtl ? `عرض ${f.policiesCount} سياسة` : `Show ${f.policiesCount} policies`}
                          </summary>
                          <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-[12px]">
                              <thead>
                                <tr className="text-slate-500 border-b border-slate-200">
                                  <th className={cn('py-2 px-2 font-bold', isRtl ? 'text-right' : 'text-left')}>{isRtl ? 'السياسة' : 'Policy'}</th>
                                  <th className={cn('py-2 px-2 font-bold', isRtl ? 'text-right' : 'text-left')}>{isRtl ? 'معايير' : 'Std.'}</th>
                                  <th className={cn('py-2 px-2 font-bold', isRtl ? 'text-right' : 'text-left')}>{isRtl ? 'إجراءات' : 'Proc.'}</th>
                                  <th className={cn('py-2 px-2 font-bold', isRtl ? 'text-right' : 'text-left')}>{isRtl ? 'الالتزام' : 'Progress'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {f.policies.map((p: any) => {
                                  const pStdIds = mockService._standardsInPolicy(p.id);
                                  const pStds = data.standards.filter((s: any) => pStdIds.includes(s.id));
                                  const pProcs = data.procedures.filter((pr: any) => pStdIds.includes(pr.standardId));
                                  const pProgress = mockService.getPolicyProgress(p.id);
                                  return (
                                    <tr key={p.id} className="border-b border-slate-100">
                                      <td className="py-2 px-2 font-bold text-slate-700">{isRtl ? p.nameAr : p.nameEn}</td>
                                      <td className="py-2 px-2 text-slate-600">{pStds.length}</td>
                                      <td className="py-2 px-2 text-slate-600">{pProcs.length}</td>
                                      <td className="py-2 px-2">
                                        <div className="flex items-center gap-2">
                                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={cn('h-full', pProgress === 100 ? 'bg-emerald-500' : 'bg-primary')} style={{ width: `${pProgress}%` }} />
                                          </div>
                                          <span className="text-[11px] font-bold text-slate-700">{pProgress}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
