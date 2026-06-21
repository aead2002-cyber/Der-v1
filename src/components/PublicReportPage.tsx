import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShieldAlert, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  Lock,
  RefreshCw,
  Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { LookupOption } from '@/types';
import { publicApi } from '@/services/publicApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';

const PublicReportPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('other');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  
  const [humanVerified, setHumanVerified] = useState(false);
  const [verifyingHuman, setVerifyingHuman] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const mountTimeRef = React.useRef<number>(Date.now());
  const interactedRef = React.useRef<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportId, setReportId] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [lookupOptions, setLookupOptions] = useState<LookupOption[]>([]);

  useEffect(() => {
    publicApi.getLookupOptions('incident_type')
      .then(setLookupOptions)
      .catch(error => {
        console.error('Failed to load public lookup options', error);
        setLookupOptions([]);
      });
    const markInteraction = () => { interactedRef.current = true; };
    window.addEventListener('pointermove', markInteraction, { once: true });
    window.addEventListener('keydown', markInteraction, { once: true });
    window.addEventListener('touchstart', markInteraction, { once: true });
    return () => {
      window.removeEventListener('pointermove', markInteraction);
      window.removeEventListener('keydown', markInteraction);
      window.removeEventListener('touchstart', markInteraction);
    };
  }, []);

  const handleHumanCheck = () => {
    if (humanVerified || verifyingHuman) return;
    setVerifyingHuman(true);
    // Run all heuristic checks
    const elapsedMs = Date.now() - mountTimeRef.current;
    const failed =
      honeypot.length > 0 ||
      elapsedMs < 2000 ||
      !interactedRef.current;

    setTimeout(() => {
      if (failed) {
        toast.error(isRtl ? 'تعذّر التحقق. حاول مرة أخرى.' : 'Verification failed. Please try again.');
        setVerifyingHuman(false);
        return;
      }
      setHumanVerified(true);
      setVerifyingHuman(false);
    }, 600);
  };

  // Trap browser back navigation so unauthenticated reporters don't end up on
  // the login page. We push a duplicate history entry on mount, and re-push it
  // every time the user attempts to navigate back — keeping them on this page.
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const onPop = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleSubmit = async () => {
    if (!email) {
      toast.error(isRtl ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter email');
      return;
    }
    if (!humanVerified) {
      toast.error(isRtl ? 'يرجى تأكيد أنك لست روبوت' : 'Please confirm you are not a robot');
      return;
    }

    setIsSubmitting(true);

    try {
      const incident = await publicApi.createIncident({
        reporterEmail: email,
        title,
        description,
        type,
        priority,
        attachments
      });

      setReportId(incident.id);
      setStep(3);
      toast.success(isRtl ? 'طھظ… طھظ‚ط¯ظٹظ… ط§ظ„ط¨ظ„ط§ط؛ ط¨ظ†ط¬ط§ط­' : 'Report submitted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر تقديم البلاغ' : 'Failed to submit report'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-6 relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <button
        type="button"
        onClick={() => i18n.changeLanguage(isRtl ? 'en' : 'ar')}
        className="absolute top-4 end-4 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-slate-200 text-[12px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm z-10"
        title={isRtl ? 'تغيير اللغة' : 'Change Language'}
      >
        🌐 {isRtl ? 'English' : 'العربية'}
      </button>
      <Card className="w-full max-w-5xl border-none shadow-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
        <div className="h-2 bg-[#1e293b]" />

        <CardHeader className="text-center pb-4 pt-6">
          <div className="flex justify-center mb-2">
            <Logo size="lg" />
          </div>
          <CardTitle className="text-xl font-black text-slate-900 tracking-tight">
            {t('incident_report_title')}
          </CardTitle>
          <CardDescription className="text-slate-500 font-medium max-w-lg mx-auto text-sm">
            {t('incident_report_desc')}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-2">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRtl ? -20 : 20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"
              >
                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">{t('incident_type')} <span className="text-red-500">*</span></Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger className="border-slate-200 h-11 rounded-xl">
                        <SelectValue placeholder={t('incident_type')}>
                          {(() => {
                            if (!type) return t('incident_type');
                            if (type === 'other') return t('other');
                            const m = lookupOptions.find(o => o.category === 'incident_type' && o.value === type);
                            return m ? (isRtl ? m.labelAr : m.labelEn) : type;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {lookupOptions.filter(o => o.category === 'incident_type' && o.isActive).map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {isRtl ? option.labelAr : option.labelEn}
                          </SelectItem>
                        ))}
                        <SelectItem value="other">{t('other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">{t('priority_estimated')} <span className="text-red-500">*</span></Label>
                    <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                      <SelectTrigger className="border-slate-200 h-11 rounded-xl">
                        <SelectValue placeholder={t('priority')}>
                          {priority ? t(priority) : t('priority')}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('low')}</SelectItem>
                        <SelectItem value="medium">{t('medium')}</SelectItem>
                        <SelectItem value="high">{t('high')}</SelectItem>
                        <SelectItem value="critical">{t('critical')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-700 font-bold">{t('incident_title')} <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder={t('incident_title')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="border-slate-200 focus:ring-red-500 h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold">{t('incident_description')} <span className="text-red-500">*</span></Label>
                  <Textarea
                    placeholder={t('incident_description')}
                    className="min-h-[100px] border-slate-200 focus:ring-red-500 rounded-xl"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">{t('contact_email')} <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Mail className={cn("absolute top-3.5 w-4 h-4 text-slate-400", isRtl ? "right-3" : "left-3")} />
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        className={cn("border-slate-200 focus:ring-red-500 h-11 rounded-xl", isRtl ? "pr-10" : "pl-10")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium italic">
                      {t('verification_description')}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 md:col-span-2">
                  <Label className="text-slate-700 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    {t('attachments_optional')}
                  </Label>
                  
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-2 shadow-sm">
                        <span className="truncate max-w-[150px]">{file}</span>
                        <button 
                          onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="relative">
                    <input 
                      type="file" 
                      id="file-upload" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsUploading(true);
                          publicApi.uploadFile(file)
                            .then(uploaded => {
                              setAttachments(prev => [...prev, uploaded.url]);
                              toast.success(isRtl ? 'طھظ…طھ ط¥ط¶ط§ظپط© ط§ظ„ظ…ط±ظپظ‚' : 'Attachment added');
                            })
                            .catch(error => {
                              toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر رفع المرفق' : 'Failed to upload attachment'));
                            })
                            .finally(() => {
                              e.target.value = '';
                              setIsUploading(false);
                            });
                        }
                      }}
                    />
                    <Button 
                      variant="outline" 
                      nativeButton={false}
                      className="w-full border-dashed border-slate-300 bg-white hover:bg-slate-50 h-10 text-slate-500 rounded-xl cursor-pointer"
                    >
                      <label htmlFor="file-upload" className="cursor-pointer flex items-center justify-center gap-2 w-full h-full">
                        {isUploading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4" />
                            {t('add_attachment')}
                          </>
                        )}
                      </label>
                    </Button>
                  </div>
                </div>

                {/* Verification Section */}
                <div className="space-y-4 border-t border-slate-100 pt-4 md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                    <div className="md:col-span-2 flex items-center justify-between px-1">
                      <Label className="text-slate-700 font-bold flex items-center gap-2">
                        <Lock className="w-4 h-4 text-slate-400" />
                        {t('bot_protection')}
                        <span className="text-red-500">*</span>
                      </Label>
                    </div>

                    {/* Honeypot — invisible to humans, bots auto-fill */}
                    <div className="absolute opacity-0 pointer-events-none" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto' }}>
                      <label>
                        Website
                        <input
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          value={honeypot}
                          onChange={(e) => setHoneypot(e.target.value)}
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={handleHumanCheck}
                      disabled={humanVerified || verifyingHuman}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 h-12 rounded-xl border-2 transition-all',
                        humanVerified
                          ? 'bg-emerald-50 border-emerald-300 cursor-default'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <div
                        className={cn(
                          'w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                          humanVerified ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'
                        )}
                      >
                        {verifyingHuman ? (
                          <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                        ) : humanVerified ? (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : null}
                      </div>
                      <span className={cn('text-sm font-bold', humanVerified ? 'text-emerald-700' : 'text-slate-700')}>
                        {humanVerified
                          ? (isRtl ? 'تم التحقق بنجاح' : 'Verified successfully')
                          : verifyingHuman
                            ? (isRtl ? 'جارٍ التحقق...' : 'Verifying...')
                            : (isRtl ? 'أنا لست روبوت' : "I'm not a robot")}
                      </span>
                    </button>

                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !title || !description || !email || !humanVerified}
                      className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/10 gap-2"
                    >
                      {isSubmitting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          {isRtl ? 'إرسال البلاغ' : 'Submit Report'}
                          <Send className={cn("w-4 h-4", isRtl && "rotate-180")} />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="mx-auto w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-2 ring-8 ring-emerald-50/50">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                    {t('thank_you')}
                  </h3>
                  <p className="text-slate-500 font-medium max-w-sm mx-auto">
                    {t('success_report_desc')}
                  </p>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 max-w-sm mx-auto relative group overflow-hidden">
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">{t('reference_number')}</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter relative z-10 font-mono">{reportId}</p>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <Button variant="outline" onClick={() => window.location.reload()} className="h-12 border-slate-200 font-bold rounded-xl">
                    {t('submit_another_report')}
                  </Button>
                  <p className="text-[10px] text-slate-400 italic">
                    {t('incident_action_notif')}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
        
        <div className="bg-slate-50 p-6 border-t border-slate-100 text-center">
          <p className="text-[11px] font-bold text-slate-400 tracking-wider">
            {t('system_slogan')}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default PublicReportPage;
