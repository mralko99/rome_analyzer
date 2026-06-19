import json
import os
import glob

def analizza_geojson_roma():
    print("=========================================================")
    print("SISTEMA DI ANALISI GEOSPAZIALE - LIVELLI AMMINISTRATIVI ROMA")
    print("=========================================================\n")
    
    # Cerca tutti i file geojson generati
    files = sorted(glob.glob("roma_level_*.geojson"))
    
    if not files:
        print("Nessun file GeoJSON trovato nella cartella corrente.")
        return

    for file_path in files:
        filename = os.path.basename(file_path)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            features = data.get("features", [])
            num_features = len(features)
            
            print(f"📁 File: {filename}")
            print(f"   🔹 Tipo: {data.get('type')}")
            print(f"   🔹 Elementi trovati (Features): {num_features}")
            
            # Estrai dettagli sulle properties di ciascun elemento
            for i, feature in enumerate(features, start=1):
                props = feature.get("properties", {})
                name = props.get("name", "N/A")
                lvl = props.get("admin_level", "Non specificato")
                print(f"      [{i}] Nome: {name} | Admin Level: {lvl}")
                
                # Info addizionali se presenti
                if "population" in props:
                    print(f"          Popolazione: {props['population']:,} abitanti")
                if "belongs_to" in props:
                    print(f"          Appartiene a: {props['belongs_to']}")
            print("-" * 50)
            
        except Exception as e:
            print(f"❌ Errore durante la lettura di {filename}: {e}")

if __name__ == "__main__":
    analizza_geojson_roma()
