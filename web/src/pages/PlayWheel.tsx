import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const PlayWheel = () => {
  const { companyId, wheelId } = useParams<{ companyId: string; wheelId: string }>();
  const navigate = useNavigate();
  
  // Add debug logging for route parameters
  useEffect(() => {
    console.log('PlayWheel mounted with params:', { companyId, wheelId });
    console.log('Current URL:', window.location.href);
  }, [companyId, wheelId]);
  
  const [formData, setFormData] = useState<Record<string, string>>({});

  return (
    <div>PlayWheel component</div>
  );
};

export default PlayWheel; 