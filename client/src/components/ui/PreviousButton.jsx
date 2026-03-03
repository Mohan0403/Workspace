import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

const PreviousButton = ({ fallback = '/dashboard', className = '' }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallback);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleBack} className={className}>
      <ArrowLeft size={16} className="mr-2" /> Previous
    </Button>
  );
};

export default PreviousButton;
