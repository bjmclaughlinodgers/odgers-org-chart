import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../../lib/supabase';
import { useUIStore } from '../../stores/uiStore';

export function LoginPage() {
  const darkMode = useUIStore(s => s.darkMode);

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-600">Supabase is not configured. Check your .env file.</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#0f1419]' : 'bg-gray-50'}`}>
      <div className={`w-full max-w-md mx-4 ${darkMode ? 'bg-[#1a2332]' : 'bg-white'} rounded-2xl shadow-xl p-8`}>
        {/* Branding Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-[#00857C] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-xl" style={{ fontFamily: "'Nunito Sans', sans-serif" }}>
              OB
            </span>
          </div>
          <h1
            className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-[#1c2431]'}`}
            style={{ fontFamily: "'Nunito Sans', sans-serif" }}
          >
            Odgers Berndtson
          </h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Workforce Planning Platform
          </p>
        </div>

        {/* Supabase Auth UI */}
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#00857C',
                  brandAccent: '#006b64',
                  inputBackground: darkMode ? '#0f1419' : '#f9fafb',
                  inputText: darkMode ? '#e5e7eb' : '#1f2937',
                  inputBorder: darkMode ? '#374151' : '#d1d5db',
                  inputBorderFocus: '#00857C',
                  inputBorderHover: '#00857C',
                },
                fonts: {
                  bodyFontFamily: "'Arimo', sans-serif",
                  buttonFontFamily: "'Nunito Sans', sans-serif",
                  inputFontFamily: "'Arimo', sans-serif",
                  labelFontFamily: "'Arimo', sans-serif",
                },
                radii: {
                  borderRadiusButton: '0.75rem',
                  buttonBorderRadius: '0.75rem',
                  inputBorderRadius: '0.75rem',
                },
              },
            },
            className: {
              container: 'auth-container',
              button: 'auth-button',
              input: 'auth-input',
            },
          }}
          theme={darkMode ? 'dark' : 'light'}
          providers={[]}
          view="sign_in"
          showLinks={false}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email address',
                password_label: 'Password',
                button_label: 'Sign In',
                email_input_placeholder: 'you@odgersberndtson.com',
                password_input_placeholder: 'Your password',
              },
            },
          }}
        />

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className={`text-xs text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Access is by invitation only. Contact your administrator for access.
          </p>
        </div>
      </div>
    </div>
  );
}
