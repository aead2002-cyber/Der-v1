import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, ArrowRight, ArrowLeft, Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { mockService } from '@/services/mockService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

import { Logo } from './Logo';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotPassOpen, setIsForgotPassOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);

  const isRtl = i18n.language === 'ar';

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const result = await mockService.sendOTP(email, password);
    setLoading(false);
    if (result.ok && result.bypass) {
      toast.success(isRtl ? 'تم تسجيل الدخول بنجاح' : 'Login successful');
      window.location.href = '/my-tasks';
      return;
    }
    if (result.ok) {
      setStep('otp');
      toast.success(isRtl ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Verification code sent to your email');
    } else if (result.reason === 'email_failed') {
      toast.error(isRtl ? 'تعذّر إرسال الرمز عبر البريد — راجع إعدادات SMTP' : 'Could not send code by email — check SMTP settings');
    } else {
      toast.error(isRtl ? 'خطأ في البريد الإلكتروني أو كلمة المرور' : 'Invalid email or password');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    
    setIsResetLoading(true);
    try {
      const success = await mockService.requestPasswordReset(resetEmail);
      if (success) {
        toast.success(isRtl ? 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني' : 'Reset link sent to your email');
        setIsForgotPassOpen(false);
        setResetEmail('');
      } else {
        toast.error(isRtl ? 'البريد الإلكتروني غير مسجل' : 'Email not found');
      }
    } catch (error) {
      toast.error(isRtl ? 'فشل في إرسال الرابط' : 'Failed to send reset link');
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      const user = mockService.verifyOTP(email, otp);
      setLoading(false);
      if (user) {
        toast.success(isRtl ? 'تم تسجيل الدخول بنجاح' : 'Login successful');
        window.location.href = '/my-tasks'; // Force reload to update context/layout
      } else {
        toast.error(isRtl ? 'رمز التحقق غير صحيح أو انتهت صلاحيته' : 'Invalid or expired verification code');
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <button
        type="button"
        onClick={() => i18n.changeLanguage(isRtl ? 'en' : 'ar')}
        className="absolute top-4 end-4 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-slate-200 text-[12px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
        title={isRtl ? 'تغيير اللغة' : 'Change Language'}
      >
        🌐 {isRtl ? 'English' : 'العربية'}
      </button>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="xl" />
          </div>
        </div>

        <Card className="border-none shadow-2xl shadow-blue-900/5">
          <CardHeader className="space-y-1 pt-8">
            <CardTitle className="text-2xl font-bold text-center">
              {step === 'email' ? t('login') : t('2_step_verification')}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 'email' 
                ? t('enter_email_to_continue')
                : t('code_sent_to', { email })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-8">
            <AnimatePresence mode="wait">
              {step === 'email' ? (
                <motion.form
                  key="email-form"
                  initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? -20 : 20 }}
                  onSubmit={handleSendOTP}
                  className="space-y-4"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold block mb-1 text-sm">{t('email')} <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3 transition-colors group-focus-within:text-blue-500" />
                        <Input
                          type="email"
                          placeholder="admin@der3.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="pl-10 rtl:pl-3 rtl:pr-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                          id="email-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold block mb-1 text-sm">{t('password')} <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3 transition-colors group-focus-within:text-blue-500" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder={t('password')}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pl-10 pr-10 rtl:pl-10 rtl:pr-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                          id="password-input"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 rtl:right-auto rtl:left-3"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex justify-start">
                        <button 
                          type="button" 
                          onClick={() => setIsForgotPassOpen(true)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          {t('forgot_password')}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 px-1 italic">
                        {isRtl ? 'الحسابات الجديدة بدون باسورد: استخدم password123 ثم غيّرها' : 'New accounts without a password: use password123, then change it'}
                      </p>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : t('send_otp')}
                    {!loading && (isRtl ? <ArrowLeft className="w-4 h-4 mr-2 ml-auto" /> : <ArrowRight className="w-4 h-4 ml-2" />)}
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  key="otp-form"
                  initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? -20 : 20 }}
                  onSubmit={handleVerifyOTP}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
                      <Input
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                        maxLength={6}
                        className="pl-10 rtl:pl-3 rtl:pr-10 h-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 tracking-[0.5em] text-center font-mono text-lg"
                        id="otp-input"
                      />
                    </div>
                    <p className="text-[11px] text-center text-muted-foreground">
                      {isRtl ? 'تحقق من بريدك الإلكتروني للحصول على الرمز' : 'Check your email for the verification code'}
                    </p>
                  </div>
                  <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : t('verify_and_sign_in')}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full h-11 text-muted-foreground hover:text-blue-600" 
                    onClick={() => setStep('email')}
                    disabled={loading}
                    id="back-button"
                  >
                    {t('back')}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pb-8 pt-4">
            <div className="text-xs text-center text-gray-400">
              {t('terms_of_service_agree')}
            </div>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Forgot Password Dialog */}
      <Dialog open={isForgotPassOpen} onOpenChange={setIsForgotPassOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="h-1.5 bg-blue-600 w-full" />
          <form onSubmit={handleForgotPassword}>
            <div className="p-8 space-y-6">
              <DialogHeader>
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                  <KeyRound className="w-6 h-6 text-blue-600" />
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
                  {t('reset_password')}
                </DialogTitle>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {t('reset_password_desc')}
                </p>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    {t('email')}
                  </Label>
                  <div className="relative">
                    <Mail className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400", isRtl ? "right-3" : "left-3")} />
                    <Input 
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      className={cn("rounded-xl border-slate-200 h-11 focus:ring-blue-600", isRtl ? "pr-10" : "pl-10")}
                      placeholder="admin@der3.com"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 pt-0 flex flex-col sm:flex-row gap-3">
              <Button 
                type="submit" 
                disabled={isResetLoading}
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 shadow-lg shadow-blue-600/20"
              >
                {isResetLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  t('send_reset_link')
                )}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsForgotPassOpen(false)}
                className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold h-11"
              >
                {t('cancel')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
