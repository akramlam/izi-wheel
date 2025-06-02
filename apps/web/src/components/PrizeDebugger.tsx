import { useState } from 'react';
import { api } from '../lib/api';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Loader2 } from 'lucide-react';

interface PrizeDebuggerProps {
  playId: string;
}

const PrizeDebugger = ({ playId }: PrizeDebuggerProps) => {
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebugger, setShowDebugger] = useState(false);

  const runDiagnostics = async () => {
    if (!playId) return;
    
    setIsDebugging(true);
    try {
      const response = await api.debugPlayId(playId);
      setDebugInfo(response);
    } catch (error) {
      console.error('Error running prize diagnostics:', error);
      setDebugInfo({ error: 'Failed to run diagnostics' });
    } finally {
      setIsDebugging(false);
    }
  };

  if (!showDebugger) {
    return (
      <div className="mt-4 text-center">
        <button
          onClick={() => setShowDebugger(true)}
          className="text-xs text-gray-400 underline hover:text-gray-600"
        >
          Debug Mode
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t pt-4">
      <div className="text-xs text-gray-500 mb-2">
        <div className="flex justify-between items-center">
          <span>Debug Mode</span>
          <button
            onClick={() => setShowDebugger(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            Hide
          </button>
        </div>
        <div>Play ID: {playId || 'Not available'}</div>
      </div>
      
      <Button
        size="sm"
        variant="outline"
        onClick={runDiagnostics}
        disabled={isDebugging || !playId}
        className="w-full text-xs"
      >
        {isDebugging ? (
          <>
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            Running Diagnostics...
          </>
        ) : (
          'Run Diagnostics'
        )}
      </Button>
      
      {debugInfo && (
        <Card className="mt-2 p-2 text-xs font-mono overflow-auto max-h-60 bg-gray-50">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
};

export default PrizeDebugger; 