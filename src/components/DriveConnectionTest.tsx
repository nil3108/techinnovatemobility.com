import { useState } from 'react';
import { Database, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';

interface DriveConnectionTestProps {
  onClose: () => void;
}

export default function DriveConnectionTest({ onClose }: DriveConnectionTestProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    logs?: string[];
    driveUrl?: string;
  } | null>(null);

  const testUpload = async () => {
    setTesting(true);
    setResult(null);

    const apiUrl = localStorage.getItem('cng_google_sheets_url');
    
    if (!apiUrl) {
      setResult({
        success: false,
        message: 'Google Sheets URL not configured. Please setup Google Sheets integration first.'
      });
      setTesting(false);
      return;
    }

    const logs: string[] = [];
    logs.push('📡 Testing connection to Google Apps Script...');
    logs.push(`📍 API URL: ${apiUrl.substring(0, 50)}...`);

    try {
      // Create a small test image (1x1 red pixel)
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 1;
      testCanvas.height = 1;
      const ctx = testCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(0, 0, 1, 1);
      }
      const testDataUrl = testCanvas.toDataURL('image/jpeg');
      const testBase64 = testDataUrl.split(',')[1];

      logs.push('📝 Created test image (1x1 pixel)');

      const testDate = new Date().toISOString().split('T')[0];
      const payload = {
        action: 'uploadMedia',
        base64Data: testBase64,
        fileName: `TEST_CONNECTION_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        folderPath: 'TestUploads',
        vehiclePlate: 'TEST-VEHICLE',
        fillDate: testDate
      };

      logs.push('📦 Sending test upload request...');
      logs.push(`   Vehicle: TEST-VEHICLE`);
      logs.push(`   Date: ${testDate}`);

      await fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
      });

      logs.push('✅ Request sent successfully (no-cors mode)');
      logs.push('⏳ Waiting for server processing...');

      // Wait a bit for server to process
      await new Promise(resolve => setTimeout(resolve, 3000));

      logs.push('========================================');
      logs.push('✅ TEST COMPLETED!');
      logs.push('========================================');
      logs.push('');
      logs.push('📁 Check your Google Drive:');
      logs.push('1. Go to https://drive.google.com');
      logs.push('2. Open "CNG Flow Media" folder');
      logs.push('3. Look for "TEST-VEHICLE" folder');
      logs.push('4. Inside, find "' + testDate + '" folder');
      logs.push('5. You should see "TEST_CONNECTION_*.jpg"');
      logs.push('');
      logs.push('If folders are created, the system is working! 🎉');

      setResult({
        success: true,
        message: 'Test upload sent successfully!',
        logs,
        driveUrl: 'https://drive.google.com/drive/folders/CNG+Flow+Media'
      });

    } catch (error: any) {
      logs.push('❌ ERROR: ' + error.toString());
      setResult({
        success: false,
        message: 'Test failed: ' + error.toString(),
        logs
      });
    }

    setTesting(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Test Drive Connection</h2>
              <p className="text-xs text-slate-400">Verify Google Drive folder organization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Test Button */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-2">How it works:</h3>
            <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside">
              <li>Uploads a tiny test image to your Drive</li>
              <li>Creates folder: <code className="bg-slate-800 px-1 rounded">CNG Flow Media / TEST-VEHICLE / [today's date]</code></li>
              <li>You verify the folders were created in Google Drive</li>
            </ol>
            
            <button
              onClick={testUpload}
              disabled={testing}
              className={`w-full mt-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
                testing
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  Run Connection Test
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className={`p-4 rounded-xl border ${
              result.success 
                ? 'bg-emerald-950/30 border-emerald-800/50' 
                : 'bg-rose-950/30 border-rose-800/50'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-400" />
                )}
                <span className={`font-bold ${
                  result.success ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {result.message}
                </span>
              </div>

              {/* Logs */}
              {result.logs && (
                <div className="bg-slate-950 rounded-lg p-3 mb-3 max-h-60 overflow-y-auto">
                  <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap">
                    {result.logs.join('\n')}
                  </pre>
                </div>
              )}

              {/* Drive Link */}
              {result.success && result.driveUrl && (
                <a
                  href={result.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Google Drive
                </a>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-950/30 p-4 rounded-xl border border-blue-800/50">
            <h4 className="text-xs font-bold text-blue-400 mb-2">Expected Folder Structure:</h4>
            <div className="bg-slate-950 p-3 rounded-lg font-mono text-[10px] text-slate-400">
              📁 CNG Flow Media/<br/>
              └── 📁 TEST-VEHICLE/<br/>
                  └──  {new Date().toISOString().split('T')[0]}/<br/>
                      └──  TEST_CONNECTION_*.jpg
            </div>
            <p className="text-[10px] text-blue-300 mt-2">
              If you see this structure in your Drive, the system is working perfectly! ✅
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
