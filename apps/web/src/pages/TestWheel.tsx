import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../lib/api';

const TestWheel = () => {
  const { wheelId } = useParams<{ wheelId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Log the current URL and params
        console.log('Current URL:', window.location.href);
        console.log('Wheel ID param:', wheelId);
        
        // Try the direct company endpoint
        const response = await apiClient.get(`/public/company/${wheelId}`);
        console.log('API Response:', response);
        
        setData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching wheel:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };
    
    if (wheelId) {
      fetchData();
    }
  }, [wheelId]);

  if (loading) {
    return <div className="p-8 text-center">Loading wheel data...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-500 mb-4">Error Loading Wheel</h2>
        <p className="mb-4">{error}</p>
        <div className="bg-gray-100 p-4 rounded text-left overflow-auto">
          <pre>URL: {window.location.href}</pre>
          <pre>Wheel ID: {wheelId}</pre>
        </div>
      </div>
    );
  }

  if (data) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold mb-4">Wheel Data Loaded Successfully</h2>
        <div className="bg-gray-100 p-4 rounded text-left overflow-auto">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    );
  }

  return <div>No data available</div>;
};

export default TestWheel; 