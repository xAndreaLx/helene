import os
import requests
import re
import time

# CONFIGURATION
IMG_DIR = "src/assets/flore/theorie"
MD_DIR = "src/content/flore/theorie" 

mapping = {
    "entier": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Leaf_morphology_entire.png/250px-Leaf_morphology_entire.png",
    "cilie": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Leaf_morphology_ciliate.png/250px-Leaf_morphology_ciliate.png",
    "crenele": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Leaf_morphology_crenate.png/250px-Leaf_morphology_crenate.png",
    "dente": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Leaf_morphology_dentate.png/250px-Leaf_morphology_dentate.png",
    "doublement_dente": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Leaf_morphology_doubly_serrate.png/250px-Leaf_morphology_doubly_serrate.png",
    "denticule": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Leaf_morphology_denticulate.png/250px-Leaf_morphology_denticulate.png",
    "serrete": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Leaf_morphology_serrate.png/250px-Leaf_morphology_serrate.png",
    "serrule": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Leaf_morphology_serrulate.png/250px-Leaf_morphology_serrulate.png",
    "sinue": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Leaf_morphology_sinuate.png/250px-Leaf_morphology_sinuate.png",
    "lobe": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Leaf_morphology_lobate.png/250px-Leaf_morphology_lobate.png",
    "ondule": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Leaf_morphology_undulate.png/250px-Leaf_morphology_undulate.png",
    "epineux": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Leaf_morphology_spiny.png/250px-Leaf_morphology_spiny.png"
}

os.makedirs(IMG_DIR, exist_ok=True)

# HEADERS RENFORCÉS POUR ÉVITER LE 403
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Referer': 'https://commons.wikimedia.org/'
}

for name, url in mapping.items():
    img_filename = f"feuille_bord_{name}.png"
    img_filepath = os.path.join(IMG_DIR, img_filename)
    
    if not os.path.exists(img_filepath):
        print(f"Tentative : {img_filename}...")
        try:
            # On utilise une session pour garder les cookies si besoin
            session = requests.Session()
            response = session.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                with open(img_filepath, 'wb') as f:
                    f.write(response.content)
                print(f"  Succès !")
                time.sleep(10) # On augmente un peu la pause à 10s
            else:
                print(f"  Échec : Erreur {response.status_code}")
                time.sleep(20) # On augmente un peu la pause à 3s
                if response.status_code == 403:
                    print("  -> Wikimedia bloque encore. Arrêt du script pour ne pas griller l'IP.")
                    break
        except Exception as e:
            print(f"  Erreur : {e}")
    
    # Mise à jour MD (toujours effectuée si le fichier existe)
    md_path = os.path.join(MD_DIR, f"feuille_bord_{name}.md")
    if os.path.exists(md_path):
        with open(md_path, 'r', encoding='utf-8') as f:
            content = f.read()
        new_content = re.sub(r'image:\s*".*?"', f'image: "../../../assets/flore/theorie/{img_filename}"', content)
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

print("\nFini.")
