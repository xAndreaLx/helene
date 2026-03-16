import os
import requests
import re
import time


# CONFIGURATION
# Dossier où seront enregistrées les images
IMG_DIR = "src/assets/flore/theorie"
# Dossier où se trouvent tes fichiers .md
MD_DIR = "src/content/flore/theorie" 

# Mapping URL -> Nom de fichier final
mapping = {
    "ensiforme": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Leaf_morphology_ensiforme.PNG/120px-Leaf_morphology_ensiforme.PNG",
    "trulliforme": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Leaf_morphology_trullate.png/120px-Leaf_morphology_trullate.png",
    "aciculaire": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Leaf_morphology_acicular.png/120px-Leaf_morphology_acicular.png",
    "subulee": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Leaf_morphology_subulate.png/120px-Leaf_morphology_subulate.png",
    "lineaire": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Leaf_morphology_linear.png/120px-Leaf_morphology_linear.png",
    "oblongue": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Leaf_morphology_oblong.png/120px-Leaf_morphology_oblong.png",
    "lanceolee": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Leaf_morphology_lanceolate.png/120px-Leaf_morphology_lanceolate.png",
    "oblanceolee": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Leaf_morphology_oblanceolate.png/120px-Leaf_morphology_oblanceolate.png",
    "falquee": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Leaf_morphology_falcate.png/120px-Leaf_morphology_falcate.png",
    "aristee": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Leaf_morphology_aristate.png/120px-Leaf_morphology_aristate.png",
    "elliptique": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Leaf_morphology_elliptic.png/120px-Leaf_morphology_elliptic.png",
    "orbiculaire": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Leaf_morphology_orbicular.png/120px-Leaf_morphology_orbicular.png",
    "ovale": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Leaf_morphology_ovate.png/120px-Leaf_morphology_ovate.png",
    "obovale": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Leaf_morphology_obovate.png/120px-Leaf_morphology_obovate.png",
    "spatulee": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Leaf_morphology_spatulate.png/120px-Leaf_morphology_spatulate.png",
    "cunee": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Leaf_morphology_cuneate.png/120px-Leaf_morphology_cuneate.png",
    "sagittee": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Leaf_morphology_spear-shaped.png/120px-Leaf_morphology_spear-shaped.png",
    "hastee": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Leaf_morphology_hastate.png/120px-Leaf_morphology_hastate.png",
    "peltee": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Leaf_morphology_peltate.png/120px-Leaf_morphology_peltate.png",
    "acuminee": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Leaf_morphology_acuminate.png/120px-Leaf_morphology_acuminate.png",
    "obtus": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Leaf_morphology_obtuse.png/120px-Leaf_morphology_obtuse.png",
    "tronquee": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Leaf_morphology_truncate.png/120px-Leaf_morphology_truncate.png",
    "reniforme": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Leaf_morphology_reniform.png/120px-Leaf_morphology_reniform.png",
    "deltoide": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Leaf_morphology_deltoid.png/120px-Leaf_morphology_deltoid.png",
    "flabellee": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Leaf_morphology_flabelate.png/120px-Leaf_morphology_flabelate.png",
    "cordee": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Leaf_morphology_cordate.png/120px-Leaf_morphology_cordate.png",
    "obcordee": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Leaf_morphology_obcordate.png/120px-Leaf_morphology_obcordate.png",
    "rhomboidale": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Leaf_morphology_rhomboid.png/120px-Leaf_morphology_rhomboid.png",
    "lobee": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Leaf_morphology_lobed.png/120px-Leaf_morphology_lobed.png",
    "pedalee": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Leaf_morphology_pedate.png/120px-Leaf_morphology_pedate.png",
    "multifide": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Leaf_morphology_multifide.svg/120px-Leaf_morphology_multifide.svg.png",
    "perfoliee": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Leaf_morphology_perfoliate.png/120px-Leaf_morphology_perfoliate.png",
    "palmee": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Leaf_morphology_palmate.png/120px-Leaf_morphology_palmate.png",
    "palmatilobee": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Palmatilob%C3%A9.svg/120px-Palmatilob%C3%A9.svg.png",
    "palmatifide": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Palmatifide.svg/120px-Palmatifide.svg.png",
    "palmatipartite": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Palmatipartite.svg/120px-Palmatipartite.svg.png",
    "palmatisequee": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Palmatis%C3%A9qu%C3%A9e.svg/120px-Palmatis%C3%A9qu%C3%A9e.svg.png",
    "pennatilobee": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Pennatilob%C3%A9.svg/120px-Pennatilob%C3%A9.svg.png",
    "pennatifide": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Pennatifide.svg/120px-Pennatifide.svg.png",
    "pennatipartite": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Pennatipartite2.svg/120px-Pennatipartite2.svg.png",
    "pennatisequee": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Pennatis%C3%A9qu%C3%A9e.svg/120px-Pennatis%C3%A9qu%C3%A9e.svg.png"
}

os.makedirs(IMG_DIR, exist_ok=True)

# HEADERS RENFORCÉS POUR ÉVITER LE 403
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Referer': 'https://commons.wikimedia.org/'
}

for name, url in mapping.items():
    img_filename = f"feuille_forme_{name}.png"
    img_filepath = os.path.join(IMG_DIR, img_filename)
    print(os.path.exists(img_filepath)  , img_filepath)
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
    md_path = os.path.join(MD_DIR, f"feuille_forme_{name}.md")
    if os.path.exists(md_path):
        with open(md_path, 'r', encoding='utf-8') as f:
            content = f.read()
        new_content = re.sub(r'image:\s*".*?"', f'image: "../../../assets/flore/theorie/{img_filename}"', content)
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

print("\nFini.")
