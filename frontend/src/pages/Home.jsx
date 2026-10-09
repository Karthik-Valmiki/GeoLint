import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      {/* Top Google-style Navigation Bar */}
<header className="fixed top-0 left-0 right-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-[#e3e8ee] transition-all">
<div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
{/* Brand Logo */}
<Link className="flex items-center gap-3 shrink-0" to="/">
<div className="w-9 h-9 rounded-full bg-[#1a73e8] flex items-center justify-center text-white shadow-sm shadow-[#1a73e8]/30">
<span className="material-symbols-outlined text-[20px]">polyline</span>
</div>
<div className="flex items-center gap-2">
<span className="font-bold text-[19px] tracking-tight text-[#202124]">GeoLint</span>
<span className="hidden sm:inline-block text-[11px] font-semibold text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-0.5 rounded-full">Measurement Engine</span>
</div>
</Link>
{/* Google-style Pill Navigation Tabs */}
<nav className="flex items-center gap-1 bg-[#f1f3f4] p-1 rounded-full text-sm font-medium text-[#5f6368]">
<Link className="px-4 py-1.5 rounded-full text-[#1a73e8] bg-white font-semibold shadow-sm transition-all" to="/">Home</Link>
<Link className="px-4 py-1.5 rounded-full hover:text-[#202124] hover:bg-white/60 transition-all" to="/upload">Upload</Link>
<Link className="px-4 py-1.5 rounded-full hover:text-[#202124] hover:bg-white/60 transition-all" to="/status">Status</Link>
<Link className="px-4 py-1.5 rounded-full hover:text-[#202124] hover:bg-white/60 transition-all" to="/results">Results</Link>
</nav>
{/* Action Area */}
<div className="flex items-center gap-3 shrink-0">
<Link className="inline-flex items-center gap-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium text-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-sm hover:shadow transition-all" to="/upload">
<span className="">Upload Files</span>
<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
</Link>
</div>
</div>
</header>
{/* Main Hero & Content */}
<main className="w-full pt-16 flex-1" id="home">
{/* Hero Introductory Section */}
<div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-8 text-center">
{/* Human-friendly Pill Badges */}
<div className="inline-flex items-center gap-2 bg-white border border-[#e3e8ee] px-4 py-1.5 rounded-full shadow-sm mb-6 text-xs text-[#5f6368]">
<span className="flex items-center gap-1.5 font-medium text-[#1a73e8]">
<span className="material-symbols-outlined text-[16px]">verified</span>
          Free Web Utility
        </span>
<span className="text-[#dadce0]">•</span>
<span className="">No Sign-in Required</span>
<span className="text-[#dadce0]">•</span>
<span className="text-[#137333] font-medium flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-[#34a853]"></span>
          Private in Your Browser
        </span>
</div>
{/* Headline & Subtitle */}
<h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#202124] tracking-tight leading-[1.12] mx-auto">
        Measure your geospatial data with precision.
      </h1>
<p className="mt-5 text-base sm:text-lg text-[#5f6368] max-w-2xl mx-auto leading-relaxed">
        Upload KML files or Shapefile ZIP archives to instantly calculate accurate boundary areas and route distances. All calculations happen privately and securely on your own computer.
      </p>
{/* Action Buttons */}
<div className="flex flex-wrap items-center justify-center gap-3.5 mt-8">
<Link className="inline-flex items-center gap-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-semibold px-7 py-3.5 rounded-full shadow-md shadow-[#1a73e8]/25 hover:shadow-lg transition-all" to="/upload">
<span className="">Upload Files</span>
<span className="material-symbols-outlined text-[19px]">cloud_upload</span>
</Link>
<Link className="inline-flex items-center gap-2 bg-white hover:bg-[#f8fafd] text-[#3c4043] border border-[#dadce0] hover:border-[#bdc1c6] text-sm font-semibold px-6 py-3.5 rounded-full shadow-sm transition-all" to="#overview">
<span className="material-symbols-outlined text-[19px] text-[#1a73e8]">explore</span>
<span className="">See How It Works</span>
</Link>
</div>
{/* Scroll Prompt */}
<div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-[#70757a]">
<span className="">Scroll to see sample output and format guide</span>
<span className="material-symbols-outlined text-[16px] animate-bounce">arrow_downward</span>
</div>
</div>
{/* Shrinking Showcase Container */}
<div className="w-full relative px-4 sm:px-6 md:px-8 max-w-6xl mx-auto" id="showcaseStage">
<div className="w-full mx-auto bg-white rounded-3xl border border-[#e3e8ee] google-elevation-hero p-3 sm:p-5" id="heroShowcaseWrapper" style={{"transform": "scale(1)", "borderRadius": "24px"}}>
{/* Clean Google Workspace style Window Chrome */}
<div className="flex items-center justify-between px-3 py-2.5 border-b border-[#f1f3f4] bg-[#f8fafd] rounded-2xl mb-3">
<div className="flex items-center gap-2">
<span className="w-3 h-3 rounded-full bg-[#ea4335]/80"></span>
<span className="w-3 h-3 rounded-full bg-[#fbbc05]/80"></span>
<span className="w-3 h-3 rounded-full bg-[#34a853]/80"></span>
<div className="h-4 w-px bg-[#dadce0] mx-1.5"></div>
<div className="flex items-center gap-1.5 text-xs font-medium text-[#5f6368]">
<span className="material-symbols-outlined text-[16px] text-[#1a73e8]">map</span>
<span className="">sample_cadastral_parcel_boundary.kml</span>
</div>
</div>
<div className="flex items-center gap-2">

<span className="hidden sm:inline-flex text-[11px] text-[#5f6368] bg-white border border-[#e3e8ee] px-2.5 py-1 rounded-full font-medium">
              WGS 84 Standard
            </span>
</div>
</div>
{/* Clean GIS Map Display */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
{/* Vector Preview Surface */}
<div className="lg:col-span-8 bg-[#f8fafd] rounded-2xl border border-[#e3e8ee] relative p-4 overflow-hidden blueprint-grid flex flex-col justify-between min-h-[340px]">
{/* Top GIS Map Status Header */}
<div className="flex items-center justify-between z-10">
<div className="bg-white/90 backdrop-blur-md border border-[#dadce0] rounded-xl px-3 py-1.5 shadow-sm flex items-center gap-3 text-xs">
<span className="font-bold text-[#202124] flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-[#1a73e8]"></span>
                  Boundary Polygon
                </span>
<span className="text-[#dadce0]">|</span>
<span className="text-[#5f6368]">4 Corners (Closed boundary)</span>
</div>
{/* Zoom / View Controls */}
<div className="flex items-center gap-1 bg-white border border-[#dadce0] rounded-xl p-1 shadow-sm">
<button aria-label="Zoom in" className="w-7 h-7 rounded-lg hover:bg-[#f1f3f4] flex items-center justify-center text-[#5f6368]" type="button">
<span className="material-symbols-outlined text-[16px]">add</span>
</button>
<button aria-label="Zoom out" className="w-7 h-7 rounded-lg hover:bg-[#f1f3f4] flex items-center justify-center text-[#5f6368]" type="button">
<span className="material-symbols-outlined text-[16px]">remove</span>
</button>
<span className="px-2 py-0.5 text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] rounded-md">
                  100%
                </span>
</div>
</div>
{/* Static SVG Geometry Presentation */}
<div className="my-auto py-2 flex items-center justify-center">
<svg className="w-full max-w-lg h-auto" viewBox="0 0 460 220" xmlns="http://www.w3.org/2000/svg">
<defs>
<linearGradient id="googlePolyGrad" x1="0%" x2="100%" y1="0%" y2="100%">
<stop offset="0%" stop-color="#1a73e8" stop-opacity="0.14"></stop>
<stop offset="100%" stop-color="#1a73e8" stop-opacity="0.04"></stop>
</linearGradient>
</defs>
<text fill="#9aa0a6" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" x="12" y="22">42°21'30"N</text>
<text fill="#9aa0a6" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" x="12" y="210">42°21'00"N</text>
<text fill="#9aa0a6" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" x="390" y="210">71°04'00"W</text>
{/* Polygon Area Fill */}
<polygon fill="url(#googlePolyGrad)" points="70,150 170,40 370,70 310,180" stroke="#1a73e8" strokeLinejoin="round" strokeWidth="2.2"></polygon>
{/* Segment Dimension Guides */}
<line opacity="0.6" stroke="#1a73e8" strokeDasharray="4,4" strokeWidth="1.2" x1="70" x2="170" y1="150" y2="40"></line>
<line opacity="0.6" stroke="#1a73e8" strokeDasharray="4,4" strokeWidth="1.2" x1="170" x2="370" y1="40" y2="70"></line>
{/* Dimension Callout 1 */}
<g>
<rect fill="#ffffff" height="22" rx="6" stroke="#dadce0" strokeWidth="1" width="82" x="85" y="80"></rect>
<circle cx="95" cy="91" fill="#1a73e8" r="2.5"></circle>
<text fill="#202124" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" font-weight="600" x="103" y="95">428.4 m</text>
</g>
{/* Dimension Callout 2 */}
<g>
<rect fill="#ffffff" height="22" rx="6" stroke="#dadce0" strokeWidth="1" width="82" x="245" y="42"></rect>
<circle cx="255" cy="53" fill="#1a73e8" r="2.5"></circle>
<text fill="#202124" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" font-weight="600" x="263" y="57">514.2 m</text>
</g>
{/* Central Area HUD Tag */}
<g>
<rect fill="#ffffff" height="42" rx="10" stroke="#1a73e8" strokeWidth="1.8" width="135" x="180" y="105"></rect>
<circle cx="196" cy="120" fill="#34a853" r="3"></circle>
<text fill="#1a73e8" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" font-weight="800" letter-spacing="0.03em" x="204" y="123">CALCULATED AREA</text>
<text fill="#202124" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="700" x="196" y="137">14,283.40 m²</text>
</g>
{/* Corner Points */}
<g><circle cx="70" cy="150" fill="#ffffff" r="5" stroke="#1a73e8" strokeWidth="2.5"></circle></g>
<g><circle cx="170" cy="40" fill="#ffffff" r="5" stroke="#1a73e8" strokeWidth="2.5"></circle></g>
<g><circle cx="370" cy="70" fill="#ffffff" r="5" stroke="#1a73e8" strokeWidth="2.5"></circle></g>
<g><circle cx="310" cy="180" fill="#ffffff" r="5" stroke="#1a73e8" strokeWidth="2.5"></circle></g>
</svg>
</div>
{/* Bottom Readout Bar */}
<div className="flex flex-wrap items-center justify-between text-xs text-[#5f6368] border-t border-[#dadce0]/70 pt-2 z-10">
<span className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-[15px] text-[#1a73e8]">pin_drop</span>
                Center Point: <strong className="text-[#202124]">42°21'18.4"N, 71°04'12.1"W</strong>
</span>
<span className="">Earth Curvature Corrected</span>
</div>
</div>
{/* Right Telemetry & Metric Panel */}
<div className="lg:col-span-4 flex flex-col justify-between space-y-3 bg-[#ffffff] p-4 rounded-2xl border border-[#e3e8ee]">
<div>
<div className="flex items-center justify-between mb-3">
<span className="text-xs font-bold uppercase tracking-wider text-[#1a73e8]">Measurement Summary</span>
<span className="text-[11px] text-[#5f6368] bg-[#f1f3f4] px-2 py-0.5 rounded-md font-medium">Computed</span>
</div>
{/* Metric Card 1: Area */}
<div className="bg-[#f8fafd] border border-[#e3e8ee] rounded-xl p-3 mb-2.5">
<div className="flex items-center justify-between text-xs text-[#5f6368] mb-1">
<span className="">Enclosed Area</span>
<span className="text-[10px] text-[#1a73e8] font-bold">Square Meters</span>
</div>
<div className="text-2xl font-bold text-[#202124]">14,283.4 m²</div>
<div className="mt-1 text-xs text-[#5f6368] flex items-center gap-2">
<span className="">≈ 1.43 hectares</span>
<span className="text-[#dadce0]">•</span>
<span className="">≈ 3.53 acres</span>
</div>
</div>
{/* Metric Card 2: Perimeter / Length */}
<div className="bg-[#f8fafd] border border-[#e3e8ee] rounded-xl p-3 mb-2.5">
<div className="flex items-center justify-between text-xs text-[#5f6368] mb-1">
<span className="">Total Perimeter</span>
<span className="text-[10px] text-[#34a853] font-bold">Outer Ring</span>
</div>
<div className="text-2xl font-bold text-[#202124]">514.20 m</div>
<div className="mt-1 text-xs text-[#5f6368] flex items-center gap-2">
<span className="">≈ 0.51 km</span>
<span className="text-[#dadce0]">•</span>
<span className="">≈ 1,687 ft</span>
</div>
</div>
{/* Geometry Info */}
<div className="grid grid-cols-2 gap-2 text-xs">
<div className="p-2.5 rounded-lg bg-[#f1f3f4]/70 border border-[#e3e8ee]">
<div className="text-[#5f6368]">Coordinates</div>
<div className="text-sm font-bold text-[#202124] mt-0.5">4 Points</div>
</div>
<div className="p-2.5 rounded-lg bg-[#f1f3f4]/70 border border-[#e3e8ee]">
<div className="text-[#5f6368]">Topology Check</div>
<div className="text-sm font-bold text-[#137333] mt-0.5">Valid Polygon</div>
</div>
</div>
</div>
{/* Quick Action Inside Showcase */}
<div className="pt-2 border-t border-[#f1f3f4]">
<Link className="w-full inline-flex items-center justify-center gap-2 bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors" to="/upload">
<span className="material-symbols-outlined text-[16px]">upload_file</span>
<span className="">Test With Your Own File</span>
</Link>
</div>
</div>
</div>
</div>
</div>
{/* How It Works Section */}
<div className="max-w-6xl mx-auto px-4 sm:px-6 py-16" id="overview">
<div className="text-center max-w-2xl mx-auto mb-10">
<span className="text-xs font-bold uppercase tracking-wider text-[#1a73e8] bg-[#e8f0fe] px-3 py-1 rounded-full">How it works</span>
<h2 className="text-2xl sm:text-3xl font-bold text-[#202124] mt-3 tracking-tight">Simple, private geospatial measurements</h2>
<p className="text-sm text-[#5f6368] mt-2">
          Upload your map file, let us calculate the area and distances, and view or export your results instantly.
        </p>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
{/* Step 1 */}
<div className="bg-white p-6 rounded-2xl border border-[#dadce0] hover:border-[#1a73e8] hover:shadow-md transition-all">
<div className="w-10 h-10 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-[22px]">cloud_upload</span>
</div>
<h3 className="text-lg font-bold text-[#202124] mb-2">Upload your map file</h3>
<p className="text-sm text-[#5f6368] leading-relaxed">
            Drag and drop your KML file or Shapefile ZIP archive. Files stay on your device and are never sent to external servers.
          </p>
</div>
{/* Step 2 */}
<div className="bg-white p-6 rounded-2xl border border-[#dadce0] hover:border-[#1a73e8] hover:shadow-md transition-all">
<div className="w-10 h-10 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-[22px]">straighten</span>
</div>
<h3 className="text-lg font-bold text-[#202124] mb-2">Calculate areas &amp; lengths</h3>
<p className="text-sm text-[#5f6368] leading-relaxed">
            GeoLint reads lines and polygons to determine geodesic distances and surface areas, accounting for the curvature of the Earth.
          </p>
</div>
{/* Step 3 */}
<div className="bg-white p-6 rounded-2xl border border-[#dadce0] hover:border-[#1a73e8] hover:shadow-md transition-all">
<div className="w-10 h-10 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-[22px]">download</span>
</div>
<h3 className="text-lg font-bold text-[#202124] mb-2">View &amp; export results</h3>
<p className="text-sm text-[#5f6368] leading-relaxed">
            Inspect individual shapes in metric or imperial units, copy geometry coordinates, or download clean measurement summaries.
          </p>
</div>
</div>
{/* Supported Formats Section */}
<div className="mb-16">
<div className="text-center max-w-xl mx-auto mb-8">
<span className="text-xs font-bold uppercase tracking-wider text-[#1a73e8] bg-[#e8f0fe] px-3 py-1 rounded-full">Supported Formats</span>
<h2 className="text-2xl sm:text-3xl font-bold text-[#202124] mt-3 tracking-tight">Direct Client Vector Ingestion</h2>
<p className="text-sm text-[#5f6368] mt-1.5">Compatible with the two most popular geographic vector exchange formats.</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
{/* KML Card */}
<div className="bg-white p-6 rounded-2xl border border-[#dadce0] hover:border-[#1a73e8] hover:shadow-md transition-all">
<div className="flex items-start justify-between">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#e8f0fe] flex items-center justify-center text-[#1a73e8]">
<span className="material-symbols-outlined text-[22px]">code</span>
</div>
<div>
<h3 className="font-bold text-base text-[#202124]">KML (.kml)</h3>
<div className="text-xs text-[#5f6368]">Keyhole Markup Language</div>
</div>
</div>
<span className="text-xs bg-[#f1f3f4] text-[#3c4043] px-2.5 py-1 rounded-full font-medium">Automatic</span>
</div>
<p className="text-sm text-[#5f6368] mt-4 leading-relaxed">
              Standard format exported by Google Earth, GIS software, and drone mapping tools. Reads lines, polygons, and placemarks cleanly.
            </p>
<div className="mt-4 pt-4 border-t border-[#f1f3f4] flex items-center justify-between text-xs text-[#5f6368]">
<span className="">OGC KML Standard</span>
<span className="text-[#1a73e8] font-semibold">Ready to parse</span>
</div>
</div>
{/* Shapefile ZIP Card */}
<div className="bg-white p-6 rounded-2xl border border-[#dadce0] hover:border-[#1a73e8] hover:shadow-md transition-all">
<div className="flex items-start justify-between">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#fef7e0] flex items-center justify-center text-[#b06000]">
<span className="material-symbols-outlined text-[22px]">folder_zip</span>
</div>
<div>
<h3 className="font-bold text-base text-[#202124]">Shapefile ZIP (.zip)</h3>
<div className="text-xs text-[#5f6368]">ESRI Shapefile Bundle</div>
</div>
</div>
<span className="text-xs bg-[#f1f3f4] text-[#3c4043] px-2.5 py-1 rounded-full font-medium">Auto-unpacked</span>
</div>
<p className="text-sm text-[#5f6368] mt-4 leading-relaxed">
              Simply bundle your .shp, .shx, .dbf, and .prj files together into a single ZIP archive. GeoLint extracts and reads the data automatically.
            </p>
<div className="mt-4 pt-4 border-t border-[#f1f3f4] flex items-center justify-between text-xs text-[#5f6368]">
<span className="">ESRI Shapefile Standard</span>
<span className="text-[#b06000] font-semibold">Ready to parse</span>
</div>
</div>
</div>
</div>
{/* Measurement Rules Table */}
<div className="mb-16">
<div className="bg-white rounded-2xl border border-[#dadce0] overflow-hidden shadow-sm">
<div className="bg-[#f8fafd] px-6 py-4 border-b border-[#e3e8ee] flex flex-wrap items-center justify-between gap-3">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-[#1a73e8] text-white flex items-center justify-center">
<span className="material-symbols-outlined text-[18px]">straighten</span>
</div>
<div>
<h3 className="font-bold text-[#202124] text-sm tracking-tight uppercase">Feature Measurement Reference</h3>
<p className="text-xs text-[#5f6368]">How each geometry type is measured and calculated</p>
</div>
</div>
<span className="text-xs font-medium text-[#5f6368] bg-white border border-[#dadce0] px-3 py-1 rounded-full">
              Standard Geodesic System
            </span>
</div>
<div className="overflow-x-auto">
<table className="w-full text-left text-sm">
<thead>
<tr className="bg-[#f8fafd] text-[#5f6368] text-xs border-b border-[#e3e8ee]">
<th className="py-3.5 px-6 font-semibold uppercase tracking-wider">Geometry Type</th>
<th className="py-3.5 px-6 font-semibold uppercase tracking-wider">Type</th>
<th className="py-3.5 px-6 font-semibold uppercase tracking-wider">How It Is Measured</th>
<th className="py-3.5 px-6 font-semibold uppercase tracking-wider text-right">Available Units</th>
</tr>
</thead>
<tbody className="divide-y divide-[#f1f3f4]">
<tr className="hover:bg-[#f8fafd] transition-colors">
<td className="py-4 px-6 font-medium text-[#202124] flex items-center gap-3">
<span className="w-8 h-8 rounded-lg bg-[#f1f3f4] flex items-center justify-center text-[#5f6368]">
<span className="material-symbols-outlined text-[18px]">location_on</span>
</span>
<span className="">Points</span>
</td>
<td className="py-4 px-6 text-xs text-[#5f6368]">Coordinates</td>
<td className="py-4 px-6 text-[#5f6368]">Logs latitude and longitude coordinates.</td>
<td className="py-4 px-6 text-right text-xs text-[#9aa0a6] font-medium">—</td>
</tr>
<tr className="hover:bg-[#f8fafd] transition-colors">
<td className="py-4 px-6 font-medium text-[#202124] flex items-center gap-3">
<span className="w-8 h-8 rounded-lg bg-[#e8f0fe] flex items-center justify-center text-[#1a73e8]">
<span className="material-symbols-outlined text-[18px]">show_chart</span>
</span>
<span className="">Lines &amp; Paths</span>
</td>
<td className="py-4 px-6 text-xs text-[#5f6368]">Path</td>
<td className="py-4 px-6 text-[#5f6368]">Calculates total path distance along the curvature of the Earth.</td>
<td className="py-4 px-6 text-right">
<span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                      Meters, Kilometers, Feet, Miles
                    </span>
</td>
</tr>
<tr className="hover:bg-[#f8fafd] transition-colors">
<td className="py-4 px-6 font-medium text-[#202124] flex items-center gap-3">
<span className="w-8 h-8 rounded-lg bg-[#e6f4ea] flex items-center justify-center text-[#137333]">
<span className="material-symbols-outlined text-[18px]">polyline</span>
</span>
<span className="">Polygons &amp; Boundaries</span>
</td>
<td className="py-4 px-6 text-xs text-[#5f6368]">Surface</td>
<td className="py-4 px-6 text-[#5f6368]">Calculates enclosed surface area and boundary perimeter.</td>
<td className="py-4 px-6 text-right">
<span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                      Square Meters, Hectares, Acres, Sq Km
                    </span>
</td>
</tr>
</tbody>
</table>
</div>
</div>
</div>
{/* Clean Google Product CTA Card */}
<div className="pt-4">
<div className="bg-gradient-to-r from-[#1a73e8] to-[#1557b0] text-white p-8 sm:p-10 rounded-3xl shadow-lg shadow-[#1a73e8]/20 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
<div className="space-y-2 text-center sm:text-left relative z-10">
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium">
<span className="material-symbols-outlined text-[15px]">flash_on</span>
              Fast &amp; Private
            </span>
<h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Ready to inspect your dataset?</h3>
<p className="text-sm text-blue-100 max-w-lg">Upload your KML or Shapefile bundle directly into GeoLint to get instant, accurate measurements.</p>
</div>
<Link className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-[#1a73e8] font-bold text-sm px-7 py-4 rounded-full shadow-md transition-all active:scale-95 whitespace-nowrap relative z-10" to="/upload">
<span className="">Open Upload Workspace</span>
<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
</Link>
</div>
</div>
</div>
</main>
{/* Clean Minimal Footer */}
<footer className="w-full border-t border-[#e3e8ee] bg-white">
<div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5f6368]">
<div className="flex items-center gap-2.5">
<div className="w-5 h-5 rounded-full bg-[#1a73e8] flex items-center justify-center text-white shrink-0">
<span className="material-symbols-outlined text-[13px]">polyline</span>
</div>
<span className="font-bold text-[#202124]">GeoLint</span>
<span className="text-[#dadce0]">|</span>
<span className="">Geospatial vector file measurement utility</span>
</div>
<div className="flex items-center gap-4 text-xs text-[#5f6368]">
<span className="">Supports KML &amp; Shapefile (.shp, .shx, .dbf, .prj)</span>
<span className="text-[#dadce0]">·</span>
<span className="">Standard Geodesic Earth Model</span>
</div>
</div>
</footer>
{/* Scroll-Driven Showcase Transformation Script */}

    </>
  );
}
