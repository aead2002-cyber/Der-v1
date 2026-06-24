import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, ArrowRight, ArrowLeft, Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { authApi } from '@/services/authApi';
import { resetPasswordApi } from '@/services/resetPasswordApi';
import { tokenStorage } from '@/services/tokenStorage';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
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
  const cardTitle = 'المنصات الداخلية للغرفة';
  const cardSubtitle = 'مرحباً بك، يرجى تسجيل الدخول للوصول إلى المنصات الداخلية';
  const footerText = 'جميع الحقوق محفوظة للغرفة';

  const handleSendOTP = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!email || !password) return;

  setLoading(true);
  try {
    const result = await authApi.verify(email, password);

    if (result.ok) {
      setStep('otp');
      toast.success(
        isRtl
          ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني'
          : 'Verification code sent to your email'
      );
    } else {
      toast.error(
        result.error ||
          (isRtl
            ? 'خطأ في البريد الإلكتروني أو كلمة المرور'
            : 'Invalid email or password')
      );
    }
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : isRtl
          ? 'فشل تسجيل الدخول'
          : 'Login failed'
    );
  } finally {
    setLoading(false);
  }
};

const handleForgotPassword = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!resetEmail) return;

  setIsResetLoading(true);
  try {
    await resetPasswordApi.forgotPassword(resetEmail);
    toast.success(
      isRtl
        ? 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني'
        : 'Password reset link sent to your email'
    );
    setIsForgotPassOpen(false);
    setResetEmail('');
  } catch (error) {
    toast.error(
      isRtl
        ? 'فشل في إرسال رابط إعادة التعيين'
        : 'Failed to send reset link'
    );
  } finally {
    setIsResetLoading(false);
  }
};

const handleVerifyOTP = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!otp) return;

  setLoading(true);
  try {
    const session = await authApi.verifyOtp(email, otp);
    tokenStorage.setToken(session.token);
    tokenStorage.setUser(session.user);

    toast.success(
      isRtl
        ? 'تم تسجيل الدخول بنجاح'
        : 'Login successful'
    );

    window.location.href = '/platforms';
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : isRtl
          ? 'رمز التحقق غير صحيح أو انتهت صلاحيته'
          : 'Invalid or expired verification code'
    );
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8FAFC] px-4 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[150px]">
        <svg width="100%" height="150" viewBox="0 0 1440 150" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 h-full w-full">
          <path fill="#6F8E3D" d="M0,82 C260,50 520,56 760,80 C1000,104 1210,88 1440,50 L1440,150 L0,150 Z" />
          <path fill="#0B3768" d="M0,100 C280,82 520,88 760,108 C1010,130 1230,112 1440,72 L1440,150 L0,150 Z" />
        </svg>
      </div>

      <button
        type="button"
        onClick={() => i18n.changeLanguage(isRtl ? 'en' : 'ar')}
        className="absolute end-4 top-4 z-20 inline-flex h-9 items-center gap-1.5 rounded-full border border-gray-200 bg-white/95 px-3 text-[12px] font-bold text-[#0B3768] shadow-sm backdrop-blur hover:bg-gray-50"
        title={isRtl ? 'طھط؛ظٹظٹط± ط§ظ„ظ„ط؛ط©' : 'Change Language'}
      >
        {isRtl ? 'English' : 'AR / EN'}
      </button>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-start px-4 pt-6 pb-[150px]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex w-full max-w-[620px] flex-col items-center">
       <div className="mb-7 text-center">
  <div className="mb-4 flex justify-center">
    <img
      src="/assets/chamber-logo.png"
      alt="Almadinah Almunawarah Chamber"
      className="block h-[120px] w-auto bg-transparent object-contain shadow-none ring-0 sm:h-[170px] lg:h-[190px]"
    />
  </div>

  <h1 className="text-[30px] font-black tracking-tight text-[#0B3768] sm:text-[38px]">
    {cardTitle}
  </h1>

  <p className="mx-auto mt-2 max-w-xl text-[15px] leading-7 text-[#64748B] sm:text-[16px]">
    {cardSubtitle}
  </p>
</div>

          <Card className="w-full overflow-hidden rounded-[18px] border border-[#D9E1EA] bg-white shadow-[0_22px_55px_rgba(11,55,104,0.12)]">
            {step === 'otp' && (
              <CardHeader className="space-y-2 px-8 pt-7">
                <CardTitle className="text-center text-2xl font-black tracking-tight text-[#0B3768]">
                  {t('2_step_verification')}
                </CardTitle>
                <CardDescription className="text-center text-sm text-[#64748B]">
                  {t('code_sent_to', { email })}
                </CardDescription>
              </CardHeader>
            )}
            <CardContent className={cn('px-6 py-7 sm:px-10 sm:py-9', step === 'otp' && 'pt-4')}>
              <AnimatePresence mode="wait">
                {step === 'email' ? (
                  <motion.form
                    key="email-form"
                    initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRtl ? -20 : 20 }}
                    onSubmit={handleSendOTP}
                    className="space-y-5"
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="mb-1 block text-sm font-bold text-[#0B3768]">
                          {t('email')} <span className="text-[#6F8E3D]">*</span>
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-[#0B3768]/70 rtl:left-auto rtl:right-3" />
                          <Input
                            type="email"
                            placeholder="admin@chamber.sa"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-[52px] rounded-[14px] border-[#D9E1EA] bg-white pl-10 text-[#0B3768] placeholder:text-[#94A3B8] focus:border-[#6F8E3D] focus:ring-[#6F8E3D] rtl:pl-3 rtl:pr-10"
                            id="email-input"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="mb-1 block text-sm font-bold text-[#0B3768]">
                          {t('password')} <span className="text-[#6F8E3D]">*</span>
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-[#0B3768]/70 rtl:left-auto rtl:right-3" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder={t('password')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="h-[52px] rounded-[14px] border-[#D9E1EA] bg-white pl-10 pr-10 text-[#0B3768] placeholder:text-[#94A3B8] focus:border-[#6F8E3D] focus:ring-[#6F8E3D] rtl:pl-10 rtl:pr-10"
                            id="password-input"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-[#0B3768]/60 transition-colors hover:text-[#0B3768] rtl:right-auto rtl:left-3"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="flex justify-start">
                          <button
                            type="button"
                            onClick={() => setIsForgotPassOpen(true)}
                            className="text-sm font-semibold text-[#0B3768] transition-colors hover:text-[#6F8E3D]"
                          >
                            {t('forgot_password')}
                          </button>
                        </div>
                      </div>
                    </div>
                    <Button type="submit" className="h-[52px] w-full rounded-[14px] bg-[#0B3768] font-bold text-white shadow-lg shadow-[#0B3768]/20 transition-all hover:bg-[#082B52]" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('send_otp')}
                      {!loading && (isRtl ? <ArrowLeft className="mr-2 h-4 w-4" /> : <ArrowRight className="ml-2 h-4 w-4" />)}
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
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-[#0B3768]/70 rtl:left-auto rtl:right-3" />
                        <Input
                          type="text"
                          placeholder="123456"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          required
                          maxLength={6}
                          className="h-[52px] rounded-[14px] border-[#D9E1EA] bg-white pl-10 text-center font-mono text-lg tracking-[0.5em] text-[#0B3768] focus:border-[#6F8E3D] focus:ring-[#6F8E3D] rtl:pl-3 rtl:pr-10"
                          id="otp-input"
                        />
                      </div>
                      <p className="text-center text-[11px] text-[#0B3768]/75">
                        {isRtl ? 'تحقق من بريدك الإلكتروني للحصول على الرمز' : 'Check your email for the verification code'}
                      </p>
                    </div>
                    <Button type="submit" className="h-[52px] w-full rounded-[14px] bg-[#0B3768] font-bold text-white shadow-lg shadow-[#0B3768]/20 hover:bg-[#082B52]" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('verify_and_sign_in')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-[52px] w-full rounded-[14px] text-[#0B3768] hover:bg-gray-100 hover:text-[#6F8E3D]"
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
          </Card>

      
        </motion.div>
      </div>

      <Dialog open={isForgotPassOpen} onOpenChange={setIsForgotPassOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border border-[#D9E1EA] shadow-2xl rounded-2xl bg-white" dir={isRtl ? 'rtl' : 'ltr'}>
          <form onSubmit={handleForgotPassword}>
            <div className="p-8 space-y-6">
              <DialogHeader>
                <div className="w-12 h-12 bg-[#6F8E3D]/10 rounded-2xl flex items-center justify-center mb-4">
                  <KeyRound className="w-6 h-6 text-[#0B3768]" />
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight text-[#0B3768]">
                  {t('reset_password')}
                </DialogTitle>
                <p className="text-sm text-[#0B3768]/75 font-medium leading-relaxed">
                  {t('reset_password_desc')}
                </p>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-[#0B3768]">
                    {t('email')}
                  </Label>
                  <div className="relative">
                    <Mail className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[#0B3768]/70', isRtl ? 'right-3' : 'left-3')} />
                    <Input
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      className={cn('rounded-[14px] border-[#D9E1EA] h-[52px] bg-white text-[#0B3768] placeholder:text-[#94A3B8] focus:ring-[#6F8E3D] focus:border-[#6F8E3D]', isRtl ? 'pr-10' : 'pl-10')}
                      placeholder="admin@chamber.sa"
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
                className="flex-1 rounded-[14px] bg-[#0B3768] hover:bg-[#082B52] text-white font-bold h-[52px] shadow-lg shadow-[#0B3768]/20"
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
                className="flex-1 rounded-[14px] bg-gray-100 hover:bg-gray-200 text-[#0B3768] font-bold h-[52px]"
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
