import json
import geopandas as gpd
from shapely.geometry import Point, Polygon

# 1. Carica le frazioni (Punti)
with open('frazioni.json', 'r', encoding='utf-8') as f:
    frazioni_data = json.load(f)

# Converti le coordinate in oggetti Point di Shapely
frazioni_points = [
    {
        "nome_frazione": d["name"], 
        "tipo": d["tipo"], 
        "geometry": Point(d["lng"], d["lat"])
    }
    for d in frazioni_data
]
gdf_frazioni = gpd.GeoDataFrame(frazioni_points, crs="EPSG:4326")

# 2. Carica le zone (Poligoni)
with open('zone.json', 'r', encoding='utf-8') as f:
    zone_data = json.load(f)

zone_polygons = []
for z in zone_data:
    # Il primo elemento di 'rings' è l'anello esterno del poligono
    try:
        poly = Polygon(z["rings"][0])
        zone_polygons.append({
            "id_zona": z["id"],
            "nome_zona": z["name"],
            "geometry": poly
        })
    except (KeyError, IndexError, TypeError):
        continue # Salta le feature senza geometrie valide

gdf_zone = gpd.GeoDataFrame(zone_polygons, crs="EPSG:4326")

# 3. SPATIAL JOIN: Trova in quale Zona cade ogni Frazione
# predicate="within" allinea automaticamente le coordinate.
allineamento = gpd.sjoin(gdf_frazioni, gdf_zone, how="inner", predicate="within")

# 4. Risultato: Dataset pulito con Frazione e la sua Zona di appartenenza
df_risultato = allineamento[['nome_frazione', 'tipo', 'nome_zona', 'id_zona']]
print(df_risultato.head(10))

# Opzionale: Esporta il dizionario allineato in un nuovo JSON
df_risultato.to_json("frazioni_allineate_per_zona.json", orient="records", force_ascii=False)