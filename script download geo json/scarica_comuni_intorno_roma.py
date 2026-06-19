#!/usr/bin/env python3
"""
scarica_comuni_intorno_roma.py
------------------------------
Scarica i confini dei comuni confinanti con Roma Capitale (o entro un raggio
configurabile) da OpenStreetMap via Overpass API e li salva come GeoJSON
(EPSG:4326).

Modalità disponibili (argomento --mode):
  neighbors   (default) — solo i comuni che confinano direttamente con Roma
  province    — tutti i comuni della Città Metropolitana di Roma Capitale
  radius <km> — tutti i comuni entro <km> km dal centro di Roma (lat 41.9028, lng 12.4964)

Da eseguire su una rete con accesso a overpass-api.de.

Dipendenze:
    pip install requests osm2geojson

Uso:
    python3 scarica_comuni_intorno_roma.py                          # neighbors → comuni_intorno_roma.geojson
    python3 scarica_comuni_intorno_roma.py --mode province          # → comuni_provincia_roma.geojson
    python3 scarica_comuni_intorno_roma.py --mode radius 30         # → comuni_raggio30km_roma.geojson
    python3 scarica_comuni_intorno_roma.py --mode neighbors out.geojson

Note tecniche
-------------
- In Italia i comuni hanno admin_level=8 in OSM.
- La Città Metropolitana di Roma Capitale è relation 3779786 → area 3603779786.
- I comuni confinanti vengono trovati tramite la query "around" sul perimetro
  del comune di Roma (relation 41485).
- Roma stessa viene ESCLUSA dal risultato in tutte le modalità.
- Sorgente: OpenStreetMap, licenza ODbL. Citare "© OpenStreetMap contributors".
"""

import sys
import json
import argparse
import requests
import osm2geojson

# ---------------------------------------------------------------------------
# Configurazione
# ---------------------------------------------------------------------------

OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

HEADERS = {
    "User-Agent": "comuni-intorno-roma-script/1.0 (uso GIS; contatto: tuo@indirizzo)",
    "Accept": "application/json",
}

# OSM relation id del Comune di Roma
ROMA_RELATION_ID = 41485
# admin_level della Città Metropolitana in OSM Italia (non più usato come hardcode)

# Centro geografico approssimativo di Roma (Piazza Venezia)
ROMA_LAT = 41.8955
ROMA_LNG = 12.4823

# ---------------------------------------------------------------------------
# Query Overpass
# ---------------------------------------------------------------------------

# Comuni confinanti: trova i ways del confine di Roma, poi le relation che li condividono
QUERY_NEIGHBORS = f"""
[out:json][timeout:300];
relation({ROMA_RELATION_ID})->.roma;
way(r.roma)->.confine;
relation(bw.confine)["boundary"="administrative"]["admin_level"="8"]->.all;
(.all; - relation({ROMA_RELATION_ID}););
out geom;
"""

# Tutti i comuni della Città Metropolitana:
# is_in trova l'area admin_level=6 che contiene il centro di Roma (più robusto di area-by-name)
QUERY_PROVINCE = f"""
[out:json][timeout:300];
is_in({ROMA_LAT},{ROMA_LNG})->.containers;
area.containers["admin_level"="6"]->.prov;
(
  relation["boundary"="administrative"]["admin_level"="8"](area.prov);
);
out geom;
"""

def query_radius(km: float) -> str:
    radius_m = int(km * 1000)
    return f"""
[out:json][timeout:300];
(
  relation["boundary"="administrative"]["admin_level"="8"]
    (around:{radius_m},{ROMA_LAT},{ROMA_LNG});
);
out geom;
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def fetch_overpass(query: str) -> dict:
    """Interroga Overpass provando i mirror in sequenza; restituisce il JSON."""
    last_err = None
    for url in OVERPASS_URLS:
        try:
            resp = requests.post(url, data={"data": query},
                                 headers=HEADERS, timeout=400)
            resp.raise_for_status()
            ctype = resp.headers.get("Content-Type", "")
            if "json" not in ctype and not resp.text.lstrip().startswith("{"):
                raise ValueError(
                    f"Risposta non-JSON da {url}:\n{resp.text[:500]}")
            osm = resp.json()
            # Overpass include un campo "remark" quando la query è parziale
            if "remark" in osm:
                print(f"  Avviso Overpass: {osm['remark']}", file=sys.stderr)
            print(f"  OK via {url} ({len(osm.get('elements', []))} elementi)",
                  file=sys.stderr)
            return osm
        except Exception as e:
            last_err = e
            print(f"  Fallito {url}: {e}", file=sys.stderr)
    raise SystemExit(f"Tutti i mirror Overpass hanno fallito. Ultimo errore: {last_err}")


def osm_to_features(osm: dict, escludi_ids: set[int] | None = None) -> list:
    """Converte il risultato Overpass in lista di GeoJSON features pulite."""
    gj = osm2geojson.json2geojson(osm)
    feats = []
    for f in gj.get("features", []):
        osm_id = f.get("properties", {}).get("id")
        if escludi_ids and osm_id in escludi_ids:
            continue
        tags = f.get("properties", {}).get("tags", {}) or {}
        geom_type = f.get("geometry", {}).get("type", "")
        if geom_type not in ("Polygon", "MultiPolygon"):
            continue  # scarta nodi/vie spuri
        f["properties"] = {
            "name":          tags.get("name", ""),
            "name_it":       tags.get("name:it", ""),
            "admin_level":   tags.get("admin_level", ""),
            "istat":         tags.get("ref:ISTAT", tags.get("istat", "")),
            "popolazione":   tags.get("population", ""),
            "provincia":     tags.get("is_in:province", tags.get("addr:province", "")),
            "regione":       tags.get("is_in:region", ""),
            "wikidata":      tags.get("wikidata", ""),
            "wikipedia":     tags.get("wikipedia", ""),
            "osm_id":        osm_id,
        }
        feats.append(f)
    return feats


def salva_geojson(feats: list, out_path: str) -> None:
    fc = {
        "type": "FeatureCollection",
        "name": "comuni_intorno_roma",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
        },
        "features": feats,
    }
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(fc, fh, ensure_ascii=False)
    print(f"\nSalvati {len(feats)} comuni in '{out_path}'", file=sys.stderr)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Scarica i comuni intorno a Roma da OpenStreetMap.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument(
        "--mode", choices=["neighbors", "province", "radius"],
        default="neighbors",
        help="Modalità di selezione (default: neighbors)",
    )
    p.add_argument(
        "--radius-km", type=float, default=30.0, metavar="KM",
        help="Raggio in km usato con --mode radius (default: 30)",
    )
    p.add_argument(
        "output", nargs="?", default=None,
        help="Percorso del file GeoJSON di output (auto se omesso)",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()

    # Scegli query e percorso di output di default
    if args.mode == "neighbors":
        query = QUERY_NEIGHBORS
        default_out = "comuni_intorno_roma.geojson"
        print("Modalità: comuni confinanti con Roma", file=sys.stderr)
    elif args.mode == "province":
        query = QUERY_PROVINCE
        default_out = "comuni_provincia_roma.geojson"
        print("Modalità: tutti i comuni della Città Metropolitana di Roma",
              file=sys.stderr)
    else:  # radius
        query = query_radius(args.radius_km)
        default_out = f"comuni_raggio{int(args.radius_km)}km_roma.geojson"
        print(f"Modalità: comuni entro {args.radius_km} km da Roma",
              file=sys.stderr)

    out_path = args.output or default_out

    print("Interrogo Overpass...", file=sys.stderr)
    osm = fetch_overpass(query)

    print("Converto in GeoJSON...", file=sys.stderr)
    # Escludi sempre il Comune di Roma (relation 41485)
    feats = osm_to_features(osm, escludi_ids={ROMA_RELATION_ID})

    # Ordina per nome
    feats.sort(key=lambda f: f["properties"].get("name", "").lower())

    salva_geojson(feats, out_path)

    # Riepilogo a schermo
    print(f"\n{'─'*50}", file=sys.stderr)
    print(f"{'Comune':<35} {'ISTAT':<10} {'Pop.'}", file=sys.stderr)
    print(f"{'─'*50}", file=sys.stderr)
    for f in feats:
        p = f["properties"]
        print(
            f"{p['name']:<35} {p['istat']:<10} {p['popolazione']}",
            file=sys.stderr,
        )
    print(f"{'─'*50}", file=sys.stderr)
    print(f"Totale: {len(feats)} comuni", file=sys.stderr)


if __name__ == "__main__":
    main()
