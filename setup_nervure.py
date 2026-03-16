import os
import requests
import re
import time

# CONFIGURATION
IMG_DIR = "src/assets/flore/theorie"
MD_DIR = "src/content/flore/theorie" 

# Mapping : Suffixe du fichier -> URL Wikipedia
mapping = {
    "pennee": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Leaf_morphology_pinnate.png/250px-Leaf_morphology_pinnate.png",
    "arquee": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Leaf_morphology_arcuate.png/250px-Leaf_morphology_arcuate.png",
    "transverse": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Leaf_morphology_cross_venulate.png/250px-Leaf_morphology_cross_venulate.png",
    "reticulee": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Leaf_morphology_reticulate.png/250px-Leaf_morphology_reticulate.png",
    "parallele": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Leaf_morphology_parallel.png/250px-Leaf_morphology_parallel.png",
    "dichotome": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Leaf_morphology_dichotomous.png/250px-Leaf_morphology_dichotomous.png",
    "longitudinale": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Leaf_morphology_longitudinal.png/250px-Leaf_morphology_longitudinal.png",
    "palmee": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Leaf_morphology_venation_palmate.png/250px-Leaf_morphology_venation_palmate.png",
    "rayonnante": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Leaf_morphology_rotate.png/250px-Leaf_morphology_rotate.png"
}

os.makedirs(IMG_DIR, exist_ok=True)

# HEADERS POUR ÉVITER LE 403 (Forbidden)
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Referer': 'https://commons.wikimedia.org/',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
}

session = requests.Session()

for name, url in mapping.items():
    img_filename = f"feuille_nervure_{name}.png"
    img_filepath = os.path.join(IMG_DIR, img_filename)
    
    # 1. TÉLÉCHARGEMENT AVEC SÉCURITÉ
    if not os.path.exists(img_filepath):
        print(f"Téléchargement : {img_filename}...")
        try:
            response = session.get(url, headers=headers, timeout=15)
            
            if response.status_code == 200:
                with open(img_filepath, 'wb') as f:
                    f.write(response.content)
                print(f"  Succès !")
                time.sleep(10) # Pause de 10 secondes pour rester discret
            elif response.status_code == 403:
                print(f"  ERREUR 403 : Accès refusé par Wikimedia pour {name}.")
                print("  -> Essayez d'attendre quelques minutes ou changez de connexion.")
                break # On arrête pour ne pas insister
            else:
                print(f"  Erreur {response.status_code} sur {name}")
        except Exception as e:
            print(f"  Erreur réseau : {e}")
    else:
        print(f"Saut : {img_filename} existe déjà.")

    # 2. MISE À JOUR DU FICHIER MARKDOWN
    md_filename = f"feuille_nervure_{name}.md"
    md_path = os.path.join(MD_DIR, md_filename)
    
    if os.path.exists(md_path):
        with open(md_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remplacement du lien image par le chemin local
        new_content = re.sub(
            r'image:\s*".*?"', 
            f'image: "../../../assets/flore/theorie/{img_filename}"', 
            content
        )
        
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  Fichier MD mis à jour.")
    else:
        print(f"  Fichier {md_filename} non trouvé.")

print("\nTerminé !")
