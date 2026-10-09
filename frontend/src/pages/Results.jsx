import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export default function Results() {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get('id');

  const [fileData, setFileData] = useState(null);
  const [measurements, setMeasurements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [unit, setUnit] = useState('metric');
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!fileId) {
        setLoading(false);
        return;
    }

    const fetchData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const [fileRes, measRes] = await Promise.all([
          fetch(`${apiUrl}/api/files/${fileId}`),
          fetch(`${apiUrl}/api/files/${fileId}/measurements/`)
        ]);

        if (!fileRes.ok || !measRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const fileJson = await fileRes.json();
        const measJson = await measRes.json();

        setFileData(fileJson);
        setMeasurements(measJson);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fileId]);

  // Derived state
  const features = useMemo(() => {
    if (!measurements || !measurements.datasets || measurements.datasets.length === 0) return [];
    return measurements.datasets[0].features || [];
  }, [measurements]);

  const filteredFeatures = useMemo(() => {
    if (filter === 'all') return features;
    return features.filter(f => f.geometry_type.toLowerCase() === filter.toLowerCase() || (filter === 'linestring' && f.geometry_type.toLowerCase().includes('line')));
  }, [features, filter]);

  const paginatedFeatures = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFeatures.slice(start, start + itemsPerPage);
  }, [filteredFeatures, currentPage]);

  const totalPages = Math.ceil(filteredFeatures.length / itemsPerPage);

  const stats = useMemo(() => {
    let totalArea = 0;
    let totalLength = 0;
    
    features.forEach(f => {
      if (f.geometry_type.toLowerCase().includes('polygon') && f.measurement_value) {
        totalArea += f.measurement_value;
      }
      if (f.geometry_type.toLowerCase().includes('line') && f.measurement_value) {
        totalLength += f.measurement_value;
      }
    });

    return {
      featuresCount: features.length,
      polygonsCount: features.filter(f => f.geometry_type.toLowerCase().includes('polygon')).length,
      linesCount: features.filter(f => f.geometry_type.toLowerCase().includes('line')).length,
      pointsCount: features.filter(f => f.geometry_type.toLowerCase().includes('point')).length,
      totalArea,
      totalLength,
      crs: measurements?.datasets?.[0]?.crs_code || 'N/A'
    };
  }, [features, measurements]);

  const formatValue = (val, type, isMetric) => {
    if (val === null || val === undefined) return '—';
    if (type.toLowerCase().includes('polygon')) {
       const v = isMetric ? val : val * 10.7639;
       return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v);
    } else if (type.toLowerCase().includes('line')) {
       const v = isMetric ? val : val * 3.28084;
       return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v);
    }
    return '—';
  };

  const getUnitString = (type, isMetric) => {
    if (type.toLowerCase().includes('polygon')) return isMetric ? 'm²' : 'ft²';
    if (type.toLowerCase().includes('line')) return isMetric ? 'm' : 'ft';
    return '—';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-primary font-bold">Loading results...</div></div>;
  }

  if (error || !fileId) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans bg-surface">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
          <h2 className="text-xl font-bold mb-4">{error || 'No file selected'}</h2>
          <Link to="/upload" className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary-hover">Go to Upload</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-outline-variant shadow-xs">
        <div className="h-16 max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-white shadow-sm ring-2 ring-primary/20">
              <span className="material-symbols-outlined text-[20px]">layers</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[19px] font-extrabold text-on-surface tracking-tight">GeoLint</span>
              <span className="text-[11px] font-semibold text-primary">GIS Engine</span>
            </div>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-slate-50 transition-colors" to="/">Home</Link>
            <Link className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-slate-50 transition-colors" to="/upload">Upload</Link>
            <Link className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-slate-50 transition-colors" to={`/status?id=${fileId}`}>Status</Link>
            <Link aria-current="page" className="px-4 py-1.5 rounded-full text-sm font-bold text-primary bg-primary-container border border-blue-200 transition-colors shadow-xs" to={`/results?id=${fileId}`}>Results</Link>
          </nav>
        </div>
      </header>

      <main className="w-full pt-16 flex-1 bg-surface font-sans">
        <div className="max-w-6xl mx-auto px-6 py-8 min-h-[calc(100vh-130px)] w-full">
          <div className="flex flex-col w-full gap-y-6">
            {/* 1. Sleek Stepper */}
            <div className="w-full bg-white rounded-2xl border border-outline-variant p-4 px-6 shadow-xs flex items-center justify-between">
              <Link className="flex items-center gap-2.5 group cursor-pointer transition-opacity hover:opacity-85" to="/upload">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white shadow-xs">
                  <span className="material-symbols-outlined text-[15px] font-bold">check</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-primary transition-colors">Upload</span>
                  <span className="hidden sm:inline text-[11px] font-medium text-emerald-600">(Completed)</span>
                </div>
              </Link>
              <div className="h-[2px] flex-1 max-w-[80px] sm:max-w-[120px] bg-emerald-400 mx-3 rounded-full"></div>
              
              <Link className="flex items-center gap-2.5 group cursor-pointer transition-opacity hover:opacity-85" to={`/status?id=${fileId}`}>
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white shadow-xs">
                  <span className="material-symbols-outlined text-[15px] font-bold">check</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-primary transition-colors">Processing</span>
                  <span className="hidden sm:inline text-[11px] font-medium text-emerald-600">(Completed)</span>
                </div>
              </Link>
              <div className="h-[2px] flex-1 max-w-[80px] sm:max-w-[120px] bg-primary/40 mx-3 rounded-full"></div>
              
              <Link className="flex items-center gap-2.5 cursor-pointer" to={`/results?id=${fileId}`}>
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white shadow-xs ring-4 ring-primary/15">
                  <span className="material-symbols-outlined text-[15px] font-bold">analytics</span>
                </div>
                <span className="text-sm font-bold text-primary">Results</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-primary text-[10px] font-bold tracking-wide uppercase border border-blue-200">Active</span>
              </Link>
            </div>

            {/* 2. Dataset Header & Action Bar */}
            <div className="w-full bg-white rounded-2xl border border-outline-variant p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-on-surface tracking-tight">Measurement Results</h1>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                    <span className="material-symbols-outlined text-sm text-slate-500">folder_zip</span>
                    {fileData?.filename}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant font-medium flex items-center gap-2 flex-wrap">
                  <span>{stats.featuresCount} features detected</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="text-primary font-semibold">EPSG:{stats.crs}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified clean
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-start md:justify-end">
                <Link className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs transition-all" to="/upload">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">upload_file</span>
                  Upload another file
                </Link>
                <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/files/${fileId}/measurements/`} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 transition-all">
                  <span className="material-symbols-outlined text-[16px]">data_object</span>
                  Raw JSON
                </a>
              </div>
            </div>

            {/* 3. User-Friendly Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-outline-variant shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Features</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">category</span>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-on-surface tracking-tight">{stats.featuresCount}</span>
                  <span className="text-xs font-semibold text-slate-400">features</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-outline-variant shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Area</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">crop_free</span>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-on-surface tracking-tight">
                    {formatValue(stats.totalArea, 'polygon', unit === 'metric')} {unit === 'metric' ? 'm²' : 'ft²'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-outline-variant shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Length</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">straighten</span>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-on-surface tracking-tight">
                    {formatValue(stats.totalLength, 'line', unit === 'metric')} {unit === 'metric' ? 'm' : 'ft'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-outline-variant shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Coordinate System</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">public</span>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-primary tracking-tight">EPSG</span>
                  <span className="text-xs font-semibold text-slate-400">({stats.crs})</span>
                </div>
              </div>
            </div>

            {/* 4. Filter & Unit Switch Bar */}
            <div className="w-full bg-white rounded-2xl p-3 px-5 border border-outline-variant shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto py-0.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1.5">Filter:</span>
                
                <button onClick={() => { setFilter('all'); setCurrentPage(1); }} 
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${filter === 'all' ? 'bg-primary text-white shadow-xs' : 'bg-slate-100 text-slate-600'}`}>
                  All ({stats.featuresCount})
                </button>
                <button onClick={() => { setFilter('polygon'); setCurrentPage(1); }} 
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${filter === 'polygon' ? 'bg-primary text-white shadow-xs' : 'bg-slate-100 text-slate-600'}`}>
                  Polygons ({stats.polygonsCount})
                </button>
                <button onClick={() => { setFilter('linestring'); setCurrentPage(1); }} 
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${filter === 'linestring' ? 'bg-primary text-white shadow-xs' : 'bg-slate-100 text-slate-600'}`}>
                  Lines ({stats.linesCount})
                </button>
                <button onClick={() => { setFilter('point'); setCurrentPage(1); }} 
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${filter === 'point' ? 'bg-primary text-white shadow-xs' : 'bg-slate-100 text-slate-600'}`}>
                  Points ({stats.pointsCount})
                </button>
              </div>
              
              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Units:</span>
                <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
                  <button onClick={() => setUnit('metric')} 
                    className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${unit === 'metric' ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}>
                    Metric (m / m²)
                  </button>
                  <button onClick={() => setUnit('imperial')} 
                    className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${unit === 'imperial' ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}>
                    Imperial (ft / ft²)
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Measurement Results Table */}
            <div className="w-full bg-white rounded-2xl border border-outline-variant shadow-xs overflow-hidden flex flex-col">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-outline-variant text-slate-600 text-xs uppercase font-bold tracking-wider">
                      <th className="py-3.5 px-6 w-16">#</th>
                      <th className="py-3.5 px-6">Feature</th>
                      <th className="py-3.5 px-6">Geometry</th>
                      <th className="py-3.5 px-6 text-right">Measurement</th>
                      <th className="py-3.5 px-6">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-medium">
                    {paginatedFeatures.map((f, i) => (
                      <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-3.5 px-6 text-slate-400 font-semibold text-xs">{i + 1 + (currentPage - 1) * itemsPerPage}</td>
                        <td className="py-3.5 px-6 text-on-surface font-semibold text-sm">
                          {f.properties?.name || f.properties?.NAME || f.properties?.id || `Feature_${f.feature_index}`}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border 
                            ${f.geometry_type.toLowerCase().includes('polygon') ? 'bg-blue-50 text-primary border-blue-200' : 
                              f.geometry_type.toLowerCase().includes('line') ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 
                              'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full 
                              ${f.geometry_type.toLowerCase().includes('polygon') ? 'bg-primary' : 
                                f.geometry_type.toLowerCase().includes('line') ? 'bg-indigo-600' : 
                                'bg-slate-500'}`}></span>
                            {f.geometry_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right tabular-nums text-slate-900 font-bold">
                          {formatValue(f.measurement_value, f.geometry_type, unit === 'metric')}
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 font-medium text-xs">
                          {getUnitString(f.geometry_type, unit === 'metric')}
                        </td>
                      </tr>
                    ))}
                    {paginatedFeatures.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-500">No features found matching this filter.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 0 && (
                <div className="px-6 py-4 bg-slate-50/90 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <span>Showing <span className="text-slate-900 font-bold">{Math.min(filteredFeatures.length, (currentPage - 1) * itemsPerPage + 1)}–{Math.min(filteredFeatures.length, currentPage * itemsPerPage)}</span> of <span className="text-slate-900 font-bold">{filteredFeatures.length}</span> features</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 h-8 rounded-lg flex items-center gap-1 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50">
                      Prev
                    </button>
                    <span className="px-3 text-xs font-bold">Page {currentPage} of {totalPages}</span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 h-8 rounded-lg flex items-center gap-1 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50">
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      <footer className="w-full border-t border-outline-variant bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary text-white flex items-center justify-center font-bold text-[10px]">GL</div>
            <span className="font-bold text-on-surface">GeoLint</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Geospatial vector file measurement utility</span>
          </div>
          <span className="text-slate-400">Supports KML &amp; Shapefile</span>
        </div>
      </footer>
    </>
  );
}
