import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/app/routes/routePaths';

export const useBusinessHome = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    navigate(ROUTE_PATHS.login);
  };

  return {
    handleLogout,
  };
};
