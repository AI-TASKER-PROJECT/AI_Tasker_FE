import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { ROUTE_PATHS } from '@/app/routes/routePaths';
import { authApi } from '@/shared/api/authApi';

export const useLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('Business');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const navigateBasedOnRole = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        navigate('/admin');
        break;
      case 'staff':
        navigate('/staff');
        break;
      case 'expert':
        navigate('/expert');
        break;
      case 'business':
      default:
        navigate(ROUTE_PATHS.business);
        break;
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');

    if (password.length < 8) {
      setErrorMsg('Mat khau phai co it nhat 8 ky tu.');
      setPassword('');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.login({ email, password, role: selectedRole });
      const { accessToken, refreshToken, fullName, role: backendRole } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userName', fullName);
      localStorage.setItem('userRole', backendRole || selectedRole);

      navigateBasedOnRole(backendRole || selectedRole);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          setErrorMsg('Email hoac mat khau khong chinh xac.');
          setPassword('');
          setEmail('');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userName');
          localStorage.removeItem('userRole');
        } else {
          setErrorMsg('Khong the ket noi den may chu. Vui long thu lai.');
        }
      } else {
        setErrorMsg('Da co loi khong xac dinh xay ra.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        setErrorMsg('');

        const response = await authApi.googleLogin(tokenResponse.access_token);
        const { accessToken, refreshToken, fullName, role: backendRole } = response.data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('userName', fullName);
        localStorage.setItem('userRole', backendRole);

        navigateBasedOnRole(backendRole);
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          if (error.response) {
            setErrorMsg(error.response.data.message || 'Xac thuc Google that bai.');
          } else {
            setErrorMsg('Khong the ket noi den may chu. Vui long thu lai sau.');
          }
        } else {
          setErrorMsg('Da co loi khi dang nhap bang Google.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setErrorMsg('Dang nhap Google bi huy hoac gap loi.');
    },
  });

  return {
    email,
    setEmail,
    password,
    setPassword,
    selectedRole,
    setSelectedRole,
    isLoading,
    errorMsg,
    handleLogin,
    handleGoogleLogin,
  };
};
