import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

export default function Status() {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get('id');
  const navigate = useNavigate();

  const [fileData, setFileData] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!fileId) return;

    let interval;
    const fetchStatus = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/files/${fileId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch file status');
        }
        const data = await res.json();
        setFileData(data);

        // Map status to progress
        if (data.status === 'PENDING') setProgress(10);
        else if (data.status === 'PROCESSING') setProgress(60);
        else if (data.status === 'COMPLETED') {
          setProgress(100);
          // Auto redirect to results after a short delay
          setTimeout(() => navigate(`/results?id=${fileId}`), 1500);
          clearInterval(interval);
        } else if (data.status === 'FAILED') {
          setProgress(100);
          setError(data.error_message || 'Processing failed.');
          clearInterval(interval);
        }
      } catch (err) {
        setError(err.message);
        clearInterval(interval);
      }
    };

    fetchStatus();
    interval = setInterval(fetchStatus, 2000);

    return () => clearInterval(interval);
  }, [fileId, navigate]);

  if (!fileId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
          <h2 className="text-xl font-bold mb-4">No file selected</h2>
          <Link to="/upload" className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl shadow-md">Go to Upload</Link>
        </div>
      </div>
    );
  }

  const isComplete = fileData?.status === 'COMPLETED';
  const isFailed = fileData?.status === 'FAILED';
  const displaySize = fileData ? (fileData.file_size_bytes / (1024 * 1024)).toFixed(2) + ' MB' : '...';

  return (
    <>
      <header className="sticky top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-border-subtle">
        <div className="h-16 max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-white shadow-md shadow-primary/25">
              <span className="material-symbols-outlined text-[20px]">layers</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-on-surface tracking-tight">GeoLint</span>
              <span className="text-[11px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10 whitespace-nowrap">GIS Engine</span>
            </div>
          </div>
          <nav className="flex items-center gap-1 md:gap-2">
            <Link className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-slate-50 transition-colors whitespace-nowrap" to="/">Home</Link>
            <Link className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-slate-50 transition-colors whitespace-nowrap" to="/upload">Upload</Link>
            <Link aria-current="page" className="px-3.5 py-1.5 rounded-lg text-sm font-semibold text-primary bg-primary-light/80 transition-colors whitespace-nowrap" to="/status">Status</Link>
          </nav>
        </div>
      </header>

      <main className="w-full flex-1 flex flex-col items-center justify-center py-10 px-6 min-h-[calc(100vh-140px)] bg-surface">
        <div className="w-full max-w-2xl flex flex-col">
          <div className="w-full mb-8">
            <div className="bg-white rounded-2xl p-5 border border-border-subtle shadow-sm">
              <div className="flex items-center justify-between text-center relative px-6">
                <div className="absolute left-20 right-20 top-1/2 -translate-y-1/2 h-0.5 bg-slate-100 -z-0">
                  <div className={`h-full bg-gradient-to-r from-emerald-500 to-primary transition-all duration-500 ${isComplete ? 'w-full' : 'w-1/2'}`}></div>
                </div>
                <Link className="relative z-10 flex flex-col items-center gap-2 bg-white px-3 hover:opacity-80 transition-opacity" to="/upload">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Upload</span>
                </Link>
                <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-3">
                  <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center shadow-md ${isComplete ? 'bg-emerald-500' : isFailed ? 'bg-red-500' : 'bg-primary ring-4 ring-primary-light'}`}>
                    <span className={`material-symbols-outlined text-[16px] ${(!isComplete && !isFailed) ? 'animate-spin' : ''}`}>
                      {isComplete ? 'check' : isFailed ? 'error' : 'progress_activity'}
                    </span>
                  </div>
                  <span className={`text-xs font-bold whitespace-nowrap ${isComplete ? 'text-emerald-600' : isFailed ? 'text-red-500' : 'text-primary'}`}>
                    {isComplete ? 'Completed' : isFailed ? 'Failed' : 'Processing'}
                  </span>
                </div>
                <Link className={`relative z-10 flex flex-col items-center gap-2 bg-white px-3 transition-opacity ${isComplete ? 'opacity-100' : 'opacity-60 pointer-events-none'}`} to={`/results?id=${fileId}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isComplete ? 'bg-primary text-white shadow-md shadow-primary/30 ring-4 ring-primary-light' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                    <span className="material-symbols-outlined text-[18px]">analytics</span>
                  </div>
                  <span className={`text-xs whitespace-nowrap ${isComplete ? 'font-bold text-primary' : 'font-medium text-slate-400'}`}>Results</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="w-full bg-white rounded-2xl p-6 sm:p-8 border border-border-subtle shadow-card flex flex-col gap-6 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isFailed ? 'from-red-500 to-red-600' : isComplete ? 'from-emerald-400 to-emerald-500' : 'from-blue-600 via-primary to-indigo-600'}`}></div>
            
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border ${isFailed ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-primary border-blue-100'}`}>
                  <span className="material-symbols-outlined text-[26px]">folder_zip</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">{fileData?.filename || 'Loading...'}</h2>
                  </div>
                  <span className="text-xs sm:text-sm text-slate-500 font-medium">{displaySize} · Uploaded</span>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs tracking-wide shadow-sm font-semibold ${isComplete ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isFailed ? 'bg-red-50 text-red-700 border-red-200' : 'bg-badge-blue-bg text-badge-blue-text border-blue-200/60'}`}>
                {(!isComplete && !isFailed) && <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>}
                <span className="whitespace-nowrap">{fileData?.status || 'INITIALIZING'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 py-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold text-slate-800">
                    {isComplete ? 'Processing complete!' : isFailed ? 'Processing failed' : 'Processing your file...'}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-extrabold tracking-tight ${isFailed ? 'text-red-500' : 'text-primary'}`}>{progress}%</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 p-0.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${isFailed ? 'bg-red-500' : 'bg-gradient-to-r from-blue-600 to-primary'}`} style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium pt-1">
                {isComplete ? 'Calculations are ready.' : isFailed ? error : 'Calculating areas and boundary distances. This will only take a moment.'}
              </p>
            </div>

            {(!isComplete && !isFailed) && (
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] text-primary shrink-0">info</span>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">Calculations will update automatically once complete.</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Link className="px-4 py-2.5 text-slate-500 hover:text-slate-800 rounded-xl text-xs sm:text-sm font-medium transition-colors" to="/upload">
                {isComplete || isFailed ? 'Go Back' : 'Cancel'}
              </Link>
              <Link 
                className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all ${isComplete ? 'bg-primary hover:bg-primary-hover text-white shadow-primary/25 cursor-pointer' : 'bg-slate-100 text-slate-400 pointer-events-none'}`} 
                to={`/results?id=${fileId}`}>
                <span className="whitespace-nowrap">View Results</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-border-subtle bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-[16px]">layers</span>
            </div>
            <span className="font-bold text-slate-800 tracking-tight">GeoLint</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Geospatial vector file measurement utility</span>
          </div>
          <span className="text-slate-400">GeoLint — Precision Geospatial Intelligence Engine</span>
        </div>
      </footer>
    </>
  );
}
