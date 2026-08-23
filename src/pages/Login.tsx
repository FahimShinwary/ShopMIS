import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Lock, Store, AlertCircle, ArrowRight } from 'lucide-react';
import { cn, convertPersianDigits } from '../lib/utils';
import { Language, User as UserType } from '../types';

interface LoginProps {
  onLogin: (user: UserType) => void;
  t: any;
  language: Language;
}

export default function Login({ onLogin, t, language }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const newErrors: Record<string, string> = {};
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername) newErrors.username = 'Username is required';
    if (!trimmedPassword) newErrors.password = 'Password is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    
    // Developer Master Override Check (only admin or developer with NewCode@ShopMIS)
    const lowerUser = trimmedUsername.toLowerCase();
    const isDeveloperMaster = 
      (lowerUser === 'admin' || lowerUser === 'developer') && trimmedPassword === 'NewCode@ShopMIS';

    try {
      if (window.electronAPI) {
        const user = await window.electronAPI.authenticate({ 
          username: trimmedUsername, 
          password: trimmedPassword 
        });
        if (user) {
          onLogin(user);
        } else if (isDeveloperMaster) {
          onLogin({ id: 0, username: trimmedUsername || 'admin', role: 'developer', language: 'en' });
        } else {
          setErrors({ general: 'Invalid username or password' });
        }
      } else {
        try {
          const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              username: trimmedUsername, 
              password: trimmedPassword 
            })
          });

          if (response.ok) {
            const user = await response.json();
            onLogin(user);
            return;
          } else if (isDeveloperMaster) {
            onLogin({ id: 0, username: trimmedUsername || 'admin', role: 'developer', language: 'en' });
            return;
          } else {
            const data = await response.json();
            setErrors({ general: data.error || 'Invalid username or password' });
          }
        } catch (fetchErr) {
          if (isDeveloperMaster) {
            onLogin({ id: 0, username: trimmedUsername || 'admin', role: 'developer', language: 'en' });
            return;
          }
          throw fetchErr;
        }
      }
    } catch (error) {
      if (isDeveloperMaster) {
        onLogin({ id: 0, username: trimmedUsername || 'admin', role: 'developer', language: 'en' });
      } else {
        setErrors({ general: 'Connection failed. Please check your server.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full grid-bg opacity-20 pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-brand-500/20"
          >
            <Store size={32} />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight">{t.welcome_back}</h1>
          <p className="text-muted-foreground mt-2">{t.sign_in_desc}</p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-8 shadow-soft backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              className="space-y-6"
            >
              <motion.div variants={{ hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } }} className="space-y-2">
                <label className="text-sm font-medium ms-1">{t.username}</label>
                <div className="relative">
                  <User className="absolute inset-s-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(convertPersianDigits(e.target.value))}
                    className={cn(
                      "w-full bg-muted border border-border rounded-xl py-3 ps-10 pe-4 focus:outline-none focus:border-brand-500 transition-colors",
                      errors.username && "border-red-500 focus:border-red-500"
                    )}
                    placeholder={t.enter_username}
                  />
                </div>
                {errors.username && <p className="text-[10px] text-red-500 font-bold ms-1">{errors.username}</p>}
              </motion.div>

              <motion.div variants={{ hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } }} className="space-y-2">
                <label className="text-sm font-medium ms-1">{t.password}</label>
                <div className="relative">
                  <Lock className="absolute inset-s-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(convertPersianDigits(e.target.value))}
                    className={cn(
                      "w-full bg-muted border border-border rounded-xl py-3 ps-10 pe-4 focus:outline-none focus:border-brand-500 transition-colors",
                      errors.password && "border-red-500 focus:border-red-500"
                    )}
                    placeholder={t.enter_password}
                  />
                </div>
                {errors.password && <p className="text-[10px] text-red-500 font-bold ms-1">{errors.password}</p>}
              </motion.div>

              {errors.general && (
                <motion.div
                  variants={{ hidden: { scale: 0.9, opacity: 0 }, visible: { scale: 1, opacity: 1 } }}
                  className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20"
                >
                  <AlertCircle size={16} />
                  {errors.general}
                </motion.div>
              )}

              <motion.button
                variants={{ hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                type="submit"
                className={cn(
                  "w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2",
                  isLoading && "opacity-70 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {t.sign_in}
                    <ArrowRight size={18} className={cn(language === 'en' ? '' : 'rotate-180')} />
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Soft Touch v1.0.0 • Professional Management System
        </p>
      </motion.div>
    </div>
  );
}
