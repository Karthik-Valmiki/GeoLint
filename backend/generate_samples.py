import os
import zipfile
import shapefile

os.makedirs('sample_data', exist_ok=True)

# 1. Create a Shapefile dataset using pyshp
# Polygon: 100m x 100m square at equator (approx 0.000898 degrees)
poly_coords = [
    [(0, 0), (0, 0.000898), (0.000898, 0.000898), (0.000898, 0), (0, 0)]
]
# LineString: 100m line
line_coords = [
    [(1, 1), (1, 1.000898)]
]
# Point
point_coord = [2, 2]

with shapefile.Writer('sample_data/test_shapefile', shapeType=shapefile.POLYGON) as w:
    w.field('name', 'C')
    w.field('desc', 'C')
    
    # Polygon 1: 100x100m
    w.poly(poly_coords)
    w.record('Test_Polygon', 'A 100x100m square')
    
    # Polygon 2: A smaller one
    w.poly([
        [(-1, -1), (-1, -0.999), (-0.999, -0.999), (-0.999, -1), (-1, -1)]
    ])
    w.record('Test_Polygon_2', 'Another polygon')

# Create .prj file manually
prj_content = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]'
with open('sample_data/test_shapefile.prj', 'w') as f:
    f.write(prj_content)

# Zip it up
with zipfile.ZipFile('sample_data/test_shapefile.zip', 'w') as zipf:
    for ext in ['shp', 'shx', 'dbf', 'prj']:
        if os.path.exists(f'sample_data/test_shapefile.{ext}'):
            zipf.write(f'sample_data/test_shapefile.{ext}', f'test_shapefile.{ext}')

# 2. Create a KML file manually
kml_content = """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Test Features</name>
    <Placemark>
      <name>KML_Polygon</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              0,0,0
              0.000898,0,0
              0.000898,0.000898,0
              0,0.000898,0
              0,0,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
    <Placemark>
      <name>KML_Line</name>
      <LineString>
        <coordinates>
          1.000898,1,0
          1.000898,1.000898,0
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>
"""

with open('sample_data/test_features.kml', 'w', encoding='utf-8') as f:
    f.write(kml_content)

print("Generated sample files successfully!")
