import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Upload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const uploadFile = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    
    try {
      const response = await fetch(`${apiUrl}/api/files/`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        let errStr = 'Failed to upload file';
        try {
            const err = await response.json();
            errStr = err.detail || errStr;
        } catch(e) {}
        throw new Error(errStr);
      }
      
      const data = await response.json();
      // Navigate to status page with the ID
      navigate(`/status?id=${data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <header className="w-full bg-white border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link className="flex items-center gap-3 group" to="/">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-600/25 group-hover:bg-brand-700 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">GeoLint</span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-brand-600 border border-blue-200/60 whitespace-nowrap">GIS Engine</span>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Link className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100/70 transition" to="/">Home</Link>
            <Link className="px-4 py-2 text-sm font-semibold text-brand-700 bg-brand-50 rounded-lg border border-brand-200/60 transition" to="/upload">Upload</Link>
          </nav>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto px-6 py-10 w-full flex-1">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 mb-10 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-brand-600 ring-4 ring-brand-100 shrink-0"></div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 whitespace-nowrap">Upload</span>
                <span className="text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200/70 uppercase">Active</span>
              </div>
            </div>
            <div className="h-0.5 flex-1 bg-slate-200 mx-5 sm:mx-8"></div>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0"></div>
              <span className="text-sm font-semibold text-slate-500 whitespace-nowrap">Processing</span>
            </div>
            <div className="h-0.5 flex-1 bg-slate-200 mx-5 sm:mx-8"></div>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0"></div>
              <span className="text-sm font-semibold text-slate-500 whitespace-nowrap">Results</span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Upload geospatial data</h1>
          <p className="text-slate-500 text-base mt-2">Choose a KML file or a complete Shapefile ZIP archive to calculate feature measurements.</p>
          {error && <p className="text-red-500 text-sm mt-2 p-2 bg-red-50 rounded border border-red-200">{error}</p>}
        </div>

        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".kml,.zip" />

        {!selectedFile && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:border-slate-300 transition flex flex-col justify-between" 
                onDrop={handleDrop} onDragOver={handleDragOver}>
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="16 18 22 12 16 6"></polyline>
                        <polyline points="8 6 2 12 8 18"></polyline>
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">KML file</h2>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">.kml</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Keyhole Markup Language / Vector geometries<br />Maximum file size: 5 MB</p>
              </div>
              <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-blue-50/30 hover:border-brand-500 transition cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-brand-600 group-hover:scale-105 transition mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-800">Drag &amp; drop .kml file here</p>
                <button className="mt-4 px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-xs font-bold text-slate-700 rounded-lg shadow-sm transition" type="button">Browse KML file</button>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:border-slate-300 transition flex flex-col justify-between"
                onDrop={handleDrop} onDragOver={handleDragOver}>
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" strokeLinecap="round" strokeLinejoin="round"></path>
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Shapefile archive</h2>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">.zip</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Must include .shp, .shx, .dbf, and .prj<br />Maximum file size: 20 MB</p>
              </div>
              <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-blue-50/30 hover:border-brand-500 transition cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-brand-600 group-hover:scale-105 transition mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-800">Drag &amp; drop .zip file here</p>
                <button className="mt-4 px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-xs font-bold text-slate-700 rounded-lg shadow-sm transition" type="button">Browse ZIP file</button>
              </div>
            </div>
          </div>
        )}

        {selectedFile && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-base font-bold text-slate-900 truncate">{selectedFile.name}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{(selectedFile.size / (1024*1024)).toFixed(2)} MB</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Ready to process
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <button onClick={() => setSelectedFile(null)} disabled={isUploading} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition flex items-center gap-1.5" type="button">
                  Remove file
                </button>
                <button onClick={uploadFile} disabled={isUploading} className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm shadow-brand-600/30 transition flex items-center gap-2">
                  {isUploading ? 'Uploading...' : 'Continue to Processing'}
                  {!isUploading && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <line x1="5" x2="19" y1="12" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full bg-white border-t border-slate-200/80 py-6 mt-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-[10px]">GL</div>
            <span className="font-bold text-slate-800">GeoLint</span>
            <span className="text-slate-300">|</span>
            <span>Geospatial vector file measurement utility</span>
          </div>
          <div>Supports KML &amp; Shapefile (.shp, .shx, .dbf, .prj) · Client v1.0</div>
        </div>
      </footer>
    </>
  );
}
