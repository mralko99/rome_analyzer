#!/usr/bin/env python3
"""
scarica_municipi_roma.py
------------------------
Scarica i confini dei 15 Municipi di Roma Capitale (riforma 2013) da
OpenStreetMap via Overpass API e li salva come GeoJSON (EPSG:4326).

Da eseguire su una rete con accesso a overpass-api.de (NON funziona in
ambienti sandbox isolati).

Dipendenze:
    pip install requests osm2geojson

Uso:
    python3 scarica_municipi_roma.py            # -> municipi_roma.geojson
    python3 scarica_municipi_roma.py out.geojson

Note tecniche
-------------
- Selezione robusta per NOME ("Municipio Roma I" ... "Municipio Roma XV")
  all'interno dell'area del comune di Roma (relation 41485 -> area 3600041485).
  Questo evita l'ambiguita' storica sull'admin_level dei municipi (9 vs 10).
- 'out geom;' restituisce la geometria inline; osm2geojson assembla
  correttamente Polygon/MultiPolygon (gestione di outer/inner ring).
- Sorgente: OpenStreetMap, licenza ODbL. Citare "© OpenStreetMap contributors".
"""

import sys
import re
import json
import requests
import osm2geojson

# Endpoint Overpass (con mirror di fallback)
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

# Overpass (dietro CDN) rifiuta lo User-Agent di default di requests -> 406.
# Serve uno User-Agent esplicito e descrittivo.
HEADERS = {
    "User-Agent": "municipi-roma-script/1.0 (uso GIS; contatto: tuo@indirizzo)",
    "Accept": "application/json",
}

# Area del comune di Roma: relation 41485 -> area id = 3600000000 + 41485
QUERY = r"""
[out:json][timeout:300];
area(3600041485)->.roma;
(
  relation["boundary"="administrative"]["name"~"^Municipio Roma "](area.roma);
);
out geom;
"""

# Mappa numero romano -> arabo, per arricchire le properties
ROMAN = {
    "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8,
    "IX": 9, "X": 10, "XI": 11, "XII": 12, "XIII": 13, "XIV": 14, "XV": 15,
}


def numero_da_nome(nome: str):
    m = re.search(r"Municipio Roma\s+([IVX]+)\b", nome or "")
    if not m:
        return None, None
    rom = m.group(1)
    return rom, ROMAN.get(rom)


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "municipi_roma.geojson"

    print("Interrogo Overpass...", file=sys.stderr)
    osm = None
    last_err = None
    for url in OVERPASS_URLS:
        try:
            resp = requests.post(url, data={"data": QUERY},
                                 headers=HEADERS, timeout=400)
            resp.raise_for_status()
            # Overpass a volte risponde 200 con un messaggio di errore testuale
            ctype = resp.headers.get("Content-Type", "")
            if "json" not in ctype and not resp.text.lstrip().startswith("{"):
                raise ValueError(
                    f"Risposta non-JSON da {url}:\n{resp.text[:500]}")
            osm = resp.json()
            print(f"  OK via {url}", file=sys.stderr)
            break
        except Exception as e:
            last_err = e
            print(f"  Fallito {url}: {e}", file=sys.stderr)
    if osm is None:
        raise SystemExit(f"Tutti i mirror Overpass hanno fallito. "
                         f"Ultimo errore: {last_err}")

    print("Converto in GeoJSON...", file=sys.stderr)
    gj = osm2geojson.json2geojson(osm)

    # Pulizia/arricchimento properties: tengo solo cio' che serve
    feats = []
    for f in gj.get("features", []):
        tags = f.get("properties", {}).get("tags", {}) or {}
        nome = tags.get("name", "")
        rom, ar = numero_da_nome(nome)
        f["properties"] = {
            "name": nome,
            "numero_romano": rom,
            "numero": ar,
            "ref": tags.get("ref"),
            "admin_level": tags.get("admin_level"),
            "osm_id": f.get("properties", {}).get("id"),
            "wikidata": tags.get("wikidata"),
        }
        # tengo solo poligoni (scarto eventuali geometrie spurie)
        if f.get("geometry", {}).get("type") in ("Polygon", "MultiPolygon"):
            feats.append(f)

    # ordino per numero municipio
    feats.sort(key=lambda x: (x["properties"]["numero"] is None,
                              x["properties"]["numero"] or 0))

    fc = {
        "type": "FeatureCollection",
        "name": "municipi_roma",
        "crs": {"type": "name",
                "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": feats,
    }

    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(fc, fh, ensure_ascii=False)

    print(f"OK: {len(feats)} municipi scritti in {out_path}", file=sys.stderr)
    if len(feats) != 15:
        print("ATTENZIONE: attesi 15 municipi, controllare il risultato.",
              file=sys.stderr)


if __name__ == "__main__":
    main()
