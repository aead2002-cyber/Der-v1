import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Lock, ArrowRight, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { resetPasswordApi } from '@/services/resetPasswordApi';
import { motion } from 'motion/react';
import { Logo } from '@/shared/components/Logo';
import { PasswordRulesList, isPasswordValid } from '@/shared/components/PasswordRules';

export default function ResetPasswordPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRtl = i18n.language === 'ar';

  useEffect(() => {
    const verify = async () => {
    if (!token) {
      setError(isRtl ? 'ط±ط§ط¨ط· ط؛ظٹط± طµط§ظ„ط­' : 'Invalid link');
      setVerifying(false);
      return;
    }

    const verified = await resetPasswordApi.verifyResetToken(token);
    if (verified.success && verified.email) {
      setEmail(verified.email);
    } else {
      setError(isRtl ? 'ط§ظ†طھظ‡طھ طµظ„ط§ط­ظٹط© ط§ظ„ط±ط§ط¨ط· ط£ظˆ ط£ظ†ظ‡ ط؛ظٹط± طµط§ظ„ط­ (طµظ„ط§ط­ظٹط© ط§ظ„ط±ط§ط¨ط· 10 ط¯ظ‚ط§ط¦ظ‚)' : 'Link expired or invalid (Link is valid for 30 minutes)');
    }
    setVerifying(false);
    };

    void verify();
  }, [token, isRtl]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid(newPassword)) {
      toast.error(isRtl ? 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظ„ط§ طھط³طھظˆظپظٹ ط§ظ„ط´ط±ظˆط·' : 'Password does not meet requirements');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(isRtl ? 'ظƒظ„ظ…ط§طھ ط§ظ„ظ…ط±ظˆط± ط؛ظٹط± ظ…طھط·ط§ط¨ظ‚ط©' : 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi.completePasswordReset(token!, newPassword);
      if (true) {
        setSuccess(true);
        toast.success(isRtl ? 'طھظ…طھ ط¥ط¹ط§ط¯ط© طھط¹ظٹظٹظ† ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط¨ظ†ط¬ط§ط­' : 'Password reset successful');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        toast.error(isRtl ? 'ظپط´ظ„ ظپظٹ ط¥ط¹ط§ط¯ط© ط§ظ„طھط¹ظٹظٹظ†' : 'Failed to reset password');
      }
    } catch (err) {
      toast.error(isRtl ? 'ط­ط¯ط« ط®ط·ط£ ظ…ط§' : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="xl" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-[#111827]">DER3</h1>
          <p className="text-[#6b7280] font-medium mt-1">{t('app_slogan')}</p>
        </div>

        <Card className="border-none shadow-2xl shadow-blue-900/5">
          <CardHeader className="space-y-1 pt-8 text-center">
            <CardTitle className="text-2xl font-bold">
              {t('reset_password')}
            </CardTitle>
            <CardDescription>
              {success 
                ? t('password_updated')
                : error 
                  ? error
                  : t('set_new_password_for', { email })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-8 pb-8">
            {success ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="font-medium text-slate-600">
                  {t('redirecting_to_login')}
                </p>
                <Button onClick={() => navigate('/login')} className="w-full h-11 bg-blue-600 hover:bg-blue-700">
                  {t('go_to_login')}
                </Button>
              </div>
            ) : error ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <Button onClick={() => navigate('/login')} variant="outline" className="w-full h-11">
                  {t('back_to_login')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold block mb-1 text-sm">{t('new_password')} <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3 transition-colors" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="pl-10 pr-10 rtl:pl-10 rtl:pr-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 rtl:right-auto rtl:left-3"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {newPassword && <PasswordRulesList value={newPassword} />}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold block mb-1 text-sm">{t('confirm_password')} <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3 transition-colors" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="pl-10 pr-10 rtl:pl-10 rtl:pr-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : t('save_password')}
                  {!loading && (isRtl ? <ArrowLeft className="w-4 h-4 mr-2" /> : <ArrowRight className="w-4 h-4 ml-2" />)}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
