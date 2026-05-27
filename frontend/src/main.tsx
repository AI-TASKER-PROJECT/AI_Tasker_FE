import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Import CSS chứa Tailwind

// 1. Import Provider từ thư viện Google
import { GoogleOAuthProvider } from '@react-oauth/google';

// 2. Dán Client ID bạn vừa copy từ Google Cloud Console vào biến này
const GOOGLE_CLIENT_ID = "1051064915246-c5micuon2lp4c7enn06apcm8vdqvhili.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {/* 3. Bọc GoogleOAuthProvider bao ngoài toàn bộ App */}
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);